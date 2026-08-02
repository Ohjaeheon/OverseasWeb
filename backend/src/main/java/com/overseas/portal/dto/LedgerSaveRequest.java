package com.overseas.portal.dto;

import lombok.Data;
import java.util.List;

@Data
public class LedgerSaveRequest {
    private Integer year;
    private Integer month;
    private String reportDate;
    private String draftUser;
    private String expenseDate;
    private String meetingDate;
    private List<CountryAmount> countries;

    @Data
    public static class CountryAmount {
        private String name;
        private Long amount;
    }
}
