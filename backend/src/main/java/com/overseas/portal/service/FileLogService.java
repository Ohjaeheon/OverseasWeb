package com.overseas.portal.service;

import com.overseas.portal.domain.FileDownloadLog;
import com.overseas.portal.domain.FileUploadLog;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.FileDownloadLogRepository;
import com.overseas.portal.repository.FileUploadLogRepository;
import com.overseas.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FileLogService {

    private final FileUploadLogRepository fileUploadLogRepository;
    private final FileDownloadLogRepository fileDownloadLogRepository;
    private final UserRepository userRepository;

    /**
     * 파일 업로드 로그 저장
     */
    public void logUpload(String username, String fileName, long fileSize, String ipAddress) {
        String name = "GUEST";
        String cleanUsername = username;
        if (username != null && !username.equals("anonymousUser") && !username.isEmpty()) {
            name = userRepository.findByUsername(username)
                    .map(User::getName)
                    .orElse(username);
        } else {
            cleanUsername = "guest";
        }

        FileUploadLog uploadLog = FileUploadLog.builder()
                .username(cleanUsername)
                .name(name)
                .fileName(fileName)
                .fileSize(fileSize)
                .ipAddress(ipAddress)
                .createdAt(ZonedDateTime.now())
                .build();

        fileUploadLogRepository.save(uploadLog);
        log.info("Saved file upload log: User={}, File={}, Size={}", cleanUsername, fileName, fileSize);
    }

    /**
     * 파일 다운로드 로그 저장
     */
    public void logDownload(String username, String fileName, String ipAddress) {
        String name = "GUEST";
        String cleanUsername = username;
        if (username != null && !username.equals("anonymousUser") && !username.isEmpty()) {
            name = userRepository.findByUsername(username)
                    .map(User::getName)
                    .orElse(username);
        } else {
            cleanUsername = "guest";
        }

        FileDownloadLog downloadLog = FileDownloadLog.builder()
                .username(cleanUsername)
                .name(name)
                .fileName(fileName)
                .ipAddress(ipAddress)
                .createdAt(ZonedDateTime.now())
                .build();

        fileDownloadLogRepository.save(downloadLog);
        log.info("Saved file download log: User={}, File={}", cleanUsername, fileName);
    }

    /**
     * 업로드 로그 조회 (검색 필터 포함)
     */
    @Transactional(readOnly = true)
    public List<FileUploadLog> getFileUploadLogs(String query) {
        return fileUploadLogRepository.findAllByQuery(query);
    }

    /**
     * 다운로드 로그 조회 (검색 필터 포함)
     */
    @Transactional(readOnly = true)
    public List<FileDownloadLog> getFileDownloadLogs(String query) {
        return fileDownloadLogRepository.findAllByQuery(query);
    }

    /**
     * 업로드 로그 전체 비우기
     */
    public void clearFileUploadLogs() {
        fileUploadLogRepository.deleteAllInBatch();
        log.warn("Cleared all file upload logs");
    }

    /**
     * 다운로드 로그 전체 비우기
     */
    public void clearFileDownloadLogs() {
        fileDownloadLogRepository.deleteAllInBatch();
        log.warn("Cleared all file download logs");
    }
}
