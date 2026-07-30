package com.overseas.portal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OverseasPortalApplication {

    public static void main(String[] args) {
        SpringApplication.run(OverseasPortalApplication.class, args);
    }
}
