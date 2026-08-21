package com.overseas.portal.service;

import com.overseas.portal.domain.I18nDictionary;
import com.overseas.portal.repository.I18nDictionaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class I18nService {

    private final I18nDictionaryRepository dictionaryRepository;

    public Map<String, String> getTranslationsByLang(String langCode) {
        return dictionaryRepository.findByLangCodeAndUseYn(langCode, "Y")
                .stream()
                .collect(Collectors.toMap(I18nDictionary::getMessageKey, I18nDictionary::getMessageValue, (v1, v2) -> v1));
    }

    public Page<I18nDictionary> searchMessages(String messageKey, String langCode, String messageValue, String useYn, Pageable pageable) {
        String key = blankToNull(messageKey);
        String lang = blankToNull(langCode);
        String value = blankToNull(messageValue);
        String use = blankToNull(useYn);

        // Postgres에서 null 파라미터를 LOWER()/LIKE에 그대로 바인딩하면 타입 추론에 실패한다
        // ("lower(bytea) 함수가 없음") — JPQL의 "IS NULL OR ..." 패턴 대신 조건이 있을 때만
        // Specification을 추가해 아예 해당 술어를 쿼리에서 빼는 방식으로 우회한다.
        Specification<I18nDictionary> spec = Specification.where(null);
        if (key != null) {
            String likeKey = "%" + key.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("messageKey")), likeKey));
        }
        if (lang != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("langCode"), lang));
        }
        if (value != null) {
            String likeValue = "%" + value.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("messageValue")), likeValue));
        }
        if (use != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("useYn"), use));
        }
        return dictionaryRepository.findAll(spec, pageable);
    }

    public I18nDictionary createMessage(String messageKey, String langCode, String messageValue, String category, String useYn, String updatedBy) {
        if (dictionaryRepository.findByMessageKeyAndLangCode(messageKey, langCode).isPresent()) {
            throw new IllegalStateException("이미 등록된 메시지 코드/언어 조합입니다: " + messageKey + " / " + langCode);
        }
        I18nDictionary entity = I18nDictionary.builder()
                .messageKey(messageKey)
                .langCode(langCode)
                .messageValue(messageValue)
                .category(category != null && !category.isBlank() ? category : "GENERAL")
                .useYn(useYn != null && !useYn.isBlank() ? useYn : "Y")
                .updatedBy(updatedBy)
                .build();
        return dictionaryRepository.save(entity);
    }

    public I18nDictionary updateMessage(Long dictId, String messageValue, String category, String useYn, String updatedBy) {
        I18nDictionary entity = dictionaryRepository.findById(dictId)
                .orElseThrow(() -> new IllegalArgumentException("메시지를 찾을 수 없습니다: " + dictId));
        entity.setMessageValue(messageValue);
        if (category != null && !category.isBlank()) entity.setCategory(category);
        if (useYn != null && !useYn.isBlank()) entity.setUseYn(useYn);
        entity.setUpdatedBy(updatedBy);
        return dictionaryRepository.save(entity);
    }

    public void deleteMessage(Long dictId) {
        if (!dictionaryRepository.existsById(dictId)) {
            throw new IllegalArgumentException("메시지를 찾을 수 없습니다: " + dictId);
        }
        dictionaryRepository.deleteById(dictId);
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
