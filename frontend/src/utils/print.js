const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1A1714; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 18mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #1A1714; margin-bottom: 32px; }
  .brand-name { font-size: 26px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
  .brand-sub { font-size: 9px; letter-spacing: 4px; color: #8A7B6F; text-transform: uppercase; margin-top: 4px; }
  .doc-type { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #8A7B6F; text-align: right; }
  .doc-number { font-size: 22px; font-weight: 700; text-align: right; margin-top: 4px; }
  .doc-meta { font-size: 11px; color: #8A7B6F; text-align: right; margin-top: 3px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
  .party-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #8A7B6F; margin-bottom: 8px; font-weight: 600; }
  .party-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .party-info { font-size: 12px; color: #4A3F38; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #1A1714; color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #EDE7DF; font-size: 12px; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody tr:nth-child(even) { background: #FAFAF8; }
  .totals { margin-left: auto; width: 260px; padding-top: 16px; border-top: 1px solid #DDD5CB; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #4A3F38; }
  .total-row.grand { font-size: 16px; font-weight: 700; color: #1A1714; border-top: 2px solid #1A1714; margin-top: 8px; padding-top: 10px; }
  .notes-box { margin-top: 32px; padding: 14px 16px; background: #FAFAF8; border-left: 3px solid #B8936A; border-radius: 2px; }
  .notes-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #8A7B6F; margin-bottom: 6px; font-weight: 600; }
  .notes-text { font-size: 12px; color: #4A3F38; line-height: 1.6; }
  .footer { margin-top: 56px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
  .sig-box { border-top: 1px solid #DDD5CB; padding-top: 10px; }
  .sig-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #8A7B6F; font-weight: 600; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 14mm 16mm; }
  }
`;

const buildHTML = ({ title, docNumber, docDate, extra, client, items, laborCost, total, notes }) => {
  const rows = items.map(item => `
    <tr>
      <td>${item.description || item.name || ''}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${fmt(item.unitPrice)} MAD</td>
      <td>${fmt(item.quantity * item.unitPrice)} MAD</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title} — ${docNumber}</title>
  <style>${STYLES}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">Atelier</div>
      <div class="brand-sub">Workshop Management</div>
    </div>
    <div>
      <div class="doc-type">${title}</div>
      <div class="doc-number">${docNumber}</div>
      <div class="doc-meta">Date: ${docDate}</div>
      ${extra ? `<div class="doc-meta">${extra}</div>` : ''}
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">Atelier Workshop</div>
      <div class="party-info">contact@atelier.ma<br>Casablanca, Morocco</div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${client?.fullName || '—'}</div>
      <div class="party-info">
        ${client?.phone ? `Tel: ${client.phone}<br>` : ''}
        ${client?.address || ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th style="text-align:center;width:10%">Qty</th>
        <th style="text-align:right;width:20%">Unit Price</th>
        <th style="width:20%">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${fmt(subtotal)} MAD</span></div>
    ${laborCost > 0 ? `<div class="total-row"><span>Labor Cost</span><span>${fmt(laborCost)} MAD</span></div>` : ''}
    <div class="total-row grand"><span>Total</span><span>${fmt(total)} MAD</span></div>
  </div>

  ${notes ? `<div class="notes-box"><div class="notes-label">Notes</div><div class="notes-text">${notes}</div></div>` : ''}

  <div class="footer">
    <div class="sig-box"><div class="sig-label">Client Signature</div></div>
    <div class="sig-box"><div class="sig-label">Authorized by Atelier</div></div>
  </div>
</div>
<script>window.onload = () => { window.focus(); window.print(); };</script>
</body>
</html>`;
};

export const printQuote = (quote) => {
  const validUntil = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString('fr-MA')
    : null;
  const html = buildHTML({
    title: 'DEVIS',
    docNumber: quote.quoteNumber,
    docDate: new Date(quote.createdAt).toLocaleDateString('fr-MA'),
    extra: validUntil ? `Valable jusqu'au: ${validUntil}` : null,
    client: quote.client,
    items: quote.items,
    laborCost: quote.laborCost || 0,
    total: quote.totalPrice,
    notes: quote.notes,
  });
  const win = window.open('', '_blank', 'width=900,height=1100');
  win.document.write(html);
  win.document.close();
};

export const printInvoice = (invoice) => {
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('fr-MA')
    : null;
  const html = buildHTML({
    title: 'FACTURE',
    docNumber: invoice.invoiceNumber,
    docDate: new Date(invoice.createdAt).toLocaleDateString('fr-MA'),
    extra: dueDate ? `Échéance: ${dueDate}` : null,
    client: invoice.client,
    items: invoice.items,
    laborCost: invoice.laborCost || 0,
    total: invoice.totalAmount,
    notes: invoice.notes,
  });
  const win = window.open('', '_blank', 'width=900,height=1100');
  win.document.write(html);
  win.document.close();
};
