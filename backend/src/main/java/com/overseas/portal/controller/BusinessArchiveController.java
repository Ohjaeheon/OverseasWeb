package com.overseas.portal.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/business/archive")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BusinessArchiveController {

    @Value("${app.upload-dir}")
    private String uploadDirRoot;

    @org.springframework.beans.factory.annotation.Autowired
    private com.overseas.portal.service.FileLogService fileLogService;

    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> listFiles(
            @RequestParam("category") String category,
            @RequestParam("year") String year) {
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            Path categoryYearPath = Paths.get(uploadDirRoot, category, year);
            if (!Files.exists(categoryYearPath)) {
                return ResponseEntity.ok(result);
            }
            
            // Loop through months 1 to 12
            for (int month = 1; month <= 12; month++) {
                String monthStr = String.format("%02d", month);
                Path monthPath = categoryYearPath.resolve(monthStr);
                
                Map<String, Object> monthData = new HashMap<>();
                monthData.put("proposal", null);
                monthData.put("minutes", null);
                monthData.put("etc", new ArrayList<Map<String, Object>>());
                
                if (Files.exists(monthPath)) {
                    // 1. Check Proposal subfolder
                    Path proposalDir = monthPath.resolve("proposal");
                    if (Files.exists(proposalDir)) {
                        File[] files = proposalDir.toFile().listFiles();
                        if (files != null && files.length > 0) {
                            monthData.put("proposal", getFileInfoMap(files[0]));
                        }
                    }
                    
                    // 2. Check Minutes subfolder
                    Path minutesDir = monthPath.resolve("minutes");
                    if (Files.exists(minutesDir)) {
                        File[] files = minutesDir.toFile().listFiles();
                        if (files != null && files.length > 0) {
                            monthData.put("minutes", getFileInfoMap(files[0]));
                        }
                    }
                    
                    // 3. Check ETC subfolder
                    Path etcDir = monthPath.resolve("etc");
                    if (Files.exists(etcDir)) {
                        File[] files = etcDir.toFile().listFiles();
                        if (files != null) {
                            List<Map<String, Object>> etcList = Arrays.stream(files)
                                    .map(this::getFileInfoMap)
                                    .collect(Collectors.toList());
                            monthData.put("etc", etcList);
                        }
                    }
                }
                
                result.put(String.valueOf(month), monthData);
            }
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("category") String category,
            @RequestParam("year") String year,
            @RequestParam("month") Integer month,
            @RequestParam("docType") String docType,
            @RequestParam("file") MultipartFile file,
            jakarta.servlet.http.HttpServletRequest request) {
        
        try {
            String monthStr = String.format("%02d", month);
            Path targetDir = Paths.get(uploadDirRoot, category, year, monthStr, docType);
            
            // Create directory if not exists
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            
            // For proposal and minutes, we only keep a single file. Delete existing files.
            if ("proposal".equals(docType) || "minutes".equals(docType)) {
                File[] existingFiles = targetDir.toFile().listFiles();
                if (existingFiles != null) {
                    for (File f : existingFiles) {
                        f.delete();
                    }
                }
            }
            
            String originalFileName = file.getOriginalFilename();
            if (originalFileName == null || originalFileName.isEmpty()) {
                originalFileName = "unnamed_file";
            }
            
            Path targetFilePath = targetDir.resolve(originalFileName);
            file.transferTo(targetFilePath.toFile());
            
            // 업로드 로그 기록
            try {
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                String ip = getClientIp(request);
                fileLogService.logUpload(username, originalFileName, file.getSize(), ip);
            } catch (Exception ex) {
                ex.printStackTrace();
            }

            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("fileName", originalFileName);
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Map<String, String>> deleteFile(
            @RequestParam("category") String category,
            @RequestParam("year") String year,
            @RequestParam("month") Integer month,
            @RequestParam("docType") String docType,
            @RequestParam("fileName") String fileName) {
        
        try {
            String monthStr = String.format("%02d", month);
            Path filePath = Paths.get(uploadDirRoot, category, year, monthStr, docType, fileName);
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                return ResponseEntity.ok(Map.of("status", "success"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "File not found"));
            }
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(
            @RequestParam("category") String category,
            @RequestParam("year") String year,
            @RequestParam("month") Integer month,
            @RequestParam("docType") String docType,
            @RequestParam("fileName") String fileName,
            jakarta.servlet.http.HttpServletRequest request) {
        
        try {
            String monthStr = String.format("%02d", month);
            Path filePath = Paths.get(uploadDirRoot, category, year, monthStr, docType, fileName);
            
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            
            Resource resource = new FileSystemResource(filePath.toFile());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }
            
            // Encode filename to prevent broken Korean characters
            String encodedFileName = java.net.URLEncoder.encode(fileName, "UTF-8").replaceAll("\\+", "%20");
            
            // 다운로드 로그 기록
            try {
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                String ip = getClientIp(request);
                fileLogService.logDownload(username, fileName, ip);
            } catch (Exception ex) {
                ex.printStackTrace();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
                    
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Map<String, Object> getFileInfoMap(File file) {
        Map<String, Object> fileInfo = new HashMap<>();
        fileInfo.put("name", file.getName());
        fileInfo.put("size", file.length());
        
        String type = "application/octet-stream";
        try {
            String probed = Files.probeContentType(file.toPath());
            if (probed != null) {
                type = probed;
            } else {
                // Fallbacks for common Office extension types probe fails
                String nameLower = file.getName().toLowerCase();
                if (nameLower.endsWith(".docx")) {
                    type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                } else if (nameLower.endsWith(".xlsx")) {
                    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                } else if (nameLower.endsWith(".pdf")) {
                    type = "application/pdf";
                } else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) {
                    type = "image/jpeg";
                } else if (nameLower.endsWith(".png")) {
                    type = "image/png";
                }
            }
        } catch (IOException e) {
            // ignore
        }
        
        fileInfo.put("type", type);
        // We do not send base64 data here! The frontend will query data dynamically when downloading/previewing.
        return fileInfo;
    }

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }
        return ip;
    }
}
