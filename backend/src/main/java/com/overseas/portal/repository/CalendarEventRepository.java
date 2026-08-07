package com.overseas.portal.repository;

import com.overseas.portal.domain.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    @Query("SELECT e FROM CalendarEvent e WHERE e.calendars LIKE %:calendarType%")
    List<CalendarEvent> findByCalendarType(@Param("calendarType") String calendarType);
}
