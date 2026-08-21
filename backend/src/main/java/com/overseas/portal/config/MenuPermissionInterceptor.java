package com.overseas.portal.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.repository.SystemConfigRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.*;

/**
 * 프론트엔드(roleService.ts)가 쓰는 것과 동일한 menu_permissions_matrix 설정을 참조해
 * API 경로 단위로도 메뉴 조회/수정 권한을 강제한다. 경로별 세부 메뉴키는 서비스 단위로만
 * 나뉘어 있어(예: 전도 관련 API는 전부 p1 그룹) 프론트의 페이지별 세분화만큼 정밀하지는 않다.
 */
@Component
@RequiredArgsConstructor
public class MenuPermissionInterceptor implements HandlerInterceptor {

    private final SystemConfigRepository systemConfigRepository;
    private final ObjectMapper objectMapper;

    // "명시적으로 허용하기 전까지는 차단" 기본값 — frontend/src/services/roleService.ts의 DEFAULT_ALLOWED_MENU_KEYS와 동일하게 유지.
    private static final Set<String> DEFAULT_ALLOWED_MENU_KEYS = Set.of("home", "diag", "calendar", "organization");

    // frontend/src/services/roleService.ts DEFAULT_MENUS 중 adminsetting 카테고리 메뉴 키 전체.
    private static final List<String> ADMINSETTING_MENU_KEYS = List.of(
            "admin_dash", "admin_faith", "admin_detail", "weekly_worship", "weekly_worship_history",
            "weekly_report_status", "weekly_report_schema", "evangelism_bulk", "membership_bulk",
            "users", "roles", "perm", "org_structure", "login_logs", "access_logs", "file_upload_logs", "file_download_logs",
            "i18n", "sys", "admin_bot", "backdoor_ips", "admin_messages"
    );

    // API 경로 prefix -> menuKey 그룹(그룹 중 하나라도 read/write가 있으면 통과). LinkedHashMap으로 등록 순서 = 매칭 우선순위.
    private static final Map<String, List<String>> PATH_MENU_GROUPS = new LinkedHashMap<>();
    static {
        PATH_MENU_GROUPS.put("/api/v1/admin", ADMINSETTING_MENU_KEYS);
        PATH_MENU_GROUPS.put("/api/v1/evangelism", List.of("p1", "p1_check", "p1_agg", "p1_plan", "p1_monthly"));
        PATH_MENU_GROUPS.put("/api/v1/membership", List.of("p3", "p3_check", "p3_input"));
        PATH_MENU_GROUPS.put("/api/v1/business", List.of(
                "business", "business_ledger", "business_ledger_archive", "business_ledger_report",
                "business_fruit", "business_fruit_archive",
                "business_transport", "business_transport_archive",
                "business_mission", "business_mission_archive"
        ));
        PATH_MENU_GROUPS.put("/api/v1/organization", List.of("organization"));
        // /api/v1/calendar는 의도적으로 매핑하지 않는다 — 캘린더 일정 생성/수정은 "calendar 메뉴 write 권한"이
        // 아니라 CalendarEventController 자체의 "본인 일정 또는 관리자" 규칙으로 이미 통제되고 있고, 프론트도
        // 이 메뉴의 write 권한을 확인하지 않은 채 누구나 일정을 추가하게 해놨다. 여기서 write까지 강제하면
        // 명시적으로 권한을 받지 않은 일반 사용자가 자기 일정도 못 만드는 회귀가 생긴다.
        PATH_MENU_GROUPS.put("/api/v1/weekly-report", List.of("weekly_report_input"));
    }

    private record PermEntry(boolean read, boolean write) {}

    // 진단서(홈/①전도 등 여러 화면)가 페이지 자체 권한과 무관하게 다른 모듈의 최신 데이터를 교차
    // 참조해야 하는 조회 전용 엔드포인트. 예: ①전도 표의 "전도재적(전년도 12월 고정값)"은 p1 권한만
    // 있어도 p3(내무) 원본 데이터를 읽어야 계산된다. 쓰기(POST 등)는 그대로 p1/p3 권한으로 막는다.
    private static final Set<String> CROSS_MODULE_READ_PATHS = Set.of(
            "/api/v1/evangelism/records",
            "/api/v1/membership/records"
    );

    // 결재(승인/반려) 목록·처리 엔드포인트는 evangelism/membership/monthly-activity 등 소속 모듈 경로
    // 아래에 있지만, 실제로는 "approvals_pending"/"approvals_completed" 메뉴 권한자(결재자)가 다루는
    // 기능이라 그 모듈 자체의 p1/p3 권한과는 무관하다 — 결재자가 전도/내무 데이터 입력 권한은 없어도
    // 승인 화면(/approvals/pending)에는 접근할 수 있어야 한다. /edit-requests 요청 생성과 /check
    // 조회는 각 모듈의 정상 사용자 액션이라 예외 없이 원래 그룹(p1/p3)을 그대로 따른다.
    private static final List<String> APPROVAL_MENU_KEYS = List.of("approvals_pending", "approvals_completed");

    private boolean isApprovalActionPath(String path) {
        if (!path.contains("/edit-requests/")) return false;
        return path.endsWith("/pending") || path.endsWith("/completed") || path.endsWith("/approve") || path.endsWith("/reject");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;

        String path = request.getRequestURI();
        if ("GET".equalsIgnoreCase(request.getMethod()) && CROSS_MODULE_READ_PATHS.contains(path)) return true;

        List<String> menuKeys;
        if (isApprovalActionPath(path)) {
            menuKeys = APPROVAL_MENU_KEYS;
        } else {
            menuKeys = null;
            for (Map.Entry<String, List<String>> e : PATH_MENU_GROUPS.entrySet()) {
                if (path.startsWith(e.getKey())) {
                    menuKeys = e.getValue();
                    break;
                }
            }
        }
        // 매핑표에 없는 경로는 인증만 요구(SecurityConfig가 이미 처리) — 인터셉터는 통과시킨다.
        if (menuKeys == null) return true;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String roleId = "ROLE_USER";
        if (auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
            roleId = auth.getAuthorities().iterator().next().getAuthority();
        }
        if ("ROLE_ADMIN".equals(roleId)) return true;

        Map<String, Map<String, PermEntry>> matrix = loadMatrix();
        boolean isWrite = !"GET".equalsIgnoreCase(request.getMethod());

        boolean allowed = false;
        for (String menuKey : menuKeys) {
            PermEntry entry = resolvePerm(matrix, roleId, menuKey);
            if (isWrite ? entry.write() : entry.read()) {
                allowed = true;
                break;
            }
        }

        if (!allowed) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\": \"해당 메뉴에 대한 접근 권한이 없습니다.\"}");
            return false;
        }
        return true;
    }

    private PermEntry resolvePerm(Map<String, Map<String, PermEntry>> matrix, String roleId, String menuKey) {
        Map<String, PermEntry> byRole = matrix.get(menuKey);
        if (byRole != null && byRole.containsKey(roleId)) return byRole.get(roleId);
        return new PermEntry(DEFAULT_ALLOWED_MENU_KEYS.contains(menuKey), false);
    }

    private Map<String, Map<String, PermEntry>> loadMatrix() {
        Map<String, Map<String, PermEntry>> result = new HashMap<>();
        Optional<SystemConfig> cfg = systemConfigRepository.findByConfigKey("menu_permissions_matrix");
        if (cfg.isEmpty()) return result;
        try {
            JsonNode root = objectMapper.readTree(cfg.get().getConfigValue());
            Iterator<Map.Entry<String, JsonNode>> menus = root.fields();
            while (menus.hasNext()) {
                Map.Entry<String, JsonNode> menuEntry = menus.next();
                Map<String, PermEntry> byRole = new HashMap<>();
                Iterator<Map.Entry<String, JsonNode>> roles = menuEntry.getValue().fields();
                while (roles.hasNext()) {
                    Map.Entry<String, JsonNode> roleEntry = roles.next();
                    JsonNode perm = roleEntry.getValue();
                    boolean read = perm.has("read") && perm.get("read").asBoolean();
                    boolean write = perm.has("write") && perm.get("write").asBoolean();
                    byRole.put(roleEntry.getKey(), new PermEntry(read, write));
                }
                result.put(menuEntry.getKey(), byRole);
            }
        } catch (Exception e) {
            // 파싱 실패 시 빈 매트릭스로 취급 -> 전부 기본값(defaultPermFor) 규칙 적용
        }
        return result;
    }
}
