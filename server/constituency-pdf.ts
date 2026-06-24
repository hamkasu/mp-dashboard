/**
 * Copyright by Calmic Sdn Bhd
 *
 * constituency-pdf.ts — Premium constituency report PDF generator
 *
 * Generates a valid PDF/1.4 document using raw PDF syntax.
 * No third-party library required — only Node.js built-ins.
 *
 * Design choices:
 * ─────────────────────────────────────────────────────────────────────────────
 * • Type1 fonts (Helvetica / Helvetica-Bold) are embedded in every compliant
 *   PDF viewer; we reference them by name without embedding font data, keeping
 *   the generated file small (~5–10 KB per report).
 *
 * • PDF coordinate origin is bottom-left; y increases upward.  All layout
 *   constants in this file use screen coordinates (y increases downward) and
 *   are converted via py() before writing to the content stream.
 *
 * • The content stream is assembled as an ASCII string, then converted to a
 *   Buffer with latin1 encoding.  Character length == byte length for ASCII,
 *   so /Length in the stream dictionary is always accurate.
 *
 * Security:
 *   This module is ONLY called after requirePremium middleware verifies an
 *   active subscription.  Do not expose this function to unauthenticated routes.
 *
 * PDF spec reference: ISO 32000-1:2008 (PDF 1.4)
 */

// ── A4 page geometry (points at 72 dpi) ──────────────────────────────────────
const PW = 595.28; // page width
const PH = 841.89; // page height
const MG = 50;     // left / right margin

// ── Colour palette (RGB 0–255) ───────────────────────────────────────────────
const C = {
  headerBg:   [30, 64, 175] as const,  // #1e40af  deep blue
  headerText: [255, 255, 255] as const,
  headerSub:  [199, 220, 255] as const,
  label:      [107, 114, 128] as const, // gray-500
  body:       [17, 24, 39] as const,    // gray-900
  medium:     [55, 65, 81] as const,    // gray-700
  dim:        [156, 163, 175] as const, // gray-400
  border:     [229, 231, 235] as const, // gray-200
  bgLight:    [249, 250, 251] as const, // gray-50
  blue:       [37, 99, 235] as const,   // primary link blue
  green:      [22, 163, 74] as const,
  yellow:     [202, 138, 4] as const,
  red:        [220, 38, 38] as const,
};

// ── Data types ────────────────────────────────────────────────────────────────

export interface ConstituencyParticipation {
  constituency: string;
  state: string;
  totalSessions: number;
  sessionsSpoke: number;
  totalSpeeches: number;
  participationRate: number;
  mpIds: string[];
  mpNames: string[];
}

export interface ConstituencyProfile {
  parliamentCode?: string | null;
  povertyIncidence?: number | null;
}

// ── PDF string escaping ───────────────────────────────────────────────────────

/**
 * Escape a string for use inside a PDF literal string `(...)`.
 * PDF literal strings must escape backslash, parentheses, and non-ASCII.
 */
function esc(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?'); // replace non-printable / non-ASCII
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

/** Convert screen Y (top=0, down) to PDF Y (bottom=0, up). */
const py = (y: number) => +(PH - y).toFixed(3);

/** Format RGB triple as PDF real numbers in [0,1]. */
const rgb = (c: readonly [number, number, number]) =>
  `${(c[0] / 255).toFixed(4)} ${(c[1] / 255).toFixed(4)} ${(c[2] / 255).toFixed(4)}`;

// ── Content stream builder ────────────────────────────────────────────────────

/**
 * Builds the PDF content stream (page drawing commands).
 *
 * Layout uses screen coordinates (y increases down from top of page).
 * The stream is plain ASCII; /Length is accurate since ascii char == byte.
 */
function buildContentStream(
  p: ConstituencyParticipation,
  profile: ConstituencyProfile | null,
  rank: number,
  totalConstituencies: number,
  avgRate: number,
): string {
  const ops: string[] = [];

  // ── Low-level drawing helpers ─────────────────────────────────────────────

  /** Draw filled rectangle (screen coordinates). */
  const rect = (
    x: number, sy: number, w: number, h: number,
    fill: readonly [number, number, number],
  ) => {
    // PDF bottom-left of rect = top-left in screen coords mapped to PDF space
    const pdfY = +(PH - sy - h).toFixed(3);
    ops.push(
      `${rgb(fill)} rg`,
      `${x.toFixed(2)} ${pdfY} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  };

  /** Draw horizontal rule (screen Y). */
  const hline = (
    x1: number, sy: number, x2: number,
    stroke: readonly [number, number, number] = C.border,
    lw = 0.5,
  ) => {
    const pdfY = py(sy);
    ops.push(
      `${rgb(stroke)} RG`,
      `${lw} w`,
      `${x1.toFixed(2)} ${pdfY} m ${x2.toFixed(2)} ${pdfY} l S`,
    );
  };

  /**
   * Draw text at an absolute screen position.
   * Uses 'Tm' (text matrix) so each call is position-independent.
   * F1 = Helvetica (regular), F2 = Helvetica-Bold.
   */
  const text = (
    content: string,
    x: number,
    sy: number,
    font: 'F1' | 'F2',
    size: number,
    colour: readonly [number, number, number] = C.body,
  ) => {
    const pdfY = py(sy);
    ops.push(
      `BT`,
      `/${font} ${size} Tf`,
      `${rgb(colour)} rg`,
      `1 0 0 1 ${x.toFixed(2)} ${pdfY} Tm`,
      `(${esc(content)}) Tj`,
      `ET`,
    );
  };

  // ── Section helpers ───────────────────────────────────────────────────────

  const sectionLabel = (label: string, sy: number) =>
    text(label, MG, sy, 'F2', 7.5, C.label);

  const fieldRow = (
    label: string, value: string, x: number, sy: number,
    valueColour: readonly [number, number, number] = C.body,
  ) => {
    text(label, x, sy, 'F1', 7.5, C.label);
    text(value, x, sy + 14, 'F2', 16, valueColour);
  };

  // ── HEADER BANNER (screen y 0–88) ─────────────────────────────────────────
  rect(0, 0, PW, 88, C.headerBg);
  text('MALAYSIAN PARLIAMENT DASHBOARD', MG, 20, 'F2', 8.5, C.headerText);
  text('CONSTITUENCY INTELLIGENCE REPORT', MG, 38, 'F2', 17, C.headerText);

  const genDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  text(`Premium Report  |  Generated: ${genDate}`, MG, 62, 'F1', 8, C.headerSub);

  // ── CONSTITUENCY IDENTITY (screen y 100–168) ──────────────────────────────
  const codeStr = profile?.parliamentCode
    ? `Parliament Code: ${profile.parliamentCode}`
    : '15th Parliament';
  text(codeStr, MG, 108, 'F1', 8.5, C.label);
  text(p.constituency, MG, 128, 'F2', 22, C.body);
  text(`${p.state}  |  15th Parliament (2022-2027)`, MG, 158, 'F1', 11, C.medium);

  hline(MG, 175, PW - MG);

  // ── CURRENT REPRESENTATION (screen y 185–end of MPs) ─────────────────────
  sectionLabel('CURRENT REPRESENTATION', 192);

  let mpY = 208;
  if (p.mpNames.length === 0) {
    text('No MP data available', MG, mpY, 'F1', 11, C.dim);
    mpY += 18;
  } else {
    for (const name of p.mpNames.slice(0, 6)) {
      text(`- ${name}`, MG, mpY, 'F1', 11, C.body);
      mpY += 17;
    }
  }

  const afterMPs = Math.max(mpY + 8, 250);
  hline(MG, afterMPs, PW - MG);

  // ── HANSARD PARTICIPATION (3 stat columns) ────────────────────────────────
  const partTop = afterMPs + 18;
  sectionLabel('HANSARD PARTICIPATION  (15TH PARLIAMENT)', partTop);

  const c1 = MG, c2 = MG + 165, c3 = MG + 320;
  const statTop = partTop + 18;

  fieldRow('Sessions Participated', `${p.sessionsSpoke} / ${p.totalSessions}`, c1, statTop);
  text('sessions', c1, statTop + 33, 'F1', 7.5, C.label);

  fieldRow('Total Speeches', `${p.totalSpeeches}`, c2, statTop);
  text('speeches delivered', c2, statTop + 33, 'F1', 7.5, C.label);

  const rate = p.participationRate;
  const rateColour = rate >= 70 ? C.green : rate >= 40 ? C.yellow : C.red;
  const bandLabel = rate >= 70 ? 'High Participation' : rate >= 40 ? 'Moderate Participation' : 'Low Participation';

  fieldRow('Participation Rate', `${rate.toFixed(1)}%`, c3, statTop, rateColour);
  text(bandLabel, c3, statTop + 33, 'F2', 7.5, rateColour);

  // Participation bar ─────────────────────────────────────────────────────────
  const barTop = statTop + 50;
  const barW = PW - MG * 2;
  const barH = 10;
  const fillW = Math.max((rate / 100) * barW, 3);

  rect(MG, barTop, barW, barH, C.border);           // track
  rect(MG, barTop, fillW, barH, rateColour);         // fill

  // Threshold tick marks at 40% and 70%
  hline(MG + barW * 0.4, barTop - 2, MG + barW * 0.4, C.dim, 0.6);
  hline(MG + barW * 0.7, barTop - 2, MG + barW * 0.7, C.dim, 0.6);

  text('0%', MG, barTop + barH + 6, 'F1', 6.5, C.dim);
  text('40%', MG + barW * 0.4 - 6, barTop + barH + 6, 'F1', 6.5, C.dim);
  text('70%', MG + barW * 0.7 - 6, barTop + barH + 6, 'F1', 6.5, C.dim);
  text('100%', MG + barW - 10, barTop + barH + 6, 'F1', 6.5, C.dim);

  hline(MG, barTop + barH + 22, PW - MG);

  // ── COMPARATIVE STANDING ──────────────────────────────────────────────────
  const compTop = barTop + barH + 40;
  sectionLabel('COMPARATIVE STANDING', compTop);

  const cc1 = MG, cc2 = MG + 180, cc3 = MG + 360;
  const compData = compTop + 18;

  fieldRow('National Rank', `#${rank} of ${totalConstituencies}`, cc1, compData);

  fieldRow('National Average', `${avgRate.toFixed(1)}%`, cc2, compData);

  const diff = rate - avgRate;
  const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  const diffColour = diff >= 0 ? C.green : C.red;
  const diffLabel = diff >= 0 ? 'above national average' : 'below national average';

  fieldRow('vs. National Average', diffStr, cc3, compData, diffColour);
  text(diffLabel, cc3, compData + 33, 'F1', 7.5, diffColour);

  let nextY = compData + 55;

  // ── CONSTITUENCY PROFILE (optional) ──────────────────────────────────────
  if (profile?.povertyIncidence !== null && profile?.povertyIncidence !== undefined) {
    hline(MG, nextY, PW - MG);
    nextY += 18;
    sectionLabel('CONSTITUENCY PROFILE', nextY);
    nextY += 18;
    fieldRow(
      'Poverty Incidence',
      `${profile.povertyIncidence.toFixed(1)}%`,
      MG, nextY,
    );
    text('(Source: Laporan Kemiskinan Malaysia)', MG + 130, nextY + 17, 'F1', 7, C.dim);
    nextY += 52;
  }

  // ── DATA NOTE BOX ─────────────────────────────────────────────────────────
  const noteTop = Math.max(nextY + 12, PH - 200);
  hline(MG, noteTop, PW - MG);
  rect(MG, noteTop + 8, PW - MG * 2, 40, C.bgLight);
  text(
    'Data note: Participation rates reflect Hansard speaking records for the 15th Parliament (2022-2027).',
    MG + 8, noteTop + 18, 'F1', 7, C.medium,
  );
  text(
    'MP representation may have changed due to by-elections or resignations during this period.',
    MG + 8, noteTop + 30, 'F1', 7, C.label,
  );

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerTop = PH - 46;
  rect(0, footerTop, PW, 46, C.bgLight);
  hline(0, footerTop, PW, C.border, 0.5);

  text('myparliament.calmic.com.my', MG, footerTop + 17, 'F1', 8, C.blue);
  text(
    'Premium Constituency Intelligence Report  |  Not for redistribution',
    PW / 2 - 130, footerTop + 17, 'F1', 7.5, C.label,
  );
  text(
    `(c) ${new Date().getFullYear()} Calmic Sdn Bhd`,
    PW - MG - 110, footerTop + 17, 'F1', 7.5, C.label,
  );

  return ops.join('\n');
}

// ── PDF document assembly ─────────────────────────────────────────────────────

/**
 * Assembles a minimal PDF/1.4 document from the content stream.
 *
 * Object table:
 *   1 0 obj  — Catalog
 *   2 0 obj  — Pages (root)
 *   3 0 obj  — Page (A4)
 *   4 0 obj  — Font F1: Helvetica
 *   5 0 obj  — Font F2: Helvetica-Bold
 *   6 0 obj  — Content stream
 *
 * xref entries are exactly 20 bytes each per ISO 32000-1 §7.5.4:
 *   "nnnnnnnnnn ggggg n\r\n"  (10 + 1 + 5 + 1 + 1 + 2 = 20 bytes)
 */
function assemblePDF(contentStream: string, docTitle: string): Buffer {
  // Stream length = byte length.  Content is ASCII so char == byte.
  const streamLen = Buffer.byteLength(contentStream, 'ascii');

  const now = new Date();
  const pdfDate = [
    'D:',
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
    '+00\'00\'',
  ].join('');

  // Build object bodies
  const objs: string[] = [
    // 1 — Catalog
    `<< /Type /Catalog /Pages 2 0 R >>`,
    // 2 — Pages root
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // 3 — Page
    [
      '<< /Type /Page',
      '   /Parent 2 0 R',
      `   /MediaBox [0 0 ${PW} ${PH}]`,
      '   /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>',
      '   /Contents 6 0 R',
      '>>',
    ].join('\n'),
    // 4 — Helvetica regular
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    // 5 — Helvetica bold
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    // 6 — Content stream
    `<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream`,
  ];

  // Accumulate PDF bytes, tracking byte offsets for xref
  const parts: string[] = [];
  const offsets: number[] = [];

  parts.push('%PDF-1.4\n');
  let bytePos = parts[0].length;

  for (let i = 0; i < objs.length; i++) {
    const chunk = `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
    offsets.push(bytePos);
    parts.push(chunk);
    bytePos += chunk.length;
  }

  // Cross-reference table
  const xrefStart = bytePos;
  const numObjs = objs.length + 1; // +1 for the free entry

  let xref = `xref\n0 ${numObjs}\n`;
  // Free entry — always 20 bytes: "0000000000 65535 f\r\n"
  xref += '0000000000 65535 f\r\n';
  for (const offset of offsets) {
    // In-use entry — exactly 20 bytes: "nnnnnnnnnn 00000 n\r\n"
    xref += `${String(offset).padStart(10, '0')} 00000 n\r\n`;
  }

  const trailer = [
    'trailer',
    `<< /Size ${numObjs}`,
    '   /Root 1 0 R',
    `   /Info << /Title (${esc(docTitle)})`,
    '             /Author (Malaysian Parliament Dashboard)',
    '             /Creator (myparliament.calmic.com.my)',
    `             /CreationDate (${pdfDate})`,
    '          >>',
    '>>',
    'startxref',
    String(xrefStart),
    '%%EOF',
    '', // trailing newline
  ].join('\n');

  const full = parts.join('') + xref + trailer;
  return Buffer.from(full, 'ascii');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a constituency intelligence report PDF and return it as a Buffer.
 *
 * @param participation  Full participation record for the target constituency.
 * @param profile        Optional: constituency record with parliament code and
 *                       poverty incidence from the constituencies table.
 * @param allData        Full sorted dataset (used to calculate rank and avg).
 */
export function generateConstituencyReportPDF(
  participation: ConstituencyParticipation,
  profile: ConstituencyProfile | null,
  allData: ConstituencyParticipation[],
): Buffer {
  // Rank is the 1-based position in allData (sorted desc by participationRate)
  const rank =
    allData.findIndex(
      (c) =>
        c.constituency === participation.constituency &&
        c.state === participation.state,
    ) + 1 || allData.length;

  const avgRate =
    allData.length > 0
      ? allData.reduce((s, c) => s + c.participationRate, 0) / allData.length
      : 0;

  const contentStream = buildContentStream(
    participation,
    profile,
    rank,
    allData.length,
    avgRate,
  );

  const title = `${participation.constituency} Constituency Report — 15th Parliament`;
  return assemblePDF(contentStream, title);
}

/**
 * Derive a clean, filesystem-safe PDF filename from a constituency name.
 * e.g. "Padang Besar" → "constituency-padang-besar-report.pdf"
 */
export function constituencyPDFFilename(constituency: string): string {
  const slug = constituency
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `constituency-${slug}-hansard-report.pdf`;
}
