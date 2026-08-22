package com.overseas.portal.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.ApprovalInstance;
import com.overseas.portal.domain.TelegramBotConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.dto.ApprovalInstanceDto;
import com.overseas.portal.repository.EvangelismEditRequestRepository;
import com.overseas.portal.repository.EvangelismMonthlyActivityEditRequestRepository;
import com.overseas.portal.repository.MembershipEditRequestRepository;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * 결재 텔레그램 알림 - 결재라인에 따라 현재 결재자에게 승인/반려 인라인 버튼이 포함된 메시지를
 * 보내고, 버튼 클릭 시 실제 결재 처리를 수행한 뒤 다음 결재자 또는 기안자에게 결과를 알린다.
 *
 * telegram_bot_configs의 "approval_bot" 항목 isActive로 이 기능 전체를 켜고 끌 수 있다.
 * approval_bot 전용 토큰이 비어있으면 "otp_bot"과 동일한 봇 토큰을 함께 사용한다 - 관리자가
 * 별도 봇을 새로 만들지 않고 이미 연동된 OTP봇을 그대로 재사용할 수 있도록 하기 위함이다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalTelegramService {

    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    private final SystemConfigRepository systemConfigRepository;
    private final ObjectMapper objectMapper;
    private final TelegramBotService telegramBotService;
    private final UserRepository userRepository;
    private final ApprovalInstanceService approvalInstanceService;
    private final EvangelismEditRequestRepository evangelismEditRequestRepository;
    private final MembershipEditRequestRepository membershipEditRequestRepository;
    private final EvangelismMonthlyActivityEditRequestRepository monthlyActivityEditRequestRepository;

    private record RequestSummary(String title, String requestedByUsername, String content, ZonedDateTime requestedAt) {}

    /** 결재 인스턴스 생성/처리 직후 호출 - 현재 상태에 따라 다음 결재자 또는 기안자에게 알림을 보낸다. */
    public void notifyAfterStateChange(String targetType, Long requestId) {
        try {
            String token = resolveApprovalBotToken().orElse(null);
            if (token == null) return;

            ApprovalInstanceDto dto = approvalInstanceService.getInstanceDto(targetType, requestId).orElse(null);
            if (dto == null) return;

            RequestSummary summary = loadSummary(targetType, requestId);
            if (summary == null) return;

            if ("PENDING".equals(dto.getStatus())) {
                dto.getSteps().stream()
                        .filter(s -> s.getStepOrder().equals(dto.getCurrentStepOrder()))
                        .findFirst()
                        .ifPresent(step -> step.getApprovers().stream()
                                .filter(a -> a.getDecision() == null && a.getUserId() != null)
                                .forEach(a -> sendApprovalRequest(token, a.getUserId(), targetType, requestId, summary)));
            } else if ("APPROVED".equals(dto.getStatus()) || "REJECTED".equals(dto.getStatus())) {
                userRepository.findByUsername(summary.requestedByUsername())
                        .ifPresent(requester -> sendOutcome(token, requester, summary, dto.getStatus()));
            }
        } catch (Exception e) {
            log.error("결재 텔레그램 알림 발송 중 오류 (targetType={}, requestId={})", targetType, requestId, e);
        }
    }

    /** 텔레그램 인라인 버튼(승인/반려) 클릭 처리 - TelegramBotPollingService의 callback_query 핸들러에서 호출. */
    public String handleDecisionCallback(String targetType, Long requestId, String chatId, boolean approve) {
        if (resolveApprovalBotToken().isEmpty()) {
            return "결재 텔레그램 알림 기능이 비활성화되어 있습니다.";
        }
        User actingUser = userRepository.findByTelegramChatId(chatId).orElse(null);
        if (actingUser == null) {
            return "연동된 포탈 계정을 찾을 수 없습니다.";
        }
        try {
            ApprovalInstance instance = approvalInstanceService.decide(targetType, requestId, actingUser.getUserId(), approve, null);
            syncDomainEntity(targetType, requestId, instance);
            notifyAfterStateChange(targetType, requestId);
            return approve ? "✅ 승인 처리되었습니다." : "❌ 반려 처리되었습니다.";
        } catch (SecurityException e) {
            return "현재 결재 단계의 결재자가 아닙니다.";
        } catch (IllegalArgumentException | IllegalStateException e) {
            return e.getMessage();
        }
    }

    private void sendApprovalRequest(String token, Long approverUserId, String targetType, Long requestId, RequestSummary summary) {
        User approver = userRepository.findById(approverUserId).orElse(null);
        if (approver == null || approver.getTelegramChatId() == null || approver.getTelegramChatId().isBlank()) return;

        String requesterDisplay = userRepository.findByUsername(summary.requestedByUsername())
                .map(User::getName).orElse(summary.requestedByUsername());

        String text = String.format("""
                📋 결재 요청이 도착했습니다.

                결재 제목: %s
                요청자: %s
                내용: %s
                요청일시: %s""",
                summary.title(), requesterDisplay, summary.content(), formatDate(summary.requestedAt()));

        List<Map<String, String>> row = List.of(
                Map.of("text", "✅ 승인", "callback_data", "appr|" + targetType + "|" + requestId + "|A"),
                Map.of("text", "❌ 반려", "callback_data", "appr|" + targetType + "|" + requestId + "|R")
        );
        telegramBotService.sendMessageWithInlineKeyboard(approver.getTelegramChatId(), text, List.of(row), token);
    }

    private void sendOutcome(String token, User requester, RequestSummary summary, String status) {
        if (requester.getTelegramChatId() == null || requester.getTelegramChatId().isBlank()) return;
        String text = "APPROVED".equals(status)
                ? String.format("✅ 요청하신 결재가 승인되었습니다.\n\n결재 제목: %s", summary.title())
                : String.format("❌ 요청하신 결재가 반려되었습니다.\n\n결재 제목: %s", summary.title());
        telegramBotService.sendTestMessage(requester.getTelegramChatId(), text, token);
    }

    private String formatDate(ZonedDateTime dateTime) {
        return dateTime != null ? dateTime.withZoneSameInstant(ZoneId.of("Asia/Seoul")).format(DISPLAY_FORMAT) : "-";
    }

    private RequestSummary loadSummary(String targetType, Long requestId) {
        return switch (targetType) {
            case "EVANGELISM" -> evangelismEditRequestRepository.findById(requestId)
                    .map(r -> new RequestSummary("전도 실적수정 - " + r.getChurchName() + " " + r.getWeekKey(),
                            r.getRequestedBy(), r.getReason(), r.getRequestedAt()))
                    .orElse(null);
            case "MEMBERSHIP" -> membershipEditRequestRepository.findById(requestId)
                    .map(r -> new RequestSummary("내무 실적수정 - " + r.getChurchName() + " " + r.getMonthKey(),
                            r.getRequestedBy(), r.getReason(), r.getRequestedAt()))
                    .orElse(null);
            case "MONTHLY_ACTIVITY" -> monthlyActivityEditRequestRepository.findById(requestId)
                    .map(r -> new RequestSummary("전도(월간보고) 실적수정 - " + r.getChurchName() + " " + r.getMonthKey(),
                            r.getRequestedBy(), r.getReason(), r.getRequestedAt()))
                    .orElse(null);
            default -> null;
        };
    }

    private void syncDomainEntity(String targetType, Long requestId, ApprovalInstance instance) {
        switch (targetType) {
            case "EVANGELISM" -> evangelismEditRequestRepository.findById(requestId).ifPresent(r -> {
                applyInstanceStatus(instance, r::setStatus, r::setApprovedAt);
                String comment = approvalInstanceService.getLatestComment(instance.getId());
                if (comment != null) r.setApproverComment(comment);
                r.setRequestedTo(approvalInstanceService.describeCurrentState(instance));
                evangelismEditRequestRepository.save(r);
            });
            case "MEMBERSHIP" -> membershipEditRequestRepository.findById(requestId).ifPresent(r -> {
                applyInstanceStatus(instance, r::setStatus, r::setApprovedAt);
                String comment = approvalInstanceService.getLatestComment(instance.getId());
                if (comment != null) r.setApproverComment(comment);
                r.setRequestedTo(approvalInstanceService.describeCurrentState(instance));
                membershipEditRequestRepository.save(r);
            });
            case "MONTHLY_ACTIVITY" -> monthlyActivityEditRequestRepository.findById(requestId).ifPresent(r -> {
                applyInstanceStatus(instance, r::setStatus, r::setApprovedAt);
                String comment = approvalInstanceService.getLatestComment(instance.getId());
                if (comment != null) r.setApproverComment(comment);
                r.setRequestedTo(approvalInstanceService.describeCurrentState(instance));
                monthlyActivityEditRequestRepository.save(r);
            });
            default -> log.warn("Unknown approval targetType for telegram sync: {}", targetType);
        }
    }

    private void applyInstanceStatus(ApprovalInstance instance, Consumer<String> statusSetter, Consumer<ZonedDateTime> approvedAtSetter) {
        if ("APPROVED".equals(instance.getStatus())) {
            statusSetter.accept("APPROVED");
            approvedAtSetter.accept(instance.getCompletedAt());
        } else if ("REJECTED".equals(instance.getStatus())) {
            statusSetter.accept("REJECTED");
        }
    }

    private List<TelegramBotConfig> loadBotConfigs() {
        return systemConfigRepository.findByConfigKey("telegram_bot_configs")
                .map(cfg -> {
                    try {
                        return objectMapper.readValue(cfg.getConfigValue(), new TypeReference<List<TelegramBotConfig>>() {});
                    } catch (Exception e) {
                        log.error("Failed to parse telegram_bot_configs: {}", e.getMessage());
                        return Collections.<TelegramBotConfig>emptyList();
                    }
                })
                .orElseGet(Collections::emptyList);
    }

    private Optional<String> resolveApprovalBotToken() {
        List<TelegramBotConfig> bots = loadBotConfigs();
        TelegramBotConfig approvalBot = bots.stream().filter(b -> "approval_bot".equals(b.getBotId())).findFirst().orElse(null);
        if (approvalBot == null || !Boolean.TRUE.equals(approvalBot.getIsActive())) {
            return Optional.empty();
        }
        if (approvalBot.getBotToken() != null && !approvalBot.getBotToken().isBlank()) {
            return Optional.of(approvalBot.getBotToken());
        }
        // 결재 전용 봇 토큰이 비어있으면 OTP봇과 동일한 봇을 함께 사용한다.
        return bots.stream()
                .filter(b -> "otp_bot".equals(b.getBotId()))
                .map(TelegramBotConfig::getBotToken)
                .filter(t -> t != null && !t.isBlank())
                .findFirst();
    }
}
