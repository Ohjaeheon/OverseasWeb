package com.overseas.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.CalendarEvent;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.CalendarEventRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.security.EncryptionUtil;
import com.overseas.portal.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalendarEventController {

    private final CalendarEventRepository calendarEventRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final ObjectMapper objectMapper;

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("인증 토큰이 누락되었습니다.");
        }
        String token = authHeader.replace("Bearer ", "");
        if (!tokenProvider.validateToken(token)) {
            throw new IllegalArgumentException("인증 토큰이 유효하지 않습니다.");
        }
        String username = tokenProvider.getUsernameFromToken(token);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));
    }

    private ResponseEntity<Map<String, Object>> encryptResponse(Object data) {
        Map<String, Object> response = new HashMap<>();
        try {
            String json = objectMapper.writeValueAsString(data);
            String encrypted = EncryptionUtil.encrypt(json);
            response.put("encryptedData", encrypted);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Response encryption failed", e);
            response.put("error", "Encryption failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/events")
    public ResponseEntity<Map<String, Object>> getEvents(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(name = "type", defaultValue = "MAIN") String type) {

        log.info("Fetching calendar events for type: {}", type);
        User user = getAuthenticatedUser(authHeader);
        String username = user.getUsername();
        String role = user.getRole();
        boolean isAdmin = role.equals("ROLE_ADMIN") || role.equals("ADMIN") || role.equals("관리자") || role.equals("ROLE_관리자");

        List<CalendarEvent> allEvents = calendarEventRepository.findByCalendarType(type);
        List<CalendarEvent> visibleEvents = new ArrayList<>();

        for (CalendarEvent event : allEvents) {
            // Creator can see everything they created
            if (event.getCreatorUsername().equals(username)) {
                visibleEvents.add(event);
                continue;
            }
            String refs = event.getReferencedUsernames();
            if (refs == null || refs.trim().isEmpty()) {
                continue;
            }
            // If referenced, user can see it
            List<String> refList = Arrays.asList(refs.split(","));
            if (refList.contains(username)) {
                visibleEvents.add(event);
            }
        }

        return encryptResponse(visibleEvents);
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> createEvent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CalendarEvent event) {

        log.info("Creating calendar event: {}", event.getTitle());
        User user = getAuthenticatedUser(authHeader);

        event.setCreatorUsername(user.getUsername());
        event.setCreatorName(user.getName());

        CalendarEvent saved = calendarEventRepository.save(event);
        return encryptResponse(saved);
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<Map<String, Object>> updateEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody CalendarEvent eventDetails) {

        log.info("Updating calendar event ID: {}", id);
        User user = getAuthenticatedUser(authHeader);
        String role = user.getRole();
        boolean isAdmin = role.equals("ROLE_ADMIN") || role.equals("ADMIN") || role.equals("관리자") || role.equals("ROLE_관리자");

        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("일정을 찾을 수 없습니다. ID: " + id));

        // Only creator or admin can update
        if (!isAdmin && !event.getCreatorUsername().equals(user.getUsername())) {
            return ResponseEntity.status(403).body(Map.of("error", "일정을 수정할 권한이 없습니다."));
        }

        event.setTitle(eventDetails.getTitle());
        event.setDescription(eventDetails.getDescription());
        event.setStartDate(eventDetails.getStartDate());
        event.setEndDate(eventDetails.getEndDate());
        event.setReferencedUsernames(eventDetails.getReferencedUsernames());
        event.setCalendars(eventDetails.getCalendars());

        CalendarEvent updated = calendarEventRepository.save(event);
        return encryptResponse(updated);
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id) {

        log.info("Deleting calendar event ID: {}", id);
        User user = getAuthenticatedUser(authHeader);
        String role = user.getRole();
        boolean isAdmin = role.equals("ROLE_ADMIN") || role.equals("ADMIN") || role.equals("관리자") || role.equals("ROLE_관리자");

        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("일정을 찾을 수 없습니다. ID: " + id));

        // Only creator or admin can delete
        if (!isAdmin && !event.getCreatorUsername().equals(user.getUsername())) {
            return ResponseEntity.status(403).body(Map.of("error", "일정을 삭제할 권한이 없습니다."));
        }

        calendarEventRepository.delete(event);
        return ResponseEntity.ok().build();
    }
}
