package com.overseas.portal.repository;

import com.overseas.portal.domain.I18nDictionary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface I18nDictionaryRepository extends JpaRepository<I18nDictionary, Long>, JpaSpecificationExecutor<I18nDictionary> {
    List<I18nDictionary> findByLangCode(String langCode);
    List<I18nDictionary> findByLangCodeAndUseYn(String langCode, String useYn);
    Optional<I18nDictionary> findByMessageKeyAndLangCode(String messageKey, String langCode);
}
