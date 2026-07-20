package com.overseas.portal.service;

import com.overseas.portal.domain.I18nDictionary;
import com.overseas.portal.repository.I18nDictionaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class I18nService {

    private final I18nDictionaryRepository dictionaryRepository;

    public Map<String, String> getTranslationsByLang(String langCode) {
        return dictionaryRepository.findByLangCode(langCode)
                .stream()
                .collect(Collectors.toMap(I18nDictionary::getMessageKey, I18nDictionary::getMessageValue, (v1, v2) -> v1));
    }
}
