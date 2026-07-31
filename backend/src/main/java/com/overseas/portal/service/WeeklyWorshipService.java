package com.overseas.portal.service;

import com.overseas.portal.domain.WeeklyWorshipHistory;
import com.overseas.portal.repository.WeeklyWorshipHistoryRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeeklyWorshipService {

    private final File modelingDir = new File("worship_modeling").getAbsoluteFile();
    private final Map<String, WorshipJobInfo> activeJobs = new ConcurrentHashMap<>();
    private final WeeklyWorshipHistoryRepository weeklyWorshipHistoryRepository;

    @Data
    @AllArgsConstructor
    public static class WorshipJobInfo {
        private String jobId;
        private Path jobDir;
        private Path sundayFile;
        private Path wednesdayFile;
        private Path zipFile;
        private long createdAt;
    }

    @Data
    @Builder
    public static class WorshipJobResult {
        private String jobId;
        private String logs;
        private boolean success;
        private String sundayFileName;
        private String wednesdayFileName;
        private String errorMessage;
    }

    /**
     * 주간예배출결 취합 메인 로직 실행
     */
    public WorshipJobResult executeMerge(MultipartFile file) throws Exception {
        String jobId = UUID.randomUUID().toString();
        Path tempJobsDir = modelingDir.toPath().resolve("temp_jobs").toAbsolutePath().normalize();
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

            // 4. 스크립트 및 템플릿 복사
            Path scriptSrc = modelingDir.toPath().resolve("merge_attendance.py");
            Path templateSrc = modelingDir.toPath().resolve("양식.xlsx");

            if (!Files.exists(scriptSrc)) {
                throw new FileNotFoundException("메인 모델링 디렉토리에 'merge_attendance.py' 파일이 존재하지 않습니다.");
            }
            if (!Files.exists(templateSrc)) {
                throw new FileNotFoundException("메인 모델링 디렉토리에 '양식.xlsx' 파일이 존재하지 않습니다.");
            }

            Files.copy(scriptSrc, jobDir.resolve("merge_attendance.py"), StandardCopyOption.REPLACE_EXISTING);
            Files.copy(templateSrc, jobDir.resolve("양식.xlsx"), StandardCopyOption.REPLACE_EXISTING);
            logBuilder.append("[시스템] 취합 템플릿 및 파이썬 연산 스크립트 배치 완료\n");

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

            Path historyFilesDir = modelingDir.toPath().resolve("history_files");
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

            // 9. activeJobs 맵에 등록 (임시 다운로드 지원)
            WorshipJobInfo jobInfo = new WorshipJobInfo(
                    jobId,
                    jobDir,
                    sundayFile,
                    wednesdayFile,
                    zipFile,
                    System.currentTimeMillis()
            );
            activeJobs.put(jobId, jobInfo);

            return WorshipJobResult.builder()
                    .jobId(jobId)
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

            // 실패 시 생성했던 폴더 안전 삭제
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
     * 특정 Job ID의 리소스를 조회
     */
    public WorshipJobInfo getJobInfo(String jobId) {
        return activeJobs.get(jobId);
    }

    /**
     * 특정 Job ID의 임시 파일 정리 및 맵에서 삭제
     */
    public void cleanupJob(String jobId) {
        WorshipJobInfo info = activeJobs.remove(jobId);
        if (info != null) {
            try {
                deleteDirectory(info.getJobDir());
                log.info("Cleaned up worship job resources after download: {}", jobId);
            } catch (Exception e) {
                log.error("Failed to delete directory for job: " + jobId, e);
            }
        }
    }

    /**
     * 주간예배취합 과거 이력 전체 조회
     */
    public List<WeeklyWorshipHistory> getHistoryList() {
        return weeklyWorshipHistoryRepository.findAllByOrderByCreatedAtDesc();
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

        if (relPath == null) {
            throw new IllegalArgumentException("잘못된 파일 다운로드 타입입니다: " + type);
        }

        Path filePath = modelingDir.toPath().resolve(relPath).toAbsolutePath().normalize();
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException("보관 디렉토리에 물리 파일이 존재하지 않습니다: " + filePath.getFileName());
        }
        return filePath;
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
     * 30분이 지난 임시 작업 리소스 및 디렉토리 자동 정리 (10분 간격 실행)
     */
    @Scheduled(fixedDelay = 600000)
    public void cleanUpOldWorshipJobs() {
        log.info("Running scheduled cleanup for old Weekly Worship Jobs...");
        long now = System.currentTimeMillis();
        long limit = now - (30 * 60 * 1000); // 30분 전

        activeJobs.forEach((jobId, info) -> {
            if (info.getCreatedAt() < limit) {
                try {
                    deleteDirectory(info.getJobDir());
                    activeJobs.remove(jobId);
                    log.info("Cleaned up expired worship job resources: {}", jobId);
                } catch (Exception e) {
                    log.error("Failed to clean up old worship job: " + jobId, e);
                }
            }
        });

        // 맵에 없더라도 temp_jobs 폴더의 물리 파일 중 30분이 지난 폴더 정리
        Path tempJobsDir = modelingDir.toPath().resolve("temp_jobs");
        if (Files.exists(tempJobsDir)) {
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(tempJobsDir)) {
                for (Path entry : stream) {
                    if (Files.isDirectory(entry) && entry.getFileName().toString().startsWith("worship_")) {
                        BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);
                        if (attrs.creationTime().toMillis() < limit) {
                            try {
                                deleteDirectory(entry);
                                log.info("Physically cleaned up abandoned worship job folder: {}", entry.getFileName());
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
