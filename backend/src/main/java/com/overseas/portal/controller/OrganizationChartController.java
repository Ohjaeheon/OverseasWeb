package com.overseas.portal.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.OrganizationChart;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.OrganizationChartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.Optional;

/**
 * 해외교회 조직도 API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/organization")
@RequiredArgsConstructor
@Slf4j
public class OrganizationChartController {

    private final OrganizationChartRepository organizationChartRepository;
    private final ChurchRepository churchRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/{churchId}")
    public ResponseEntity<OrganizationChart> getChart(@PathVariable("churchId") Long churchId) {
        Optional<OrganizationChart> chartOpt = organizationChartRepository.findById(churchId);
        if (chartOpt.isPresent()) {
            return ResponseEntity.ok(chartOpt.get());
        } else {
            // Return an empty template instead of 404
            OrganizationChart emptyChart = OrganizationChart.builder()
                    .churchId(churchId)
                    .chartData("")
                    .updatedAt(ZonedDateTime.now())
                    .build();
            return ResponseEntity.ok(emptyChart);
        }
    }

    @PutMapping("/{churchId}")
    public ResponseEntity<OrganizationChart> saveChart(
            @PathVariable("churchId") Long churchId,
            @RequestBody OrganizationChart request) {
        
        OrganizationChart chart = organizationChartRepository.findById(churchId)
                .orElse(OrganizationChart.builder().churchId(churchId).build());
        
        chart.setChartData(request.getChartData());
        chart.setUpdatedAt(ZonedDateTime.now());
        
        OrganizationChart saved = organizationChartRepository.save(chart);
        log.info("Saved organization chart for churchId: {}", churchId);

        // 조직도 저장 시, 담임사역자(leaderCard.name) 이름을 churches 테이블의 leaderName 칼럼과 동기화
        try {
            String chartDataStr = request.getChartData();
            if (chartDataStr != null && !chartDataStr.isEmpty()) {
                JsonNode rootNode = objectMapper.readTree(chartDataStr);
                JsonNode leaderCardNode = rootNode.get("leaderCard");
                if (leaderCardNode != null) {
                    JsonNode nameNode = leaderCardNode.get("name");
                    if (nameNode != null) {
                        String newLeaderName = nameNode.asText();
                        churchRepository.findById(churchId).ifPresent(church -> {
                            church.setLeaderName(newLeaderName);
                            churchRepository.save(church);
                            log.info("Synchronized church leader name: {} to {}", churchId, newLeaderName);
                        });
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse chartData to sync leader name: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(saved);
    }
}
