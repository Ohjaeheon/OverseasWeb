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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/business/board")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BusinessBoardController {

    @Value("${app.upload-dir}")
    private String uploadDirRoot;

    private final BusinessBoardPostRepository postRepository;
    private final BusinessBoardAttachmentRepository attachmentRepository;

    public BusinessBoardController(BusinessBoardPostRepository postRepository,
                                   BusinessBoardAttachmentRepository attachmentRepository) {
        this.postRepository = postRepository;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping("/list")
    public ResponseEntity<?> listPosts(@RequestParam("category") String category) {
        try {
            List<BusinessBoardPost> posts = postRepository.findAllByCategoryOrderByNoticeTypeAndCreatedAtDesc(category);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown Error", "details", sw.toString()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPost(@PathVariable("id") Long id) {
        try {
            BusinessBoardPost post = postRepository.findById(id).orElse(null);
            if (post == null) {
                return ResponseEntity.notFound().build();
            }
            post.setViewCount(post.getViewCount() + 1);
            postRepository.save(post);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown Error", "details", sw.toString()));
        }
    }

    @PostMapping("/write")
    public ResponseEntity<?> writePost(
            @RequestParam("category") String category,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("noticeType") String noticeType,
            @RequestParam(value = "proposalFile", required = false) MultipartFile proposalFile,
            @RequestParam(value = "minutesFile", required = false) MultipartFile minutesFile,
            @RequestParam(value = "etcFiles", required = false) List<MultipartFile> etcFiles) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        long maxFileSize = 10 * 1024 * 1024; // 10MB
        if (proposalFile != null && !proposalFile.isEmpty() && proposalFile.getSize() > maxFileSize) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "품의서 파일 크기가 10MB 제한을 초과했습니다."));
        }
        if (minutesFile != null && !minutesFile.isEmpty() && minutesFile.getSize() > maxFileSize) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "회의록 파일 크기가 10MB 제한을 초과했습니다."));
        }
        if (etcFiles != null) {
            for (MultipartFile f : etcFiles) {
                if (f != null && !f.isEmpty() && f.getSize() > maxFileSize) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "기타 파일 중 10MB 제한을 초과하는 파일이 존재합니다."));
                }
            }
        }

        BusinessBoardPost post = BusinessBoardPost.builder()
                .category(category)
                .title(title)
                .content(content)
                .noticeType(noticeType)
                .author(username)
                .viewCount(0)
                .isLocked(false)
                .build();

        if (proposalFile != null && !proposalFile.isEmpty()) {
            try {
                saveAttachmentEntity(post, proposalFile, "PROPOSAL");
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "품의서 저장 중 오류가 발생했습니다: " + e.getMessage()));
            }
        }
        if (minutesFile != null && !minutesFile.isEmpty()) {
            try {
                saveAttachmentEntity(post, minutesFile, "MINUTES");
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "회의록 저장 중 오류가 발생했습니다: " + e.getMessage()));
            }
        }
        if (etcFiles != null) {
            for (MultipartFile f : etcFiles) {
                if (f != null && !f.isEmpty()) {
                    try {
                        saveAttachmentEntity(post, f, "ETC");
                    } catch (IOException e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "기타 파일 저장 중 오류가 발생했습니다: " + e.getMessage()));
                    }
                }
            }
        }

        BusinessBoardPost saved = postRepository.save(post);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/edit")
    public ResponseEntity<?> editPost(
            @PathVariable("id") Long id,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("noticeType") String noticeType,
            @RequestParam(value = "proposalFile", required = false) MultipartFile proposalFile,
            @RequestParam(value = "minutesFile", required = false) MultipartFile minutesFile,
            @RequestParam(value = "etcFiles", required = false) List<MultipartFile> etcFiles,
            @RequestParam(value = "deleteAttachmentIds", required = false) List<Long> deleteAttachmentIds) {

        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));

        // 권한 체크
        if (!post.getAuthor().equals(username) && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "수정 권한이 없습니다."));
        }

        // 잠금 체크
        if (post.getIsLocked() && !isAdmin) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "수정 잠금 상태인 게시글입니다."));
        }

        long maxFileSize = 10 * 1024 * 1024; // 10MB
        if (proposalFile != null && !proposalFile.isEmpty() && proposalFile.getSize() > maxFileSize) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "품의서 파일 크기가 10MB 제한을 초과했습니다."));
        }
        if (minutesFile != null && !minutesFile.isEmpty() && minutesFile.getSize() > maxFileSize) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "회의록 파일 크기가 10MB 제한을 초과했습니다."));
        }
        if (etcFiles != null) {
            for (MultipartFile f : etcFiles) {
                if (f != null && !f.isEmpty() && f.getSize() > maxFileSize) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "기타 파일 중 10MB 제한을 초과하는 파일이 존재합니다."));
                }
            }
        }

        post.setTitle(title);
        post.setContent(content);
        post.setNoticeType(noticeType);

        // 1. Delete requested attachments
        if (deleteAttachmentIds != null) {
            for (Long attId : deleteAttachmentIds) {
                BusinessBoardAttachment toRemove = null;
                for (BusinessBoardAttachment att : post.getAttachments()) {
                    if (att.getId().equals(attId)) {
                        toRemove = att;
                        break;
                    }
                }
                if (toRemove != null) {
                    deletePhysicalFile(toRemove.getFilePath());
                    post.getAttachments().remove(toRemove);
                }
            }
        }

        // 2. Proposal file upload
        if (proposalFile != null && !proposalFile.isEmpty()) {
            BusinessBoardAttachment oldProposal = post.getAttachments().stream()
                    .filter(a -> "PROPOSAL".equals(a.getDocType()))
                    .findFirst().orElse(null);
            if (oldProposal != null) {
                deletePhysicalFile(oldProposal.getFilePath());
                post.getAttachments().remove(oldProposal);
            }
            try {
                saveAttachmentEntity(post, proposalFile, "PROPOSAL");
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "품의서 저장 중 오류가 발생했습니다: " + e.getMessage()));
            }
        }

        // 3. Minutes file upload
        if (minutesFile != null && !minutesFile.isEmpty()) {
            BusinessBoardAttachment oldMinutes = post.getAttachments().stream()
                    .filter(a -> "MINUTES".equals(a.getDocType()))
                    .findFirst().orElse(null);
            if (oldMinutes != null) {
                deletePhysicalFile(oldMinutes.getFilePath());
                post.getAttachments().remove(oldMinutes);
            }
            try {
                saveAttachmentEntity(post, minutesFile, "MINUTES");
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "회의록 저장 중 오류가 발생했습니다: " + e.getMessage()));
            }
        }

        // 4. ETC files upload
        if (etcFiles != null) {
            for (MultipartFile f : etcFiles) {
                if (f != null && !f.isEmpty()) {
                    try {
                        saveAttachmentEntity(post, f, "ETC");
                    } catch (IOException e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "기타 파일 저장 중 오류가 발생했습니다: " + e.getMessage()));
                    }
                }
            }
        }

        BusinessBoardPost saved = postRepository.save(post);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable("id") Long id) {
        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));

        // 권한 체크
        if (!post.getAuthor().equals(username) && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "삭제 권한이 없습니다."));
        }

        // 잠금 체크
        if (post.getIsLocked() && !isAdmin) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "수정 잠금 상태인 게시글입니다."));
        }

        for (BusinessBoardAttachment att : post.getAttachments()) {
            deletePhysicalFile(att.getFilePath());
        }
        postRepository.delete(post);

        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @PostMapping("/{id}/toggle-lock")
    public ResponseEntity<?> toggleLock(@PathVariable("id") Long id) {
        BusinessBoardPost post = postRepository.findById(id).orElse(null);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));

        if (!post.getAuthor().equals(username) && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "잠금 설정 권한이 없습니다."));
        }

        post.setIsLocked(!post.getIsLocked());
        postRepository.save(post);

        return ResponseEntity.ok(post);
    }    @GetMapping("/attachment/{attachmentId}/download")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> downloadAttachment(@PathVariable("attachmentId") Long attachmentId) {
        try {
            BusinessBoardAttachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
            if (attachment == null) {
                return ResponseEntity.notFound().build();
            }

            BusinessBoardPost post = attachment.getPost();

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));

            if (post != null && !post.getAuthor().equals(username) && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "다운로드 권한이 없습니다. (작성자 및 관리자만 가능)"));
            }

            Path filePath = Paths.get(attachment.getFilePath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("파일을 서버 디스크에서 찾을 수 없습니다.");
            }

            Resource resource = new FileSystemResource(filePath.toFile());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            String encodedFileName = java.net.URLEncoder.encode(attachment.getFileName(), "UTF-8").replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown Error", "details", sw.toString()));
        }
    }
    private void saveAttachmentEntity(BusinessBoardPost post, MultipartFile file, String docType) throws IOException {
        String category = post.getCategory();
        Path targetDir = Paths.get(uploadDirRoot, "board", category);
        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir);
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isEmpty()) {
            originalFileName = "unnamed_file";
        }

        String uuidFileName = UUID.randomUUID().toString() + "_" + originalFileName;
        Path targetFilePath = targetDir.resolve(uuidFileName);
        file.transferTo(targetFilePath.toFile());

        BusinessBoardAttachment attachment = BusinessBoardAttachment.builder()
                .post(post)
                .docType(docType)
                .fileName(originalFileName)
                .filePath(targetFilePath.toString())
                .fileSize(file.getSize())
                .build();

        post.getAttachments().add(attachment);
    }

    private void deletePhysicalFile(String filePathString) {
        if (filePathString != null) {
            try {
                Path filePath = Paths.get(filePathString);
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
