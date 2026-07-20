package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 월별 신앙프로세스 및 교회 진단 기록 엔티티
 */
@Entity
@Table(name = "faith_process_records", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_church_year_month", columnNames = {"church_id", "year_month"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("월별 신앙프로세스 및 교회 진단서 기록 테이블")
public class FaithProcessRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    @Comment("진단 기록 고유 PK")
    private Long recordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "church_id", nullable = false)
    @Comment("해당 교회 FK")
    private Church church;

    @Column(name = "year_month", nullable = false, length = 7)
    @Comment("진단 연월 (형식: YYYY-MM)")
    private String yearMonth;

    // ① 전도 지표
    @Column(name = "evang_reg")
    @Comment("전도재적 (예배 출결재적 연동)")
    private Integer evangReg;

    @Column(name = "bible_month_reg")
    @Comment("월등록 (동행/복음방 신규 등록 수)")
    private Integer bibleMonthReg;

    @Column(name = "bible_cum_reg")
    @Comment("누적등록수 (동행/복음방 누적)")
    private Integer bibleCumReg;

    @Column(name = "bible_cur_att")
    @Comment("현재출석수 (동행/복음방 현재 출석)")
    private Integer bibleCurAtt;

    // ② 센터 지표
    @Column(name = "center_month_on")
    @Comment("선교센터 대면 월등록수")
    private Integer centerMonthOn;

    @Column(name = "center_month_off")
    @Comment("선교센터 비대면 월등록수")
    private Integer centerMonthOff;

    @Column(name = "center_month_total")
    @Comment("선교센터 월등록수 총계")
    private Integer centerMonthTotal;

    @Column(name = "center_cum_on")
    @Comment("선교센터 누적 대면 등록수")
    private Integer centerCumOn;

    @Column(name = "center_cum_off")
    @Comment("선교센터 누적 비대면 등록수")
    private Integer centerCumOff;

    @Column(name = "center_cum_reg")
    @Comment("선교센터 누적 등록수 총계")
    private Integer centerCumReg;

    @Column(name = "center_month_grad")
    @Comment("선교센터 월종강수")
    private Integer centerMonthGrad;

    @Column(name = "center_tot_month_reg")
    @Comment("선교센터 총등록자 수")
    private Integer centerTotMonthReg;

    @Column(name = "center_cum_grad")
    @Comment("선교센터 누적 종강수")
    private Integer centerCumGrad;

    @Column(name = "center_att_elem")
    @Comment("선교센터 초등 출석수")
    private Integer centerAttElem;

    @Column(name = "center_att_mid")
    @Comment("선교센터 중등 출석수")
    private Integer centerAttMid;

    @Column(name = "center_att_high")
    @Comment("선교센터 고등 출석수")
    private Integer centerAttHigh;

    // ③ 내무 / 교적 지표
    @Column(name = "registered")
    @Comment("교회 현재적 (전성도 재적)")
    private Integer registered;

    @Column(name = "year_start_reg")
    @Comment("연초 재적수")
    private Integer yearStartReg;

    @Column(name = "reg_change")
    @Comment("재적 증가수")
    private Integer regChange;

    @Column(name = "new_admit")
    @Comment("당월 입교자 수")
    private Integer newAdmit;

    @Column(name = "cum_new_admit")
    @Comment("누적 입교자 수")
    private Integer cumNewAdmit;

    @Column(name = "discipline")
    @Comment("사고 (징계/제적) 수")
    private Integer discipline;

    @Column(name = "cum_discipline")
    @Comment("누적 사고 수")
    private Integer cumDiscipline;

    @Column(name = "move_in")
    @Comment("전입 수")
    private Integer moveIn;

    @Column(name = "move_out")
    @Comment("전출 수")
    private Integer moveOut;

    @Column(name = "trans_in")
    @Comment("이동전입 수")
    private Integer transIn;

    @Column(name = "trans_out")
    @Comment("이동전출 수")
    private Integer transOut;

    @Column(name = "dup_reg")
    @Comment("중복등록 정치 수")
    private Integer dupReg;

    @Column(name = "prev_new_admit_cnt")
    @Comment("전월 입교자 수")
    private Integer prevNewAdmitCnt;

    // ④ 예배 지표
    @Column(name = "att_reg")
    @Comment("예배 출결재적")
    private Integer attReg;

    @Column(name = "att_onsite")
    @Comment("대면예배 출석수")
    private Integer attOnsite;

    @Column(name = "att_online")
    @Comment("온라인예배 출석수")
    private Integer attOnline;

    @Column(name = "att_etc")
    @Comment("기타예배 출석수")
    private Integer attEtc;

    @Column(name = "att_total")
    @Comment("예배 출석수 계")
    private Integer attTotal;

    @Column(name = "abs_once")
    @Comment("일회성 결석수")
    private Integer absOnce;

    @Column(name = "abs_long_manage")
    @Comment("장기결석(관리가능) 수")
    private Integer absLongManage;

    @Column(name = "abs_long_unmanage")
    @Comment("장기결석(관리불가능) 수")
    private Integer absLongUnmanage;

    @Column(name = "abs_total")
    @Comment("결석수 계")
    private Integer absTotal;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
