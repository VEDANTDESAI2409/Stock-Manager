import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'teal', onClick }) => {
  const colorMap = {
    teal: {
      bg: 'bg-primary-50',
      text: 'text-primary-600',
      border: 'border-primary-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-100',
    },
  };

  const currentTheme = colorMap[color] || colorMap.teal;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-soft border border-surface-border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-content-primary mt-1 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-content-secondary mt-1 font-medium">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${currentTheme.bg} ${currentTheme.text} border ${currentTheme.border}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

