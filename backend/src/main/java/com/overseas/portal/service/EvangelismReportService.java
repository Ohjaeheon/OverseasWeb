package com.overseas.portal.service;

import com.overseas.portal.domain.EvangelismMonthlyActivity;
import com.overseas.portal.domain.EvangelismReportFieldMapping;
import com.overseas.portal.domain.EvangelismReportTemplate;
import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.MembershipMonthlyRecord;
import com.overseas.portal.repository.EvangelismMonthlyActivityRepository;
import com.overseas.portal.repository.EvangelismReportFieldMappingRepository;
import com.overseas.portal.repository.EvangelismReportTemplateRepository;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.MembershipMonthlyRecordRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.poifs.crypt.Decryptor;
import org.apache.poi.poifs.crypt.EncryptionInfo;
import org.apache.poi.poifs.crypt.EncryptionMode;
import org.apache.poi.poifs.crypt.Encryptor;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvangelismReportService {

    @org.springframework.beans.factory.annotation.Value("${app.upload-dir}")
    private String uploadDir;

    /** 템플릿의 지역/부서 행 매칭 기준이 되는, 이 앱이 실제로 관리하는 부서 5종 */
    private static final List<String> DEPARTMENTS = List.of("교역자", "자문회", "장년회", "부녀회", "청년회");

    private static final Pattern WEEK_MONTH_PATTERN = Pattern.compile("^(\\d+)월");

    private final EvangelismReportTemplateRepository evangelismReportTemplateRepository;
    private final EvangelismReportFieldMappingRepository evangelismReportFieldMappingRepository;
    private final MembershipMonthlyRecordRepository membershipMonthlyRecordRepository;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final EvangelismMonthlyActivityRepository evangelismMonthlyActivityRepository;

    private Path getReportDirPath() {
        return Paths.get(uploadDir, "evangelism_report").toAbsolutePath().normalize();
    }

    @Data
    @Builder
    public static class ReportResult {
        private byte[] data;
        private String fileName;
    }

    // ── 템플릿 관리 ──────────────────────────────────────────────

    public List<EvangelismReportTemplate> listTemplates() {
        return evangelismReportTemplateRepository.findAllByOrderByUploadedAtDesc();
    }

    /**
     * 새 템플릿 업로드 → 비밀번호로 복호화 검증 및 지역/부서 행 존재 확인 → 즉시 활성화.
     */
    public EvangelismReportTemplate uploadTemplate(MultipartFile file, String password, String uploadedBy) throws Exception {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!originalFilename.toLowerCase().endsWith(".xlsx")) {
            throw new IllegalArgumentException("템플릿은 .xlsx 파일만 업로드할 수 있습니다.");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("템플릿 비밀번호를 입력해 주세요.");
        }

        Path templatesDir = getReportDirPath().resolve("templates");
        Files.createDirectories(templatesDir);

        EvangelismReportTemplate template = evangelismReportTemplateRepository.save(EvangelismReportTemplate.builder()
                .originalFilename(originalFilename)
                .storedPath("")
                .password(password)
                .isActive(false)
                .uploadedBy(uploadedBy)
                .build());

        Path dest = templatesDir.resolve("template_" + template.getTemplateId() + ".xlsx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
        }

        try {
            int matchedRows = countMatchedDepartmentRows(dest, password);
            if (matchedRows == 0) {
                throw new IllegalArgumentException("템플릿에서 부서 행(교역자/자문회/장년회/부녀회/청년회)을 하나도 찾지 못했습니다.");
            }
        } catch (IllegalArgumentException e) {
            Files.deleteIfExists(dest);
            evangelismReportTemplateRepository.deleteById(template.getTemplateId());
            throw e;
        } catch (Exception e) {
            Files.deleteIfExists(dest);
            evangelismReportTemplateRepository.deleteById(template.getTemplateId());
            throw new IllegalArgumentException("템플릿 파일을 읽을 수 없습니다 (비밀번호를 확인해 주세요): " + e.getMessage());
        }

        template.setStoredPath("templates/template_" + template.getTemplateId() + ".xlsx");
        evangelismReportTemplateRepository.save(template);

        return activateTemplate(template.getTemplateId());
    }

    public EvangelismReportTemplate activateTemplate(Long templateId) {
        EvangelismReportTemplate target = evangelismReportTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 템플릿입니다: " + templateId));

        evangelismReportTemplateRepository.findByIsActiveTrue().ifPresent(current -> {
            if (!current.getTemplateId().equals(templateId)) {
                current.setIsActive(false);
                evangelismReportTemplateRepository.save(current);
            }
        });

        target.setIsActive(true);
        return evangelismReportTemplateRepository.save(target);
    }

    private int countMatchedDepartmentRows(Path templateFile, String password) throws Exception {
        try (POIFSFileSystem poifs = new POIFSFileSystem(Files.newInputStream(templateFile))) {
            EncryptionInfo info = new EncryptionInfo(poifs);
            Decryptor decryptor = Decryptor.getInstance(info);
            if (!decryptor.verifyPassword(password)) {
                throw new IllegalArgumentException("템플릿 파일의 비밀번호가 올바르지 않습니다.");
            }
            try (InputStream decrypted = decryptor.getDataStream(poifs);
                 XSSFWorkbook wb = new XSSFWorkbook(decrypted)) {
                XSSFSheet sheet = wb.getSheetAt(0);
                int count = 0;
                for (Row row : sheet) {
                    if (isDepartmentRow(row)) count++;
                }
                return count;
            }
        }
    }

    // ── 필드 매핑 관리 ──────────────────────────────────────────────

    public List<EvangelismReportFieldMapping> listFieldMappings() {
        return evangelismReportFieldMappingRepository.findAllByOrderByMappingIdAsc();
    }

    public EvangelismReportFieldMapping updateFieldMapping(Long mappingId, String columnLetter, String dataSource, Boolean isEnabled) {
        EvangelismReportFieldMapping mapping = evangelismReportFieldMappingRepository.findById(mappingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 필드 매핑입니다: " + mappingId));

        if (columnLetter != null && !columnLetter.isBlank()) mapping.setColumnLetter(columnLetter.trim().toUpperCase());
        if (dataSource != null) mapping.setDataSource(dataSource);
        if (isEnabled != null) mapping.setIsEnabled(isEnabled);
        return evangelismReportFieldMappingRepository.save(mapping);
    }

    // ── 보고서 생성 ──────────────────────────────────────────────

    /**
     * 선택한 교회·연·월 기준으로 활성 템플릿을 채워 반환한다.
     */
    public ReportResult generateReport(String church, int year, int month) throws Exception {
        EvangelismReportTemplate template = evangelismReportTemplateRepository.findByIsActiveTrue()
                .orElseThrow(() -> new IllegalStateException("등록된 월말보고서 양식(템플릿)이 없습니다. 관리자에게 문의해 주세요."));

        Path templateFile = getReportDirPath().resolve(template.getStoredPath()).toAbsolutePath().normalize();
        if (!Files.exists(templateFile)) {
            throw new IllegalStateException("활성 템플릿 파일을 서버에서 찾을 수 없습니다.");
        }

        Map<String, Map<String, Integer>> dataBySource = collectData(church, year, month);
        List<EvangelismReportFieldMapping> enabledMappings = evangelismReportFieldMappingRepository.findAllByIsEnabledTrue();

        byte[] filled;
        try (POIFSFileSystem poifs = new POIFSFileSystem(Files.newInputStream(templateFile))) {
            EncryptionInfo info = new EncryptionInfo(poifs);
            Decryptor decryptor = Decryptor.getInstance(info);
            if (!decryptor.verifyPassword(template.getPassword())) {
                throw new IllegalStateException("활성 템플릿의 비밀번호가 더 이상 유효하지 않습니다.");
            }
            try (InputStream decrypted = decryptor.getDataStream(poifs);
                 XSSFWorkbook wb = new XSSFWorkbook(decrypted)) {
                fillWorkbook(wb, church, month, dataBySource, enabledMappings);
                filled = encryptWorkbook(wb, template.getPassword());
            }
        }

        String fileName = church + "_" + year + "년" + month + "월_전도월말보고서.xlsx";
        return ReportResult.builder().data(filled).fileName(fileName).build();
    }

    /**
     * D(전년도 12월 재적)/E·G(당월·연누계 개강)/K(활동교사수)를 부서별로 집계한다.
     */
    private Map<String, Map<String, Integer>> collectData(String church, int year, int month) {
        Map<String, Integer> baseReg = new HashMap<>();
        String prevYearStr = (year - 1) + "년";
        for (MembershipMonthlyRecord r : membershipMonthlyRecordRepository.findByChurchNameAndYearStrAndMonthKey(church, prevYearStr, "12월")) {
            baseReg.put(r.getDepartment(), r.getCalculatedAssemblyReg() != null ? r.getCalculatedAssemblyReg() : 0);
        }

        Map<String, Integer> monthlyAdmit = new HashMap<>();
        Map<String, Integer> ytdAdmit = new HashMap<>();
        String yearStr = year + "년";
        for (EvangelismWeeklyRecord r : evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(church, yearStr)) {
            if (r.getWeekKey() == null) continue;
            Matcher m = WEEK_MONTH_PATTERN.matcher(r.getWeekKey());
            if (!m.find()) continue;
            int weekMonth = Integer.parseInt(m.group(1));
            int admit = r.getAdmitCount() != null ? r.getAdmitCount() : 0;
            if (weekMonth <= month) {
                ytdAdmit.merge(r.getDepartment(), admit, Integer::sum);
            }
            if (weekMonth == month) {
                monthlyAdmit.merge(r.getDepartment(), admit, Integer::sum);
            }
        }

        Map<String, Integer> teacherCount = new HashMap<>();
        String targetMonthKey = month + "월";
        for (EvangelismMonthlyActivity r : evangelismMonthlyActivityRepository.findByChurchNameAndYearStr(church, yearStr)) {
            if (targetMonthKey.equals(r.getMonthKey())) {
                teacherCount.put(r.getDepartment(), r.getTeacherCount() != null ? r.getTeacherCount() : 0);
            }
        }

        Map<String, Map<String, Integer>> result = new HashMap<>();
        result.put("MEMBERSHIP_PREV_DEC", baseReg);
        result.put("EVANGELISM_MONTHLY_ADMIT", monthlyAdmit);
        result.put("EVANGELISM_YTD_ADMIT", ytdAdmit);
        result.put("EVANGELISM_MONTHLY_TEACHER", teacherCount);
        return result;
    }

    private void fillWorkbook(XSSFWorkbook wb, String church, int month,
                               Map<String, Map<String, Integer>> dataBySource,
                               List<EvangelismReportFieldMapping> enabledMappings) {
        XSSFSheet sheet = wb.getSheetAt(0);

        replaceTitleToken(sheet, 0, "OO", church);
        replaceTitleToken(sheet, 1, "\\d*O\\s*월", month + "월");

        for (Row row : sheet) {
            if (!isDepartmentRow(row)) continue;
            String dept = row.getCell(2).getStringCellValue().trim();
            for (EvangelismReportFieldMapping fm : enabledMappings) {
                Map<String, Integer> source = dataBySource.get(fm.getDataSource());
                if (source == null) continue;
                int value = source.getOrDefault(dept, 0);
                int colIdx = CellReference.convertColStringToIndex(fm.getColumnLetter());
                Cell cell = row.getCell(colIdx, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                cell.setCellValue(value);
            }
        }

        wb.setForceFormulaRecalculation(true);
    }

    private boolean isDepartmentRow(Row row) {
        Cell c = row.getCell(2);
        if (c == null || c.getCellType() != CellType.STRING) return false;
        return DEPARTMENTS.contains(c.getStringCellValue().trim());
    }

    private void replaceTitleToken(XSSFSheet sheet, int rowIdx, String tokenRegex, String replacement) {
        Row row = sheet.getRow(rowIdx);
        if (row == null) return;
        Cell cell = row.getCell(0);
        if (cell == null || cell.getCellType() != CellType.STRING) return;
        String value = cell.getStringCellValue();
        String updated = value.replaceAll(tokenRegex, replacement);
        if (!updated.equals(value)) cell.setCellValue(updated);
    }

    private byte[] encryptWorkbook(XSSFWorkbook wb, String password) throws IOException, java.security.GeneralSecurityException {
        ByteArrayOutputStream plain = new ByteArrayOutputStream();
        wb.write(plain);

        try (POIFSFileSystem fs = new POIFSFileSystem()) {
            EncryptionInfo info = new EncryptionInfo(EncryptionMode.agile);
            Encryptor encryptor = info.getEncryptor();
            encryptor.confirmPassword(password);
            try (OPCPackage opc = OPCPackage.open(new ByteArrayInputStream(plain.toByteArray()));
                 OutputStream os = encryptor.getDataStream(fs)) {
                opc.save(os);
            } catch (org.apache.poi.openxml4j.exceptions.InvalidFormatException e) {
                throw new IOException(e);
            }
            ByteArrayOutputStream encrypted = new ByteArrayOutputStream();
            fs.writeFilesystem(encrypted);
            return encrypted.toByteArray();
        }
    }
}
