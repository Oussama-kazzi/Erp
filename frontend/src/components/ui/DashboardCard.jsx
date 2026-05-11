import React from 'react';

const DashboardCard = ({ title, value, subtitle, icon, accent = false }) => (
  <div className={`card p-5 flex flex-col gap-3.5 transition-all duration-200 hover:shadow-warm hover:-translate-y-0.5 ${accent ? 'bg-atelier-dark border-atelier-dark' : ''}`}>
    <div className="flex items-start justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? 'bg-white/10' : 'bg-sand-100'}`}>
        {icon}
      </div>
      <svg className={`w-3.5 h-3.5 ${accent ? 'text-white/20' : 'text-sand-200'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    </div>
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] mb-1 ${accent ? 'text-white/50' : 'text-sand-400'}`}>
        {title}
      </p>
      <p className={`text-[22px] font-semibold leading-none tracking-tight ${accent ? 'text-white' : 'text-atelier-dark'}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-[11px] mt-1.5 ${accent ? 'text-white/40' : 'text-sand-400'}`}>{subtitle}</p>
      )}
    </div>
  </div>
);

export default DashboardCard;
