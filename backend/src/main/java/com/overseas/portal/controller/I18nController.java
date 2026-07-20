package com.overseas.portal.controller;

import com.overseas.portal.service.I18nService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/i18n")
@RequiredArgsConstructor
public class I18nController {

    private final I18nService i18nService;

    @GetMapping("/{lang}")
    public ResponseEntity<Map<String, String>> getTranslations(@PathVariable("lang") String lang) {
        return ResponseEntity.ok(i18nService.getTranslationsByLang(lang));
    }
}
