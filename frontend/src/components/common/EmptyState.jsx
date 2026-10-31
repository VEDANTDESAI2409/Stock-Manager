import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are no items matching your criteria or currently available in the system.',
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-surface-border my-4">
      <div className="p-4 rounded-2xl bg-slate-50 text-content-muted mb-4">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-content-primary">{title}</h4>
      <p className="text-xs sm:text-sm text-content-secondary max-w-sm mt-1 mb-5">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

