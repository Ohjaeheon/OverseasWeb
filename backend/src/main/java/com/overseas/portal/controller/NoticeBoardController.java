package com.overseas.portal.controller;

import com.overseas.portal.domain.BusinessBoardAttachment;
import com.overseas.portal.domain.BusinessBoardPost;
import com.overseas.portal.repository.BusinessBoardAttachmentRepository;
import com.overseas.portal.repository.BusinessBoardPostRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 게시판 > 공지사항 API. 품의서/회의록 게시판과 동일한 통합 게시판 테이블
 * (BusinessBoardPost/BusinessBoardAttachment)을 category="공지사항"으로 공유해서 재사용한다.
 * 다만 공지사항은 참조인 개념 없이 로그인한 모든 사용자에게 공개되고,
 * 작성/수정/삭제는 관리자만 할 수 있다.
 */
@RestController
@RequestMapping("/api/v1/notices")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class NoticeBoardController {

    private static final String CATEGORY = "공지사항";

    @Value("${app.upload-dir}")
    private String uploadDirRoot;

    private final BusinessBoardPostRepository postRepository;
    private final BusinessBoardAttachmentRepository attachmentRepository;

    public NoticeBoardController(BusinessBoardPostRepository postRepository,
                                  BusinessBoardAttachmentRepository attachmentRepository) {
        this.postRepository = postRepository;
        this.attachmentRepository = attachmentRepository;
    }

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));
    }

    @GetMapping
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> list() {
        List<BusinessBoardPost> posts = postRepository.findAllByCategoryForAdmin(CATEGORY);
        List<Map<String, Object>> mapped = new ArrayList<>();
        for (BusinessBoardPost p : posts) mapped.add(toMap(p));
        return ResponseEntity.ok(mapped);
    }

    @GetMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> get(@PathVariable("id") Long id) {
        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null || !CATEGORY.equals(post.getCategory())) return ResponseEntity.notFound().build();
        post.setViewCount(post.getViewCount() + 1);
        BusinessBoardPost saved = postRepository.save(post);
        return ResponseEntity.ok(toMap(saved));
    }

    @PostMapping("/write")
    public ResponseEntity<?> write(
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("noticeType") String noticeType,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "공지사항 작성 권한이 없습니다."));
        }
        String username = auth.getName();

        BusinessBoardPost post = BusinessBoardPost.builder()
                .category(CATEGORY).title(title).content(content).noticeType(noticeType)
                .author(username).viewCount(0).isLocked(false).build();

        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    try {
                        saveAttachment(post, f);
                    } catch (IOException e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "첨부파일 저장 중 오류가 발생했습니다: " + e.getMessage()));
                    }
                }
            }
        }
        return ResponseEntity.ok(toMap(postRepository.save(post)));
    }

    @PostMapping("/{id}/edit")
    public ResponseEntity<?> edit(
            @PathVariable("id") Long id,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("noticeType") String noticeType,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "deleteAttachmentIds", required = false) List<Long> deleteAttachmentIds) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "공지사항 수정 권한이 없습니다."));
        }
        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null || !CATEGORY.equals(post.getCategory())) return ResponseEntity.notFound().build();

        post.setTitle(title);
        post.setContent(content);
        post.setNoticeType(noticeType);

        if (deleteAttachmentIds != null) {
            List<BusinessBoardAttachment> toRemove = new ArrayList<>();
            for (BusinessBoardAttachment att : post.getAttachments()) {
                if (deleteAttachmentIds.contains(att.getId())) toRemove.add(att);
            }
            for (BusinessBoardAttachment att : toRemove) {
                deletePhysicalFile(att.getFilePath());
                post.getAttachments().remove(att);
            }
        }
        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    try {
                        saveAttachment(post, f);
                    } catch (IOException e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "첨부파일 저장 중 오류가 발생했습니다: " + e.getMessage()));
                    }
                }
            }
        }
        return ResponseEntity.ok(toMap(postRepository.save(post)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable("id") Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "공지사항 삭제 권한이 없습니다."));
        }
        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null || !CATEGORY.equals(post.getCategory())) return ResponseEntity.notFound().build();
        for (BusinessBoardAttachment att : post.getAttachments()) deletePhysicalFile(att.getFilePath());
        postRepository.delete(post);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @GetMapping("/attachment/{attachmentId}/download")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> download(@PathVariable("attachmentId") Long attachmentId) {
        try {
            BusinessBoardAttachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
            if (attachment == null || attachment.getPost() == null || !CATEGORY.equals(attachment.getPost().getCategory())) {
                return ResponseEntity.notFound().build();
            }
            Path filePath = Paths.get(attachment.getFilePath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("파일을 서버 디스크에서 찾을 수 없습니다.");
            }

            Resource resource = new FileSystemResource(filePath.toFile());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = "application/octet-stream";
            String encodedFileName = java.net.URLEncoder.encode(attachment.getFileName(), "UTF-8").replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown Error"));
        }
    }

    private void saveAttachment(BusinessBoardPost post, MultipartFile file) throws IOException {
        Path targetDir = Paths.get(uploadDirRoot, "board", CATEGORY);
        if (!Files.exists(targetDir)) Files.createDirectories(targetDir);

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isEmpty()) originalFileName = "unnamed_file";

        String uuidFileName = UUID.randomUUID() + "_" + originalFileName;
        Path targetFilePath = targetDir.resolve(uuidFileName);
        file.transferTo(targetFilePath.toFile());

        post.getAttachments().add(BusinessBoardAttachment.builder()
                .post(post).docType("ETC").fileName(originalFileName)
                .filePath(targetFilePath.toString()).fileSize(file.getSize()).build());
    }

    private void deletePhysicalFile(String filePathString) {
        if (filePathString == null) return;
        try {
            Files.deleteIfExists(Paths.get(filePathString));
        } catch (IOException ignored) { /* best-effort cleanup */ }
    }

    private Map<String, Object> toMap(BusinessBoardPost p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId());
        map.put("title", p.getTitle());
        map.put("content", p.getContent());
        map.put("author", p.getAuthor());
        map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        map.put("viewCount", p.getViewCount());
        map.put("noticeType", p.getNoticeType());

        List<Map<String, Object>> atts = new ArrayList<>();
        if (p.getAttachments() != null) {
            for (BusinessBoardAttachment att : p.getAttachments()) {
                Map<String, Object> a = new HashMap<>();
                a.put("id", att.getId());
                a.put("fileName", att.getFileName());
                a.put("fileSize", att.getFileSize());
                atts.add(a);
            }
        }
        map.put("attachments", atts);
        return map;
    }
}
