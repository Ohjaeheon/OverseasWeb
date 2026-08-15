package com.overseas.portal.service;

import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.repository.WeeklyReportSchemaRepository;
import com.overseas.portal.util.WeekUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WeeklyReportSchemaService {

    private final WeeklyReportSchemaRepository schemaRepository;

    /** 전체 양식 목록 (시작 주차 최신순) */
    @Transactional(readOnly = true)
    public List<WeeklyReportSchema> getAllSchemas() {
        return schemaRepository.findAllByOrderByStartYearDescStartMonthDescStartWeekOfMonthDesc();
    }

    /** 특정 주차에 적용될 양식: 사용중(isEnabled)인 것들 중 시작 주차가 target 이하인 것 중 가장 늦게 시작하는 것 */
    @Transactional(readOnly = true)
    public WeeklyReportSchema getSchemaForWeek(int year, int month, int weekOfMonth) {
        int targetKey = new WeekUtil.Week(year, month, weekOfMonth).sortKey();
        return schemaRepository.findAllByIsEnabledTrue().stream()
                .filter(s -> s.sortKey() <= targetKey)
                .max(Comparator.comparingInt(WeeklyReportSchema::sortKey))
                .orElseThrow(() -> new IllegalStateException("해당 주차에 적용할 주간보고 양식이 없습니다."));
    }

    /** 현재 주차에 적용될 양식 */
    @Transactional(readOnly = true)
    public WeeklyReportSchema getCurrentSchema() {
        WeekUtil.Week now = WeekUtil.currentWeek();
        return getSchemaForWeek(now.year(), now.month(), now.weekOfMonth());
    }

    /** 특정 양식 단건 조회 */
    @Transactional(readOnly = true)
    public WeeklyReportSchema getSchema(Long schemaId) {
        return schemaRepository.findById(schemaId)
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다. ID: " + schemaId));
    }

    /** 새 양식 생성 */
    public WeeklyReportSchema createSchema(WeeklyReportSchema schema) {
        validateStartWeek(schema.getStartYear(), schema.getStartMonth(), schema.getStartWeekOfMonth());
        return schemaRepository.save(schema);
    }

    /** 양식 수정 */
    public WeeklyReportSchema updateSchema(Long schemaId, WeeklyReportSchema updated) {
        WeeklyReportSchema schema = getSchema(schemaId);
        if (updated.getWeekLabel() != null) schema.setWeekLabel(updated.getWeekLabel());
        if (updated.getStartYear() != null && updated.getStartMonth() != null && updated.getStartWeekOfMonth() != null) {
            validateStartWeek(updated.getStartYear(), updated.getStartMonth(), updated.getStartWeekOfMonth());
            schema.setStartYear(updated.getStartYear());
            schema.setStartMonth(updated.getStartMonth());
            schema.setStartWeekOfMonth(updated.getStartWeekOfMonth());
        }
        if (updated.getFormSchemaJson() != null) schema.setFormSchemaJson(updated.getFormSchemaJson());
        return schemaRepository.save(schema);
    }

    /** 양식 사용/중지 전환 */
    public WeeklyReportSchema setEnabled(Long schemaId, boolean enabled) {
        WeeklyReportSchema schema = getSchema(schemaId);
        schema.setIsEnabled(enabled);
        return schemaRepository.save(schema);
    }

    /** 양식 삭제 */
    public void deleteSchema(Long schemaId) {
        WeeklyReportSchema schema = getSchema(schemaId);
        if (Boolean.TRUE.equals(schema.getIsEnabled())) {
            throw new IllegalStateException("사용중인 양식은 삭제할 수 없습니다. 먼저 사용 중지 해주세요.");
        }
        schemaRepository.delete(schema);
    }

    private void validateStartWeek(Integer year, Integer month, Integer weekOfMonth) {
        if (year == null || month == null || weekOfMonth == null
                || !WeekUtil.isInSupportedRange(year, month, weekOfMonth)) {
            throw new IllegalArgumentException("적용 시작 주차는 2025년 1월 1주차 ~ 2999년 12월 마지막 주차 사이여야 합니다.");
        }
    }
}
