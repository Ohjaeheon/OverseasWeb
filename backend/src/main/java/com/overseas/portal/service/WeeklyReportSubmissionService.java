package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.User;
import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.domain.WeeklyReportSubmission;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.repository.WeeklyReportSchemaRepository;
import com.overseas.portal.repository.WeeklyReportSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class WeeklyReportSubmissionService {

    private final WeeklyReportSubmissionRepository submissionRepository;
    private final WeeklyReportSchemaRepository schemaRepository;
    private final UserRepository userRepository;
    private final ChurchRepository churchRepository;

    /**
     * 현재 로그인 사용자가 접근할 수 있는 교회 목록 반환.
     * - assignedCountry = "전체" 또는 ROLE_ADMIN : 모든 활성 교회
     * - 그 외 : country 컬럼이 assignedCountry와 일치하는 교회만
     */
    @Transactional(readOnly = true)
    public List<Church> getAccessibleChurches() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        String role = user.getRole() == null ? "" : user.getRole();
        String assigned = user.getAssignedCountry() == null ? "전체" : user.getAssignedCountry();

        boolean isAdmin = role.equals("ROLE_ADMIN") || role.equals("ADMIN") || role.equals("관리자") || role.equals("ROLE_관리자");

        if (isAdmin || assigned.equals("전체")) {
            return churchRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc();
        }

        // 담당 국가 필터: country가 assignedCountry와 일치하는 교회만
        return churchRepository.findByCountryAndIsActiveTrue(assigned);
    }

    /**
     * 보고 데이터 제출 (신규 또는 재제출)
     * - 요청자의 assignedCountry와 제출 대상 교회의 country가 일치하는지 검증
     * - ROLE_ADMIN / assignedCountry=전체 : 모든 교회 제출 가능
     */
    public WeeklyReportSubmission submitReport(Long schemaId, Long churchId,
                                               String submitDataJson, String photoPaths) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        // 권한 검증
        validateChurchAccess(user, churchId);

        WeeklyReportSchema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다. ID: " + schemaId));

        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회를 찾을 수 없습니다. ID: " + churchId));

        // 이미 제출된 경우 재제출(수정)로 처리
        Optional<WeeklyReportSubmission> existing =
                submissionRepository.findBySchema_SchemaIdAndChurchId(schemaId, churchId);

        if (existing.isPresent()) {
            WeeklyReportSubmission sub = existing.get();
            sub.setSubmitDataJson(submitDataJson);
            if (photoPaths != null) sub.setPhotoPaths(photoPaths);
            sub.setStatus("REVISED");
            sub.setSubmittedBy(username);
            return submissionRepository.save(sub);
        }

        WeeklyReportSubmission submission = WeeklyReportSubmission.builder()
                .schema(schema)
                .churchId(churchId)
                .churchName(church.getName())
                .submittedBy(username)
                .submitDataJson(submitDataJson)
                .photoPaths(photoPaths)
                .status("SUBMITTED")
                .build();

        return submissionRepository.save(submission);
    }

    /**
     * 특정 주차의 전체 제출 현황 (관리자용)
     */
    @Transactional(readOnly = true)
    public List<WeeklyReportSubmission> getSubmissionsBySchema(Long schemaId) {
        return submissionRepository.findBySchema_SchemaIdOrderBySubmittedAtDesc(schemaId);
    }

    /**
     * 전체 제출 현황 (관리자용)
     */
    @Transactional(readOnly = true)
    public List<WeeklyReportSubmission> getAllSubmissions() {
        return submissionRepository.findAllByOrderBySubmittedAtDesc();
    }

    /**
     * 제출 상세 조회
     */
    @Transactional(readOnly = true)
    public WeeklyReportSubmission getSubmission(Long submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("제출 데이터를 찾을 수 없습니다. ID: " + submissionId));
    }

    /**
     * 내 교회의 제출 여부 확인 (사용자용)
     */
    @Transactional(readOnly = true)
    public Optional<WeeklyReportSubmission> getMySubmission(Long schemaId, Long churchId) {
        return submissionRepository.findBySchema_SchemaIdAndChurchId(schemaId, churchId);
    }

    /**
     * 제출 삭제 (관리자용)
     */
    public void deleteSubmission(Long submissionId) {
        WeeklyReportSubmission sub = getSubmission(submissionId);
        submissionRepository.delete(sub);
    }

    // ──────────────────────────────────────────────
    // 내부 권한 검증
    // ──────────────────────────────────────────────

    private void validateChurchAccess(User user, Long churchId) {
        String role = user.getRole() == null ? "" : user.getRole();
        String assigned = user.getAssignedCountry() == null ? "전체" : user.getAssignedCountry();

        boolean isAdmin = role.equals("ROLE_ADMIN") || role.equals("ADMIN")
                || role.equals("관리자") || role.equals("ROLE_관리자");
        if (isAdmin || assigned.equals("전체")) {
            return; // 전체 접근 허용
        }

        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회를 찾을 수 없습니다. ID: " + churchId));

        if (!assigned.equals(church.getCountry())) {
            throw new SecurityException(
                    "해당 교회에 대한 제출 권한이 없습니다. (담당: " + assigned + ", 요청: " + church.getCountry() + ")");
        }
    }
}
