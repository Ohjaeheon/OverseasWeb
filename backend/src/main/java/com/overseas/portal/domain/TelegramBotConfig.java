package com.overseas.portal.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelegramBotConfig {
    private String botId;
    private String name;
    private String botToken;
    private String botUsername;
    private Boolean isActive;
    private String description;
}
