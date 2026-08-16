package com.overseas.portal.service;

import com.overseas.portal.domain.MetricColumnConfig;
import com.overseas.portal.repository.MetricColumnConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MetricColumnConfigService {

    private final MetricColumnConfigRepository repository;

    /** 설정이 저장된 카테고리 전체 목록 (설정 없는 카테고리는 응답에서 빠짐 -> 프론트가 기본값 사용) */
    @Transactional(readOnly = true)
    public List<MetricColumnConfig> getAllConfigs() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public MetricColumnConfig getConfig(String categoryKey) {
        return repository.findByCategoryKey(categoryKey)
                .orElseThrow(() -> new IllegalArgumentException("해당 카테고리의 설정이 없습니다: " + categoryKey));
    }

    /** 카테고리 컬럼 구성을 통째로 upsert */
    public MetricColumnConfig upsertConfig(String categoryKey, String columnsJson, String updatedBy) {
        MetricColumnConfig config = repository.findByCategoryKey(categoryKey)
                .orElseGet(() -> MetricColumnConfig.builder().categoryKey(categoryKey).build());
        config.setColumnsJson(columnsJson);
        config.setUpdatedBy(updatedBy);
        return repository.save(config);
    }

    /** 카테고리 설정을 삭제해 기본(하드코딩) 컬럼 구성으로 되돌림 */
    public void resetConfig(String categoryKey) {
        repository.findByCategoryKey(categoryKey).ifPresent(repository::delete);
    }
}
