package com.overseas.portal.service;

import com.overseas.portal.domain.CountryFlag;
import com.overseas.portal.repository.CountryFlagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CountryFlagService {

    private final CountryFlagRepository repository;

    @Transactional(readOnly = true)
    public Map<String, String> getAll() {
        return repository.findAll().stream()
                .collect(Collectors.toMap(CountryFlag::getCountry, CountryFlag::getImageDataUrl));
    }

    @Transactional
    public void upsert(String country, String imageDataUrl, String username) {
        CountryFlag flag = repository.findById(country)
                .orElseGet(() -> CountryFlag.builder().country(country).build());
        flag.setImageDataUrl(imageDataUrl);
        flag.setUpdatedBy(username);
        repository.save(flag);
    }

    @Transactional
    public void delete(String country) {
        repository.deleteById(country);
    }
}
