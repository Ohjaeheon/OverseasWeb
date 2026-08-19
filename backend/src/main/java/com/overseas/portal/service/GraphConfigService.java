package com.overseas.portal.service;

import com.overseas.portal.domain.GraphConfig;
import com.overseas.portal.repository.GraphConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GraphConfigService {

    private final GraphConfigRepository repository;

    /** 설정이 저장된 카테고리 전체 목록 (설정 없는 카테고리는 응답에서 빠짐 -> 프론트가 빈 목록으로 처리) */
    @Transactional(readOnly = true)
    public List<GraphConfig> getAllConfigs() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public GraphConfig getConfig(String categoryKey) {
        return repository.findByCategoryKey(categoryKey)
                .orElseThrow(() -> new IllegalArgumentException("해당 카테고리의 그래프 설정이 없습니다: " + categoryKey));
    }

    /** 카테고리 그래프 구성을 통째로 upsert */
    public GraphConfig upsertConfig(String categoryKey, String graphsJson, String updatedBy) {
        GraphConfig config = repository.findByCategoryKey(categoryKey)
                .orElseGet(() -> GraphConfig.builder().categoryKey(categoryKey).build());
        config.setGraphsJson(graphsJson);
        config.setUpdatedBy(updatedBy);
        return repository.save(config);
    }

    /** 카테고리 설정을 삭제해 빈 상태로 되돌림 */
    public void resetConfig(String categoryKey) {
        repository.findByCategoryKey(categoryKey).ifPresent(repository::delete);
    }
}
