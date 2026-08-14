package com.overseas.portal.service;

import com.overseas.portal.domain.WeeklyWorshipHistory;
import com.overseas.portal.domain.WorshipRegionMapping;
import com.overseas.portal.domain.WorshipTemplate;
import com.overseas.portal.repository.WeeklyWorshipHistoryRepository;
import com.overseas.portal.repository.WorshipRegionMappingRepository;
import com.overseas.portal.repository.WorshipTemplateRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.poifs.crypt.Decryptor;
import org.apache.poi.poifs.crypt.EncryptionInfo;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeeklyWorshipService {

    @org.springframework.beans.factory.annotation.Value("${app.upload-dir}")
    private String uploadDir;

    /** 지역별 엑셀·양식 템플릿 공용 암호화 비밀번호 (merge_attendance.py의 PASSWORD 상수와 동일) */
    private static final String PASSWORD = "gotjsqn";

    private final WeeklyWorshipHistoryRepository weeklyWorshipHistoryRepository;
    private final WorshipRegionMappingRepository worshipRegionMappingRepository;
    private final WorshipTemplateRepository worshipTemplateRepository;

    private Path getModelingDirPath() {
        return Paths.get(uploadDir, "worship_modeling").toAbsolutePath().normalize();
    }

    @Data
    @Builder
    public static class WorshipJobResult {
        private String jobId;
        private Long historyId;
        private String logs;
        private boolean success;
        private String sundayFileName;
        private String wednesdayFileName;
        private String errorMessage;
    }

    /**
     * 주간예배출결 취합 메인 로직 실행 (임시 폴더는 취합 완료 후 즉시 삭제)
     */
    public WorshipJobResult executeMerge(MultipartFile file) throws Exception {
        String jobId = UUID.randomUUID().toString();
        Path tempJobsDir = getModelingDirPath().resolve("temp_jobs").toAbsolutePath().normalize();
        Files.createDirectories(tempJobsDir);

        Path jobDir = tempJobsDir.resolve("worship_" + jobId).toAbsolutePath().normalize();
        Files.createDirectories(jobDir);

        log.info("Starting Weekly Worship Merge Job: {}, Dir: {}", jobId, jobDir);

        StringBuilder logBuilder = new StringBuilder();
        logBuilder.append("[시스템] 임시 작업 폴더 생성 완료: ").append(jobDir.getFileName()).append("\n");

        Path finalDataDir = null;
        try {
            // 1. ZIP 압축 해제
            logBuilder.append("[시스템] 업로드된 ZIP 파일 압축 해제 중...\n");
            unzip(file, jobDir);

            // 2. 지역별 파일이 들어있는 폴더 감지
            Path dataDir = findDataDir(jobDir);
            if (dataDir == null) {
                throw new FileNotFoundException("ZIP 파일 내부에서 번호 접두사(예: 01.)로 시작하는 엑셀 파일을 찾을 수 없습니다.");
            }

            logBuilder.append("[시스템] 데이터 감지 폴더: ").append(jobDir.relativize(dataDir)).append("\n");

            // 3. 디렉토리 구조 보정
            finalDataDir = dataDir;
            if (dataDir.equals(jobDir)) {
                String origName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
                int dotIdx = origName.lastIndexOf('.');
                String folderName = dotIdx > 0 ? origName.substring(0, dotIdx) : "주간예배출결";
                folderName = folderName.replaceAll("[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_\\-]", "_");
                if (folderName.isEmpty()) folderName = "주간예배출결";

                Path subDir = jobDir.resolve(folderName);
                Files.createDirectories(subDir);

                try (DirectoryStream<Path> stream = Files.newDirectoryStream(jobDir)) {
                    for (Path entry : stream) {
                        String name = entry.getFileName().toString();
                        if (Files.isRegularFile(entry) && name.endsWith(".xlsx") && name.matches("^\\d+\\..*")) {
                            Files.move(entry, subDir.resolve(entry.getFileName()), StandardCopyOption.REPLACE_EXISTING);
                        }
                    }
                }
                finalDataDir = subDir;
                logBuilder.append("[시스템] 루트 압축 해제 대응 - 파일을 서브폴더로 이동함: ").append(folderName).append("\n");
            } else if (!dataDir.getParent().equals(jobDir)) {
                Path newDir = jobDir.resolve(dataDir.getFileName());
                Files.move(dataDir, newDir, StandardCopyOption.REPLACE_EXISTING);
                finalDataDir = newDir;
                logBuilder.append("[시스템] 중첩 폴더 보정 - 상위 폴더로 이동함: ").append(newDir.getFileName()).append("\n");
            }

            // 4. 스크립트 및 템플릿 복사 (Classpath 리소스로부터 추출 복제하여 Docker 및 JAR 독립실행 보장)
            Path scriptDest = jobDir.resolve("merge_attendance.py");
            Path templateDest = jobDir.resolve("양식.xlsx");

            try (InputStream scriptStream = getClass().getResourceAsStream("/worship_modeling/merge_attendance.py")) {
                if (scriptStream == null) {
                    throw new FileNotFoundException("Classpath 리소스에서 'merge_attendance.py' 파일을 찾을 수 없습니다.");
                }
                Files.copy(scriptStream, scriptDest, StandardCopyOption.REPLACE_EXISTING);
            }

            Optional<WorshipTemplate> activeTemplate = worshipTemplateRepository.findByIsActiveTrue();
            if (activeTemplate.isPresent()) {
                Path customTemplatePath = getModelingDirPath().resolve(activeTemplate.get().getStoredPath()).toAbsolutePath().normalize();
                if (Files.exists(customTemplatePath)) {
                    Files.copy(customTemplatePath, templateDest, StandardCopyOption.REPLACE_EXISTING);
                    logBuilder.append("[시스템] 관리자 업로드 활성 템플릿 사용: ").append(activeTemplate.get().getOriginalFilename()).append("\n");
                } else {
                    log.warn("Active template file missing on disk, falling back to bundled default: {}", customTemplatePath);
                    copyDefaultTemplate(templateDest);
                    logBuilder.append("[경고] 등록된 활성 템플릿 파일을 찾을 수 없어 기본(classpath) 템플릿으로 대체합니다.\n");
                }
            } else {
                copyDefaultTemplate(templateDest);
                logBuilder.append("[시스템] 기본(classpath) 템플릿 사용\n");
            }

            logBuilder.append("[시스템] 취합 템플릿 및 파이썬 연산 스크립트 배치 완료\n");

            // 4-1. 업로드된 지역 파일 번호가 등록된 매핑과 일치하는지 검증(경고만 기록, 취합은 계속 진행)
            appendRegionMappingWarnings(logBuilder, finalDataDir);

            // 5. 파이썬 스크립트 실행
            logBuilder.append("[시스템] Excel 매니페스트 통합 스크립트 구동 시작...\n\n");
            ProcessBuilder pb = new ProcessBuilder("python", "merge_attendance.py");
            pb.directory(jobDir.toFile());
            pb.redirectErrorStream(true);
            Process process = pb.start();

            Charset charset = Charset.forName("x-windows-949");
            try {
                String systemEncoding = System.getProperty("sun.jnu.encoding");
                if (systemEncoding != null && Charset.isSupported(systemEncoding)) {
                    charset = Charset.forName(systemEncoding);
                }
            } catch (Exception e) {
                // fallback
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), charset))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logBuilder.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            int exitCode = finished ? process.exitValue() : -1;

            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("파이썬 취합 연산이 5분 이상 초과되어 강제 종료되었습니다.");
            }

            if (exitCode != 0) {
                throw new RuntimeException("파이썬 취합 프로그램 실행 중 오류가 발생했습니다. (Exit Code: " + exitCode + ")");
            }

            logBuilder.append("\n[시스템] 취합 프로세스 정상 종료.\n");

            // 6. 결과 파일 목록 확인
            Path sundayFile = null;
            Path wednesdayFile = null;

            try (DirectoryStream<Path> stream = Files.newDirectoryStream(finalDataDir)) {
                for (Path entry : stream) {
                    String name = entry.getFileName().toString();
                    if (name.startsWith("해외-예배출결현황") && name.endsWith(".xlsx")) {
                        if (name.contains("_주일")) {
                            sundayFile = entry;
                        } else if (name.contains("_수요")) {
                            wednesdayFile = entry;
                        }
                    }
                }
            }

            if (sundayFile == null || wednesdayFile == null) {
                throw new FileNotFoundException("취합 결과 엑셀 파일이 정상적으로 생성되지 않았습니다. 로그를 확인해 주세요.");
            }

            logBuilder.append("[시스템] 주일 결과 감지: ").append(sundayFile.getFileName()).append("\n");
            logBuilder.append("[시스템] 수요 결과 감지: ").append(wednesdayFile.getFileName()).append("\n");

            // 7. 다운로드용 ZIP 파일 패키징
            Path zipFile = jobDir.resolve("result.zip");
            logBuilder.append("[시스템] 다운로드용 압축 패키지(result.zip) 생성 중...\n");
            zipFiles(List.of(sundayFile, wednesdayFile), zipFile);
            logBuilder.append("[시스템] 압축 패키지 생성 완료.\n");

            // 8. DB 이력 테이블 저장 & 파일 보관 이동
            logBuilder.append("[시스템] 취합 이력 데이터베이스 및 파일 보관함 등록 중...\n");
            String weekInfo = extractWeekInfo(finalDataDir.getFileName().toString());

            WeeklyWorshipHistory history = WeeklyWorshipHistory.builder()
                    .fileName(file.getOriginalFilename())
                    .weekInfo(weekInfo)
                    .status("SUCCESS")
                    .logs(logBuilder.toString())
                    .uploadedBy("admin")
                    .build();
            history = weeklyWorshipHistoryRepository.save(history);
            Long historyId = history.getHistoryId();

            Path historyFilesDir = getModelingDirPath().resolve("history_files");
            Files.createDirectories(historyFilesDir);

            // 파일 이동 및 복제
            Path historyOriginalFile = historyFilesDir.resolve("original_" + historyId + ".zip");
            Path historySundayFile = historyFilesDir.resolve("sunday_" + historyId + ".xlsx");
            Path historyWednesdayFile = historyFilesDir.resolve("wednesday_" + historyId + ".xlsx");
            Path historyZipFile = historyFilesDir.resolve("merged_" + historyId + ".zip");

            try (InputStream is = file.getInputStream()) {
                Files.copy(is, historyOriginalFile, StandardCopyOption.REPLACE_EXISTING);
            }
            Files.copy(sundayFile, historySundayFile, StandardCopyOption.REPLACE_EXISTING);
            Files.copy(wednesdayFile, historyWednesdayFile, StandardCopyOption.REPLACE_EXISTING);
            Files.copy(zipFile, historyZipFile, StandardCopyOption.REPLACE_EXISTING);

            // 파일 상대 경로 등록
            history.setOriginalZipPath("history_files/original_" + historyId + ".zip");
            history.setMergedSundayPath("history_files/sunday_" + historyId + ".xlsx");
            history.setMergedWednesdayPath("history_files/wednesday_" + historyId + ".xlsx");
            history.setMergedZipPath("history_files/merged_" + historyId + ".zip");
            weeklyWorshipHistoryRepository.save(history);

            logBuilder.append("[시스템] 이력 등록 완료. (이력 번호: ").append(historyId).append(")\n");

            // 9. 임시 작업 폴더 즉시 삭제 (temp_jobs 파일 찌꺼기 방지)
            try {
                deleteDirectory(jobDir);
                logBuilder.append("[시스템] 임시 작업 폴더 즉시 삭제 완료.\n");
            } catch (Exception ex) {
                log.warn("Failed to delete temporary job directory: " + jobDir, ex);
            }

            return WorshipJobResult.builder()
                    .jobId(jobId)
                    .historyId(historyId)
                    .logs(logBuilder.toString())
                    .success(true)
                    .sundayFileName(sundayFile.getFileName().toString())
                    .wednesdayFileName(wednesdayFile.getFileName().toString())
                    .build();

        } catch (Exception e) {
            log.error("Failed to execute weekly worship merge job " + jobId, e);
            logBuilder.append("\n[에러] ").append(e.getMessage()).append("\n");

            // 실패 이력 등록
            try {
                String weekInfo = finalDataDir != null ? extractWeekInfo(finalDataDir.getFileName().toString()) : "알수없음";
                WeeklyWorshipHistory history = WeeklyWorshipHistory.builder()
                        .fileName(file.getOriginalFilename())
                        .weekInfo(weekInfo)
                        .status("FAILED")
                        .logs(logBuilder.toString())
                        .uploadedBy("admin")
                        .build();
                weeklyWorshipHistoryRepository.save(history);
            } catch (Exception ex) {
                log.error("Failed to save failed job history", ex);
            }

            // 실패 시 생성했던 임시 폴더 삭제
            try {
                deleteDirectory(jobDir);
            } catch (Exception ex) {
                // ignore
            }

            return WorshipJobResult.builder()
                    .jobId(jobId)
                    .logs(logBuilder.toString())
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * 주간예배취합 과거 이력 전체 조회
     */
    public List<WeeklyWorshipHistory> getHistoryList() {
        return weeklyWorshipHistoryRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * 기본(classpath 번들) 템플릿을 지정 경로로 복사
     */
    private void copyDefaultTemplate(Path templateDest) throws IOException {
        try (InputStream templateStream = getClass().getResourceAsStream("/worship_modeling/양식.xlsx")) {
            if (templateStream == null) {
                throw new FileNotFoundException("Classpath 리소스에서 '양식.xlsx' 파일을 찾을 수 없습니다.");
            }
            Files.copy(templateStream, templateDest, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /**
     * 업로드된 지역 파일 번호 집합과 등록된 활성 지역 매핑을 비교해 누락/미등록 번호를 로그에 경고로 남긴다.
     * 매핑이 아직 하나도 등록되지 않았다면(초기 상태) 검증을 건너뛴다.
     */
    private void appendRegionMappingWarnings(StringBuilder logBuilder, Path dataDir) {
        try {
            List<WorshipRegionMapping> activeMappings = worshipRegionMappingRepository.findAllByIsActiveTrueOrderByRegionNoAsc();
            if (activeMappings.isEmpty()) return;

            Set<Integer> expected = new TreeSet<>();
            for (WorshipRegionMapping m : activeMappings) expected.add(m.getRegionNo());

            Set<Integer> uploaded = new TreeSet<>();
            java.util.regex.Pattern prefixPattern = java.util.regex.Pattern.compile("^(\\d+)\\.");
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(dataDir)) {
                for (Path entry : stream) {
                    String name = entry.getFileName().toString();
                    java.util.regex.Matcher m = prefixPattern.matcher(name);
                    if (Files.isRegularFile(entry) && name.endsWith(".xlsx") && m.find()) {
                        uploaded.add(Integer.parseInt(m.group(1)));
                    }
                }
            }

            Set<Integer> missing = new TreeSet<>(expected);
            missing.removeAll(uploaded);
            Set<Integer> unexpected = new TreeSet<>(uploaded);
            unexpected.removeAll(expected);

            if (!missing.isEmpty()) {
                logBuilder.append("[경고] 등록된 지역 중 업로드가 누락된 번호: ").append(missing).append("\n");
            }
            if (!unexpected.isEmpty()) {
                logBuilder.append("[경고] 등록되지 않은 지역 번호가 포함되어 있습니다: ").append(unexpected)
                        .append(" (지역/양식 설정에서 등록 여부를 확인하세요)\n");
            }
        } catch (Exception e) {
            log.warn("Failed to validate region mapping against uploaded files", e);
        }
    }

    /**
     * 지역 매핑 목록 조회 (번호순)
     */
    public List<WorshipRegionMapping> listRegions() {
        return worshipRegionMappingRepository.findAllByOrderByRegionNoAsc();
    }

    /**
     * 지역 매핑 신규 등록
     */
    public WorshipRegionMapping createRegion(Integer regionNo, String displayName) {
        if (worshipRegionMappingRepository.existsByRegionNo(regionNo)) {
            throw new IllegalArgumentException("이미 등록된 지역 번호입니다: " + regionNo);
        }
        return worshipRegionMappingRepository.save(WorshipRegionMapping.builder()
                .regionNo(regionNo)
                .displayName(displayName)
                .isActive(true)
                .build());
    }

    /**
     * 지역 매핑 수정 (번호/표시명/활성여부) — null인 필드는 변경하지 않음
     */
    public WorshipRegionMapping updateRegion(Long mappingId, Integer regionNo, String displayName, Boolean isActive) {
        WorshipRegionMapping mapping = worshipRegionMappingRepository.findById(mappingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 매핑입니다: " + mappingId));

        if (regionNo != null && !regionNo.equals(mapping.getRegionNo())) {
            if (worshipRegionMappingRepository.existsByRegionNo(regionNo)) {
                throw new IllegalArgumentException("이미 사용 중인 지역 번호입니다: " + regionNo);
            }
            mapping.setRegionNo(regionNo);
        }
        if (displayName != null) mapping.setDisplayName(displayName);
        if (isActive != null) mapping.setIsActive(isActive);
        return worshipRegionMappingRepository.save(mapping);
    }

    /**
     * 지역 매핑 삭제
     */
    public void deleteRegion(Long mappingId) {
        if (!worshipRegionMappingRepository.existsById(mappingId)) {
            throw new IllegalArgumentException("존재하지 않는 매핑입니다: " + mappingId);
        }
        worshipRegionMappingRepository.deleteById(mappingId);
    }

    /**
     * 업로드된 템플릿 이력 전체 조회 (최신순)
     */
    public List<WorshipTemplate> listTemplates() {
        return worshipTemplateRepository.findAllByOrderByUploadedAtDesc();
    }

    /**
     * 지역 시트명 형식: "1. 도쿄", "8포르투갈"처럼 구분자가 일정하지 않아 선행 숫자만 필수로 보고
     * 나머지(dot·공백 제거)를 표시명으로 취급한다. merge_attendance.py의 find_target_sheet()와 동일 규칙.
     */
    private static final java.util.regex.Pattern REGION_SHEET_PATTERN = java.util.regex.Pattern.compile("^(\\d+)\\.?\\s*(.+)$");

    /**
     * 암호화된 템플릿 xlsx를 열어 지역 시트(번호로 시작하는 시트)의 번호↔표시명을 추출한다.
     * 순서를 보존하기 위해 LinkedHashMap을 사용한다.
     */
    private LinkedHashMap<Integer, String> extractRegionsFromTemplate(Path templateFile) throws Exception {
        LinkedHashMap<Integer, String> result = new LinkedHashMap<>();
        try (POIFSFileSystem poifs = new POIFSFileSystem(Files.newInputStream(templateFile))) {
            EncryptionInfo info = new EncryptionInfo(poifs);
            Decryptor decryptor = Decryptor.getInstance(info);
            if (!decryptor.verifyPassword(PASSWORD)) {
                throw new IllegalArgumentException("템플릿 파일의 암호가 올바르지 않습니다. (공유 암호로 암호화된 .xlsx여야 합니다)");
            }
            try (InputStream decrypted = decryptor.getDataStream(poifs);
                 XSSFWorkbook wb = new XSSFWorkbook(decrypted)) {
                for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                    String sheetName = wb.getSheetName(i);
                    java.util.regex.Matcher m = REGION_SHEET_PATTERN.matcher(sheetName);
                    if (m.matches()) {
                        int regionNo = Integer.parseInt(m.group(1));
                        String displayName = m.group(2).trim();
                        result.putIfAbsent(regionNo, displayName);
                    }
                }
            }
        }
        return result;
    }

    /**
     * 추출된 지역 목록을 기준으로 worship_region_mapping을 동기화한다.
     * - 새 번호: 신규 등록(활성)
     * - 기존 번호의 표시명이 바뀌었으면 갱신 + 활성화
     * - 이번 템플릿에 없는 기존 활성 지역은 비활성 처리(삭제하지 않고 이력 보존)
     */
    private void syncRegionsFromTemplate(Map<Integer, String> extracted) {
        Map<Integer, WorshipRegionMapping> existingByNo = new HashMap<>();
        for (WorshipRegionMapping m : worshipRegionMappingRepository.findAll()) {
            existingByNo.put(m.getRegionNo(), m);
        }

        for (Map.Entry<Integer, String> e : extracted.entrySet()) {
            WorshipRegionMapping mapping = existingByNo.get(e.getKey());
            if (mapping == null) {
                worshipRegionMappingRepository.save(WorshipRegionMapping.builder()
                        .regionNo(e.getKey())
                        .displayName(e.getValue())
                        .isActive(true)
                        .build());
            } else {
                boolean changed = false;
                if (!e.getValue().equals(mapping.getDisplayName())) {
                    mapping.setDisplayName(e.getValue());
                    changed = true;
                }
                if (!Boolean.TRUE.equals(mapping.getIsActive())) {
                    mapping.setIsActive(true);
                    changed = true;
                }
                if (changed) worshipRegionMappingRepository.save(mapping);
            }
        }

        for (WorshipRegionMapping mapping : existingByNo.values()) {
            if (!extracted.containsKey(mapping.getRegionNo()) && Boolean.TRUE.equals(mapping.getIsActive())) {
                mapping.setIsActive(false);
                worshipRegionMappingRepository.save(mapping);
            }
        }
    }

    /**
     * 새 템플릿(양식.xlsx) 업로드 → 시트명에서 지역 번호/표시명을 추출해 지역 매핑을 자동 동기화 → 즉시 활성화.
     * 복호화되지 않거나 지역 시트를 하나도 찾지 못하면 업로드를 거부한다.
     */
    public WorshipTemplate uploadTemplate(MultipartFile file, String uploadedBy) throws Exception {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!originalFilename.toLowerCase().endsWith(".xlsx")) {
            throw new IllegalArgumentException("템플릿은 .xlsx 파일만 업로드할 수 있습니다.");
        }

        Path templatesDir = getModelingDirPath().resolve("templates");
        Files.createDirectories(templatesDir);

        WorshipTemplate template = worshipTemplateRepository.save(WorshipTemplate.builder()
                .originalFilename(originalFilename)
                .storedPath("")
                .isActive(false)
                .uploadedBy(uploadedBy)
                .build());

        Path dest = templatesDir.resolve("template_" + template.getTemplateId() + ".xlsx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
        }

        LinkedHashMap<Integer, String> extracted;
        try {
            extracted = extractRegionsFromTemplate(dest);
        } catch (Exception e) {
            Files.deleteIfExists(dest);
            worshipTemplateRepository.deleteById(template.getTemplateId());
            throw new IllegalArgumentException("템플릿 파일을 읽을 수 없습니다: " + e.getMessage());
        }
        if (extracted.isEmpty()) {
            Files.deleteIfExists(dest);
            worshipTemplateRepository.deleteById(template.getTemplateId());
            throw new IllegalArgumentException("템플릿에서 지역 시트(숫자로 시작하는 시트)를 하나도 찾지 못했습니다.");
        }

        template.setStoredPath("templates/template_" + template.getTemplateId() + ".xlsx");
        template.setRegionCount(extracted.size());
        worshipTemplateRepository.save(template);

        syncRegionsFromTemplate(extracted);

        return activateTemplate(template.getTemplateId());
    }

    /**
     * 특정 템플릿을 활성 템플릿으로 지정 (과거 버전으로의 롤백에도 사용). 해당 템플릿 파일에서 지역 매핑을
     * 다시 추출해 동기화하므로, 활성 지역 목록은 항상 "현재 활성 템플릿의 실제 시트 구성"과 일치한다.
     */
    public WorshipTemplate activateTemplate(Long templateId) throws Exception {
        WorshipTemplate target = worshipTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 템플릿입니다: " + templateId));

        Path templateFile = getModelingDirPath().resolve(target.getStoredPath()).toAbsolutePath().normalize();
        if (Files.exists(templateFile)) {
            try {
                LinkedHashMap<Integer, String> extracted = extractRegionsFromTemplate(templateFile);
                if (!extracted.isEmpty()) syncRegionsFromTemplate(extracted);
            } catch (Exception e) {
                log.warn("Failed to re-sync region mapping while activating template {}: {}", templateId, e.getMessage());
            }
        }

        worshipTemplateRepository.findByIsActiveTrue().ifPresent(current -> {
            if (!current.getTemplateId().equals(templateId)) {
                current.setIsActive(false);
                worshipTemplateRepository.save(current);
            }
        });

        target.setIsActive(true);
        return worshipTemplateRepository.save(target);
    }

    /**
     * 보관된 이력 파일 경로 반환
     */
    public Path getHistoryFile(Long historyId, String type) throws IOException {
        WeeklyWorshipHistory history = weeklyWorshipHistoryRepository.findById(historyId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력 번호입니다: " + historyId));

        String relPath = null;
        if ("ORIGINAL".equalsIgnoreCase(type)) {
            relPath = history.getOriginalZipPath();
        } else if ("SUNDAY".equalsIgnoreCase(type)) {
            relPath = history.getMergedSundayPath();
        } else if ("WEDNESDAY".equalsIgnoreCase(type)) {
            relPath = history.getMergedWednesdayPath();
        } else if ("ALL_ZIP".equalsIgnoreCase(type)) {
            relPath = history.getMergedZipPath();
        }

        if (relPath == null || relPath.isEmpty()) {
            throw new FileNotFoundException("해당 파일은 삭제되었거나 존재하지 않습니다.");
        }

        Path filePath = getModelingDirPath().resolve(relPath).toAbsolutePath().normalize();
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException("보관 디렉토리에 물리 파일이 존재하지 않습니다: " + filePath.getFileName());
        }
        return filePath;
    }

    /**
     * 특정 이력의 물리 파일들을 서버 디렉토리에서 삭제하고 DB 경로 정보를 null로 비웁니다. (로그 이력은 유지)
     */
    public void deleteHistoryFiles(Long historyId) {
        WeeklyWorshipHistory history = weeklyWorshipHistoryRepository.findById(historyId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력 번호입니다: " + historyId));

        // 물리 파일 삭제
        deletePhysicalFile(history.getOriginalZipPath());
        deletePhysicalFile(history.getMergedSundayPath());
        deletePhysicalFile(history.getMergedWednesdayPath());
        deletePhysicalFile(history.getMergedZipPath());

        // DB 경로 비우기
        history.setOriginalZipPath(null);
        history.setMergedSundayPath(null);
        history.setMergedWednesdayPath(null);
        history.setMergedZipPath(null);
        weeklyWorshipHistoryRepository.save(history);
        
        log.info("Physically deleted files for history ID: {}", historyId);
    }

    private void deletePhysicalFile(String relPath) {
        if (relPath != null && !relPath.isEmpty()) {
            try {
                Path filePath = getModelingDirPath().resolve(relPath).toAbsolutePath().normalize();
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                }
            } catch (Exception e) {
                log.error("Failed to delete physical file: " + relPath, e);
            }
        }
    }

    /**
     * 폴더명에서 주차 정규식 정보 추출
     */
    private String extractWeekInfo(String folderName) {
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+월\\s*\\d+주)");
        java.util.regex.Matcher matcher = pattern.matcher(folderName);
        if (matcher.find()) {
            return matcher.group(1).replace(" ", "");
        }
        return folderName;
    }

    /**
     * ZIP 파일 압축 해제 (UTF-8 인코딩 시도 후 실패 시 x-windows-949 한글 인코딩 폴백 지원)
     */
    private void unzip(MultipartFile file, Path targetDir) throws IOException {
        try {
            tryUnzip(file.getInputStream(), targetDir, java.nio.charset.StandardCharsets.UTF_8);
        } catch (IllegalArgumentException | IOException e) {
            log.warn("Failed to unzip using UTF-8, retrying with x-windows-949 encoding: {}", e.getMessage());
            tryCleanDirectory(targetDir);
            tryUnzip(file.getInputStream(), targetDir, Charset.forName("x-windows-949"));
        }
    }

    private void tryUnzip(InputStream zipStream, Path targetDir, Charset charset) throws IOException {
        Path destDir = targetDir.toAbsolutePath().normalize();
        try (ZipInputStream zis = new ZipInputStream(zipStream, charset)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                // UTF-8 이외의 인코딩 문제에 대처하기 위해 EntryName 정규화
                Path filePath = destDir.resolve(entry.getName()).normalize();
                if (!filePath.startsWith(destDir)) {
                    throw new IOException("보안 경고: 압축 해제 경로가 대상 디렉토리를 벗어납니다: " + entry.getName());
                }
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    Files.createDirectories(filePath.getParent());
                    Files.copy(zis, filePath, StandardCopyOption.REPLACE_EXISTING);
                }
                zis.closeEntry();
            }
        }
    }

    private void tryCleanDirectory(Path directory) {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(directory)) {
            for (Path entry : stream) {
                if (Files.isDirectory(entry)) {
                    try {
                        deleteDirectory(entry);
                    } catch (IOException e) {
                        // ignore
                    }
                } else {
                    Files.delete(entry);
                }
            }
        } catch (Exception e) {
            log.error("Failed to clean directory before retrying unzip", e);
        }
    }

    /**
     * 대상 데이터 디렉토리 검색 (숫자로 시작하는 xlsx가 있는 폴더)
     */
    private Path findDataDir(Path rootDir) throws IOException {
        final Path[] found = new Path[1];
        Files.walkFileTree(rootDir, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
                    for (Path file : stream) {
                        String name = file.getFileName().toString();
                        if (Files.isRegularFile(file) && name.endsWith(".xlsx") && name.matches("^\\d+\\..*")) {
                            found[0] = dir;
                            return FileVisitResult.TERMINATE;
                        }
                    }
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return found[0];
    }

    /**
     * 파일 압축
     */
    private void zipFiles(List<Path> files, Path zipFile) throws IOException {
        try (ZipOutputStream zos = new ZipOutputStream(Files.newOutputStream(zipFile))) {
            for (Path file : files) {
                ZipEntry zipEntry = new ZipEntry(file.getFileName().toString());
                zos.putNextEntry(zipEntry);
                Files.copy(file, zos);
                zos.closeEntry();
            }
        }
    }

    /**
     * 디렉토리 및 하위 리소스 강제 삭제
     */
    private void deleteDirectory(Path directory) throws IOException {
        if (!Files.exists(directory)) return;
        Files.walkFileTree(directory, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    /**
     * 혹시 에러 등으로 삭제되지 못하고 temp_jobs 폴더에 남겨진 30분이 경과한 임시 폴더 청소 (10분 간격 실행)
     */
    @Scheduled(fixedDelay = 600000)
    public void cleanUpOldWorshipJobs() {
        log.info("Running scheduled cleanup for abandoned Weekly Worship temp folders...");
        long now = System.currentTimeMillis();
        long limit = now - (30 * 60 * 1000); // 30분 전

        Path tempJobsDir = getModelingDirPath().resolve("temp_jobs");
        if (Files.exists(tempJobsDir)) {
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(tempJobsDir)) {
                for (Path entry : stream) {
                    if (Files.isDirectory(entry) && entry.getFileName().toString().startsWith("worship_")) {
                        BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);
                        if (attrs.creationTime().toMillis() < limit) {
                            try {
                                deleteDirectory(entry);
                                log.info("Physically cleaned up abandoned temp folder: {}", entry.getFileName());
                            } catch (Exception e) {
                                // ignore
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed during folder tree cleanup in temp_jobs", e);
            }
        }
    }
}
