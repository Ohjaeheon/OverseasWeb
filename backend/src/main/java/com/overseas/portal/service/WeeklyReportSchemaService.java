package com.overseas.portal.service;

import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.repository.WeeklyReportSchemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WeeklyReportSchemaService {

    private final WeeklyReportSchemaRepository schemaRepository;

    /** 전체 양식 목록 (최신순) */
    @Transactional(readOnly = true)
    public List<WeeklyReportSchema> getAllSchemas() {
        return schemaRepository.findAllByOrderByCreatedAtDesc();
    }

    /** 현재 활성 양식 조회 */
    @Transactional(readOnly = true)
    public WeeklyReportSchema getActiveSchema() {
        return schemaRepository.findByIsActiveTrue()
                .orElseThrow(() -> new IllegalStateException("현재 활성화된 주간보고 양식이 없습니다."));
    }

    /** 특정 양식 단건 조회 */
    @Transactional(readOnly = true)
    public WeeklyReportSchema getSchema(Long schemaId) {
        return schemaRepository.findById(schemaId)
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다. ID: " + schemaId));
    }

    /** 새 양식 생성 */
    public WeeklyReportSchema createSchema(WeeklyReportSchema schema) {
        return schemaRepository.save(schema);
    }

    /** 양식 수정 */
    public WeeklyReportSchema updateSchema(Long schemaId, WeeklyReportSchema updated) {
        WeeklyReportSchema schema = getSchema(schemaId);
        if (updated.getWeekLabel() != null) schema.setWeekLabel(updated.getWeekLabel());
        if (updated.getYear() != null) schema.setYear(updated.getYear());
        if (updated.getWeekNumber() != null) schema.setWeekNumber(updated.getWeekNumber());
        if (updated.getFormSchemaJson() != null) schema.setFormSchemaJson(updated.getFormSchemaJson());
        return schemaRepository.save(schema);
    }

    /** 특정 양식 활성화 (기존 active는 모두 해제) */
    public WeeklyReportSchema activateSchema(Long schemaId) {
        schemaRepository.deactivateAll();
        WeeklyReportSchema schema = getSchema(schemaId);
        schema.setIsActive(true);
        return schemaRepository.save(schema);
    }

    /** 특정 양식 비활성화 */
    public WeeklyReportSchema deactivateSchema(Long schemaId) {
        WeeklyReportSchema schema = getSchema(schemaId);
        schema.setIsActive(false);
        return schemaRepository.save(schema);
    }

    /** 양식 삭제 */
    public void deleteSchema(Long schemaId) {
        WeeklyReportSchema schema = getSchema(schemaId);
        if (Boolean.TRUE.equals(schema.getIsActive())) {
            throw new IllegalStateException("활성화된 양식은 삭제할 수 없습니다. 먼저 비활성화 해주세요.");
        }
        schemaRepository.delete(schema);
    }
}
