package com.overseas.portal.controller;

import com.overseas.portal.domain.I18nDictionary;
import com.overseas.portal.service.I18nService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class I18nController {

    private final I18nService i18nService;

    @GetMapping("/api/v1/i18n/{lang}")
    public ResponseEntity<Map<String, String>> getTranslations(@PathVariable("lang") String lang) {
        return ResponseEntity.ok(i18nService.getTranslationsByLang(lang));
    }

    // =============================================
    // 메시지 관리 (Admin)
    // =============================================

    @GetMapping("/api/v1/admin/messages")
    public ResponseEntity<Page<I18nDictionary>> searchMessages(
            @RequestParam(name = "messageKey", required = false) String messageKey,
            @RequestParam(name = "langCode", required = false) String langCode,
            @RequestParam(name = "messageValue", required = false) String messageValue,
            @RequestParam(name = "useYn", required = false) String useYn,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "25") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ResponseEntity.ok(i18nService.searchMessages(messageKey, langCode, messageValue, useYn, pageRequest));
    }

    @Data
    public static class MessageUpsertRequest {
        private String messageKey;
        private String langCode;
        private String messageValue;
        private String category;
        private String useYn;
        private String updatedBy;
    }

    @PostMapping("/api/v1/admin/messages")
    public ResponseEntity<I18nDictionary> createMessage(@RequestBody MessageUpsertRequest request) {
        I18nDictionary saved = i18nService.createMessage(
                request.getMessageKey(), request.getLangCode(), request.getMessageValue(),
                request.getCategory(), request.getUseYn(), request.getUpdatedBy());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/api/v1/admin/messages/{dictId}")
    public ResponseEntity<I18nDictionary> updateMessage(
            @PathVariable("dictId") Long dictId,
            @RequestBody MessageUpsertRequest request) {
        I18nDictionary saved = i18nService.updateMessage(
                dictId, request.getMessageValue(), request.getCategory(), request.getUseYn(), request.getUpdatedBy());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/api/v1/admin/messages/{dictId}")
    public ResponseEntity<Void> deleteMessage(@PathVariable("dictId") Long dictId) {
        i18nService.deleteMessage(dictId);
        return ResponseEntity.noContent().build();
    }
}
