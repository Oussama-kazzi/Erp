import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY_DEFAULTS } from '../context/CompanyContext';

const fmtNum = (n) => new Intl.NumberFormat('fr-MA').format(Math.round((n ?? 0) * 100) / 100);
const TVA_RATE = 0.20;

// ─── Color palette ──────────────────────────────────────────────────────────
const C = {
  black:  [15,  15,  15],
  dark:   [40,  40,  40],
  mid:    [110, 110, 110],
  light:  [180, 180, 180],
  vlight: [245, 245, 243],
  white:  [255, 255, 255],
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

// Load image URL → { dataUrl, width, height } via canvas
const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
  };
  img.onerror = () => reject(new Error('logo load failed'));
  img.src = url;
});

// ─── Main generator ─────────────────────────────────────────────────────────
export const generateQuotePDF = async (quote, companyRaw = {}) => {
  const co = { ...COMPANY_DEFAULTS, ...companyRaw };
  const primary   = hexToRgb(co.primaryColor   || '#1A1714');
  const secondary = hexToRgb(co.secondaryColor  || '#B8936A');

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const ML   = 18;
  const MR   = 18;
  const CW   = W - ML - MR;

  // Try to load logo
  let logo = null;
  if (co.logoUrl) {
    try { logo = await loadImage(co.logoUrl); } catch { /* skip */ }
  }

  let y = 0;

  // ── HEADER BAND ────────────────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, logo ? 46 : 36, 'F');

  if (logo) {
    // Fit logo: max 110mm wide, max 42mm tall
    const MAX_W = 110, MAX_H = 42;
    const ratio = Math.min(MAX_W / (logo.w * 0.264583), MAX_H / (logo.h * 0.264583));
    const lw = logo.w * 0.264583 * ratio;
    const lh = logo.h * 0.264583 * ratio;
    doc.addImage(logo.dataUrl, 'PNG', (W - lw) / 2, 46 / 2 - lh / 2, lw, lh);
  } else {
    // Text fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...C.white);
    doc.text(co.companyName.toUpperCase(), W / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...secondary);
    const sub = co.companyCity ? `${co.companyCity.toUpperCase()} · MAROC` : 'WORKSHOP & DESIGN';
    doc.text(sub, W / 2, 23, { align: 'center', charSpace: 2 });
  }

  // Bronze accent line
  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.6);
  const headerH = logo ? 46 : 36;
  doc.line(ML, headerH - 6, W - MR, headerH - 6);

  // Quote number + date
  const dateStr = new Date(quote.created_at || Date.now()).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.light);
  doc.text('DEVIS', ML, headerH - 1.5);
  doc.setTextColor(...C.white);
  doc.text(quote.quote_number || 'DEV-XXXX', ML + 14, headerH - 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(`Date : ${dateStr}`, W - MR, headerH - 1.5, { align: 'right' });

  y = headerH + 12;

  // ── DE / POUR ──────────────────────────────────────────────────────────
  const col2 = W / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...secondary);
  doc.text('DE', ML, y);
  doc.text('POUR', col2, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.black);
  doc.text(co.companyName, ML, y);

  const clientName = quote.client?.full_name || '—';
  doc.text(clientName, col2, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.mid);

  const fromLines = [
    co.companyAddress || 'Maroc',
    co.companyEmail,
    co.companyPhone,
    ...(co.ice  ? [`ICE : ${co.ice}`]  : []),
    ...(co.rc   ? [`RC  : ${co.rc}`]   : []),
  ].filter(Boolean);

  fromLines.forEach((line) => { doc.text(line, ML, y); y += 4.5; });

  let cy = y - fromLines.length * 4.5;
  if (quote.client?.phone)   { doc.text(`Tél : ${quote.client.phone}`, col2, cy); cy += 4.5; }
  if (quote.client?.address) { doc.text(quote.client.address, col2, cy); cy += 4.5; }
  if (quote.valid_until) {
    const vu = new Date(quote.valid_until).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Valable jusqu'au : ${vu}`, col2, cy);
  }

  y += 6;

  // Divider
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.2);
  doc.line(ML, y, W - MR, y);
  y += 8;

  // ── ITEMS TABLE ────────────────────────────────────────────────────────
  const items = quote.items || [];
  const rows = items.map((item) => {
    const qty   = item.quantity !== '' && item.quantity != null ? Number(item.quantity) : null;
    const total = qty != null ? qty * item.unitPrice : 0;
    return [
      item.description || item.name || '',
      { content: qty != null ? String(qty) : '—',       styles: { halign: 'center' } },
      { content: `${fmtNum(item.unitPrice)} MAD`,        styles: { halign: 'right' } },
      { content: `${fmtNum(total)} MAD`,                 styles: { halign: 'right', fontStyle: 'bold' } },
    ];
  });

  if ((quote.labor_cost || 0) > 0) {
    rows.push([
      { content: "Main d'œuvre", styles: { fontStyle: 'italic' } },
      { content: '1',                                                        styles: { halign: 'center' } },
      { content: `${fmtNum(quote.labor_cost)} MAD`,                         styles: { halign: 'right' } },
      { content: `${fmtNum(quote.labor_cost)} MAD`,                         styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'Prix Unitaire', 'Total HT']],
    body: rows,
    margin: { left: ML, right: MR },
    headStyles: {
      fillColor: primary,
      textColor: C.white,
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontSize: 9 },
      1: { cellWidth: 18, fontSize: 9 },
      2: { cellWidth: 36, fontSize: 9 },
      3: { cellWidth: 36, fontSize: 9 },
    },
    bodyStyles: {
      textColor: C.dark,
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: C.vlight },
    styles: { lineColor: [220, 215, 210], lineWidth: 0.15, overflow: 'linebreak' },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── TOTALS ─────────────────────────────────────────────────────────────
  const itemsHT    = items.reduce((s, i) => s + (Number(i.quantity) || 0) * i.unitPrice, 0);
  const labor      = quote.labor_cost || 0;
  const subtotalHT = itemsHT + labor;
  const tva        = subtotalHT * TVA_RATE;
  const totalTTC   = subtotalHT + tva;

  const TBX = W - MR - 75;
  const TBW = 75;
  let ty = y;

  const drawTR = (label, value, bold, inverse) => {
    const rh = 8;
    if (inverse) {
      doc.setFillColor(...primary);
      doc.rect(TBX, ty - 1, TBW, rh + 1, 'F');
      doc.setTextColor(...C.white);
    } else {
      doc.setTextColor(...(bold ? C.black : C.mid));
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.text(label, TBX + 3, ty + 5);
    doc.text(value, TBX + TBW - 3, ty + 5, { align: 'right' });
    ty += rh + 1;
  };

  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.15);
  doc.rect(TBX, ty - 1, TBW, 30, 'S');

  drawTR('Sous-total HT',       `${fmtNum(subtotalHT)} MAD`, false, false);
  doc.setLineWidth(0.15); doc.line(TBX, ty - 1, TBX + TBW, ty - 1);
  drawTR(`TVA (${TVA_RATE * 100}%)`, `${fmtNum(tva)} MAD`,    false, false);
  doc.setLineWidth(0.4);  doc.setDrawColor(...C.black); doc.line(TBX, ty - 1, TBX + TBW, ty - 1);
  drawTR('TOTAL TTC',           `${fmtNum(totalTTC)} MAD`,   true,  true);

  y = ty + 10;

  // ── PAYMENT TERMS ──────────────────────────────────────────────────────
  const PBX = ML, PBW = 90;
  doc.setFillColor(...C.vlight);
  doc.setDrawColor(220, 215, 210);
  doc.setLineWidth(0.15);
  doc.rect(PBX, y - 2, PBW, 36, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.black);
  doc.text('CONDITIONS DE PAIEMENT', PBX + 4, y + 5);
  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.5);
  doc.line(PBX + 4, y + 7, PBX + 44, y + 7);

  let py = y + 13;
  [
    { pct: '50%', label: 'à la commande',  amount: totalTTC * 0.5  },
    { pct: '25%', label: 'à la livraison', amount: totalTTC * 0.25 },
    { pct: '25%', label: 'fin des travaux',amount: totalTTC * 0.25 },
  ].forEach(({ pct, label, amount }) => {
    doc.setFillColor(...primary);
    doc.roundedRect(PBX + 4, py - 3.5, 12, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text(pct, PBX + 10, py + 0.2, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.setTextColor(...C.dark);
    doc.text(label, PBX + 19, py + 0.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.black);
    doc.text(`${fmtNum(amount)} MAD`, PBX + PBW - 4, py + 0.2, { align: 'right' });
    py += 8;
  });

  // ── NOTES ──────────────────────────────────────────────────────────────
  if (quote.notes) {
    const NX = ML + PBW + 8;
    const NW = CW - PBW - 8;
    doc.setFillColor(...C.vlight);
    doc.setDrawColor(220, 215, 210);
    doc.setLineWidth(0.15);
    doc.rect(NX, y - 2, NW, 36, 'FD');
    doc.setFillColor(...secondary);
    doc.rect(NX, y - 2, 2.5, 36, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.setTextColor(...C.mid);
    doc.text('NOTES', NX + 6, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.setTextColor(...C.dark);
    const nl = doc.splitTextToSize(quote.notes, NW - 10);
    doc.text(nl, NX + 6, y + 11);
  }

  y += 44;

  // ── SIGNATURES ────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }
  y = Math.max(y, 228);

  const sigW = 65;
  doc.setDrawColor(...C.light); doc.setLineWidth(0.3);
  doc.line(ML, y, ML + sigW, y);
  doc.line(W - MR - sigW, y, W - MR, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.setTextColor(...C.light);
  doc.text('Signature & cachet client', ML, y + 5);
  doc.text('Signature & cachet Atelier', W - MR - sigW, y + 5);
  y += 12;
  doc.setFontSize(7); doc.setTextColor(...C.mid);
  doc.text(`Lu et approuvé — ${co.companyCity}, le ${new Date().toLocaleDateString('fr-FR')}`, ML, y);

  // ── FOOTER ────────────────────────────────────────────────────────────
  const FY = H - 12;
  doc.setDrawColor(...secondary); doc.setLineWidth(0.4);
  doc.line(ML, FY - 4, W - MR, FY - 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.setTextColor(...C.mid);
  const footerParts = [co.companyName, co.companyAddress, co.companyEmail, co.companyPhone].filter(Boolean);
  doc.text(footerParts.join('  ·  '), W / 2, FY, { align: 'center' });

  return doc;
};

// ─── Convenience wrappers ────────────────────────────────────────────────────
export const downloadQuotePDF = async (quote, company) => {
  const doc = await generateQuotePDF(quote, company);
  doc.save(`${quote.quote_number || 'Devis'}.pdf`);
};

export const previewQuotePDF = async (quote, company) => {
  const doc = await generateQuotePDF(quote, company);
  window.open(doc.output('bloburl'), '_blank');
};

export const printQuotePDF = async (quote, company) => {
  const doc = await generateQuotePDF(quote, company);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
