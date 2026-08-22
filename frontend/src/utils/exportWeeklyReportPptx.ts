import pptxgen from 'pptxgenjs';
import { WeeklyReportSubmissionItem, WeeklyReportSchemaItem, FormSchema, LeafColumn } from '../services/weeklyReportService';
import { formatWeekLabel } from './weekUtil';

// 실제 발표 보기(WeeklyReportPresentationView)와 동일한 색/구조를 PPTX로 재현
const GREEN = '4F9C47';
const HEADER_FILL = 'DCEFD4';
const BORDER = '9CA3AF';
const HEADER_TEXT = '14201A';
const DATA_TEXT = '0F172A';

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

interface ExportParams {
  submissions: WeeklyReportSubmissionItem[];
  schemas: WeeklyReportSchemaItem[];
  /** churchId -> 이 교회에서 숨길 sectionId 목록 (발표 설정과 동일하게 반영) */
  hiddenSectionsByChurchId?: Record<number, string[]>;
  fileName?: string;
}

/**
 * 발표 보기와 동일한 표지 + 표 슬라이드를 실제 .pptx 파일로 만들어 다운로드한다.
 * 사진(notes_board 첨부사진, 표지 사진)은 파일 크기/네트워크 신뢰성 문제로 이번 버전에서는
 * embed 하지 않고 "사진 n장" 표시만 남긴다.
 */
export async function exportWeeklyReportPptx({ submissions, schemas, hiddenSectionsByChurchId, fileName }: ExportParams): Promise<void> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'WR_WIDE', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'WR_WIDE';

  submissions.forEach(sub => {
    let data: Record<string, any> = {};
    let schema: FormSchema | null = null;
    try { data = JSON.parse(sub.submitDataJson); } catch {}
    try {
      const s = schemas.find(sc => sc.schemaId === sub.schema?.schemaId);
      if (s) schema = JSON.parse(s.formSchemaJson);
    } catch {}

    const weekLabel = formatWeekLabel({ year: sub.reportYear, month: sub.reportMonth, weekOfMonth: sub.reportWeekOfMonth });
    const hiddenIds = hiddenSectionsByChurchId?.[sub.churchId] || [];

    // ── 표지 슬라이드 ──────────────────────────────────────────
    const cover = pptx.addSlide();
    cover.background = { color: 'FFFFFF' };
    cover.addText(`${weekLabel} 주간보고`, {
      x: 0, y: 2.5, w: SLIDE_W, h: 0.5, align: 'center',
      fontSize: 15, bold: true, color: '3B82F6', charSpacing: 2
    });
    cover.addText(sub.churchName, {
      x: 0, y: 3.0, w: SLIDE_W, h: 1.0, align: 'center',
      fontSize: 40, bold: true, color: '16224A'
    });
    if (sub.status === 'NOT_SUBMITTED') {
      cover.addText('아직 취합되지 않았습니다', {
        x: 0, y: 4.1, w: SLIDE_W, h: 0.5, align: 'center', fontSize: 14, bold: true, color: 'DC2626'
      });
    } else {
      cover.addText(`제출자 ${sub.submittedBy || '-'}`, {
        x: 0, y: 4.1, w: SLIDE_W, h: 0.5, align: 'center', fontSize: 14, color: '475569'
      });
    }

    if (!schema) return;

    const visiblePages = schema.pages.filter(p => (p.sections?.length ?? 0) > 0);
    visiblePages.forEach(page => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // 상단 배너
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: 0.7, fill: { color: GREEN }, line: { color: GREEN, width: 0 } });
      slide.addText(`■ ${sub.churchName} 주간보고`, {
        x: 0.3, y: 0, w: SLIDE_W * 0.6, h: 0.7, valign: 'middle', fontSize: 18, bold: true, color: '111827'
      });
      slide.addText(weekLabel, {
        x: SLIDE_W * 0.62, y: 0, w: SLIDE_W * 0.36, h: 0.7, valign: 'middle', align: 'right', fontSize: 13, bold: true, color: '1F2937'
      });

      let cursorY = 0.95;
      const visibleSections = (page.sections || []).filter(sec => !hiddenIds.includes(sec.sectionId));

      visibleSections.forEach(sec => {
        slide.addText(sec.title, { x: 0.3, y: cursorY, w: SLIDE_W - 0.6, h: 0.3, fontSize: 15, bold: true, color: '0F172A' });
        cursorY += 0.35;

        if (sec.type === 'grouped_table' && sec.leafColumns) {
          const rows = buildGroupedTableRows(sec.leafColumns, data[sec.sectionId] || {});
          slide.addTable(rows, { x: 0.3, y: cursorY, w: SLIDE_W - 0.6, fontSize: 10, border: { type: 'solid', color: BORDER, pt: 1 }, autoPage: false });
          cursorY += rows.length * 0.35 + 0.25;
        } else if (sec.type === 'dynamic_table' && sec.columns) {
          const dataRows = (data[sec.sectionId] || []) as any[];
          const rows = buildDynamicTableRows(sec.columns, dataRows);
          slide.addTable(rows, { x: 0.3, y: cursorY, w: SLIDE_W - 0.6, fontSize: 10, border: { type: 'solid', color: BORDER, pt: 1 }, autoPage: false });
          cursorY += rows.length * 0.32 + 0.25;
        } else if (sec.type === 'notes_board') {
          const cards = (data[sec.sectionId] || []) as any[];
          if (cards.length === 0) {
            slide.addText('추가된 카드가 없습니다.', { x: 0.3, y: cursorY, w: SLIDE_W - 0.6, h: 0.3, fontSize: 11, color: '94A3B8' });
            cursorY += 0.4;
          } else {
            const cols = Math.min(4, cards.length);
            const cardW = (SLIDE_W - 0.6 - (cols - 1) * 0.15) / cols;
            const cardH = 1.3;
            cards.forEach((card, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = 0.3 + col * (cardW + 0.15);
              const y = cursorY + row * (cardH + 0.15);
              slide.addShape(pptx.ShapeType.rect, { x, y, w: cardW, h: cardH, fill: { color: 'F8FAFC' }, line: { color: BORDER, width: 1 } });
              const photoNote = card.photoPaths?.length > 0 ? ` (사진 ${card.photoPaths.length}장)` : '';
              slide.addText(
                [
                  { text: `${card.title || '제목 없음'}${photoNote}\n`, options: { bold: true, color: '166534', fontSize: 10 } },
                  { text: card.value || '-', options: { color: DATA_TEXT, fontSize: 9 } },
                ],
                { x: x + 0.1, y: y + 0.08, w: cardW - 0.2, h: cardH - 0.16, valign: 'top' }
              );
            });
            const rowCount = Math.ceil(cards.length / cols);
            cursorY += rowCount * (cardH + 0.15) + 0.1;
          }
        }
      });
    });
  });

  await pptx.writeFile({ fileName: fileName || `주간보고_${Date.now()}.pptx` });
}

function buildGroupedTableRows(leaves: LeafColumn[], value: Record<string, any>): any[] {
  const hasGroups = leaves.some(l => l.groupLabel);
  const topRow: any[] = [];
  let i = 0;
  while (i < leaves.length) {
    const leaf = leaves[i];
    if (leaf.groupLabel) {
      let j = i;
      while (j < leaves.length && leaves[j].groupLabel === leaf.groupLabel) j++;
      topRow.push({ text: leaf.groupLabel, options: { colspan: j - i, fill: { color: HEADER_FILL }, bold: true, align: 'center', color: HEADER_TEXT } });
      i = j;
    } else {
      topRow.push({ text: leaf.label, options: { rowspan: hasGroups ? 2 : 1, fill: { color: HEADER_FILL }, bold: true, align: 'center', color: HEADER_TEXT } });
      i++;
    }
  }
  const rows: any[] = [topRow];
  if (hasGroups) {
    const secondRow = leaves.filter(l => l.groupLabel).map(l => ({ text: l.label, options: { fill: { color: HEADER_FILL }, bold: true, align: 'center', color: HEADER_TEXT } }));
    rows.push(secondRow);
  }
  const dataRow = leaves.map(l => ({ text: String(value[l.key] ?? '-'), options: { align: 'center', color: DATA_TEXT } }));
  rows.push(dataRow);
  return rows;
}

function buildDynamicTableRows(columns: string[], dataRows: any[]): any[] {
  const header = columns.map(c => ({ text: c, options: { fill: { color: HEADER_FILL }, bold: true, align: 'center', color: HEADER_TEXT } }));
  const rows: any[] = [header];
  if (dataRows.length === 0) {
    rows.push([{ text: '입력된 내용이 없습니다.', options: { colspan: columns.length, color: '94A3B8', align: 'center' } }]);
  } else {
    dataRows.forEach(r => {
      rows.push(columns.map(c => ({ text: String(r[c] ?? '-'), options: { color: DATA_TEXT } })));
    });
  }
  return rows;
}
