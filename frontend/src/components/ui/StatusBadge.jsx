import React from 'react';

const configs = {
  // Payment
  paid:        { label: 'Paid',        bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  partial:     { label: 'Partial',     bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400' },
  unpaid:      { label: 'Unpaid',      bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400' },
  // Order status
  pending:     { label: 'Pending',     bg: 'bg-sand-100',    text: 'text-sand-700',    dot: 'bg-sand-400' },
  in_production:{ label: 'Production', bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-400' },
  ready:       { label: 'Ready',       bg: 'bg-teal-50',     text: 'text-teal-700',    dot: 'bg-teal-400' },
  finished:    { label: 'Finished',    bg: 'bg-teal-50',     text: 'text-teal-700',    dot: 'bg-teal-400' },
  delivered:   { label: 'Delivered',   bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400' },
  // Product
  available:   { label: 'Available',   bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-400' },
  reserved:    { label: 'Reserved',    bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400' },
  sold:        { label: 'Sold',        bg: 'bg-sand-100',    text: 'text-sand-600',    dot: 'bg-sand-400' },
  // Quote
  draft:       { label: 'Draft',       bg: 'bg-sand-100',    text: 'text-sand-600',    dot: 'bg-sand-400' },
  sent:        { label: 'Sent',        bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-400' },
  accepted:    { label: 'Accepted',    bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected:    { label: 'Rejected',    bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400' },
  converted:   { label: 'Converted',   bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500' },
};

const StatusBadge = ({ status }) => {
  const cfg = configs[status] || { label: status, bg: 'bg-sand-100', text: 'text-sand-600', dot: 'bg-sand-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
