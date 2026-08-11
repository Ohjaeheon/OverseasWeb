// Minimal .xlsx generator (ZIP store + CRC32, no external library).
// Ported 1:1 from public/assets/diagnosisEngine.js (_CRCT/_crc32/_zip/xlsxGen/_u8ToB64).

export interface XlsxCell {
  v: string | number | null;
  t: 'num' | 'pct' | 'str';
}

const CRCT: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

interface ZipFile {
  name: Uint8Array;
  data: Uint8Array;
}

function zip(files: ZipFile[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: { hdr: Uint8Array; name: Uint8Array }[] = [];
  let offset = 0;

  files.forEach(f => {
    const nameB = f.name, data = f.data, crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nameB, data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, nameB.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
    central.push({ hdr: new Uint8Array(ch.buffer), name: nameB });
    offset += 30 + nameB.length + data.length;
  });

  const centralStart = offset;
  let centralSize = 0;
  central.forEach(c => { parts.push(c.hdr, c.name); centralSize += c.hdr.length + c.name.length; });

  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(4, 0, true); eo.setUint16(6, 0, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
  eo.setUint32(12, centralSize, true); eo.setUint32(16, centralStart, true); eo.setUint16(20, 0, true);
  parts.push(new Uint8Array(eo.buffer));

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  parts.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}

export function xlsxGen(sheetName: string, headers: string[], rows: XlsxCell[][]): Uint8Array {
  const enc = new TextEncoder();
  const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const colRef = (c: number) => { let s = ''; c++; while (c > 0) { s = String.fromCharCode(65 + (c - 1) % 26) + s; c = Math.floor((c - 1) / 26); } return s; };
  const cellXml = (r: number, ci: number, cell: XlsxCell | null) => {
    const ref = colRef(ci) + r;
    if (cell == null || cell.v == null || cell.v === '') return `<c r="${ref}"/>`;
    if (cell.t === 'num') return `<c r="${ref}"><v>${cell.v}</v></c>`;
    if (cell.t === 'pct') return `<c r="${ref}" s="1"><v>${cell.v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
  };

  let sd = `<row r="1">` + headers.map((h, ci) => cellXml(1, ci, { v: h, t: 'str' })).join('') + `</row>`;
  rows.forEach((row, ri) => {
    const r = ri + 2;
    sd += `<row r="${r}">` + row.map((cell, ci) => cellXml(r, ci, cell)).join('') + `</row>`;
  });

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sd}</sheetData></worksheet>`;
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  return zip([
    { name: enc.encode('[Content_Types].xml'), data: enc.encode(ct) },
    { name: enc.encode('_rels/.rels'), data: enc.encode(rootRels) },
    { name: enc.encode('xl/workbook.xml'), data: enc.encode(wbXml) },
    { name: enc.encode('xl/_rels/workbook.xml.rels'), data: enc.encode(wbRels) },
    { name: enc.encode('xl/styles.xml'), data: enc.encode(styles) },
    { name: enc.encode('xl/worksheets/sheet1.xml'), data: enc.encode(sheetXml) },
  ]);
}

export function u8ToB64(u8: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CH)));
  }
  return btoa(s);
}
