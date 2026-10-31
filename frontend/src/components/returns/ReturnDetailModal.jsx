import React from 'react';
import Modal from '../common/Modal';
import { Calendar, User, FileText, ArrowDownLeft } from 'lucide-react';

const ReturnDetailModal = ({ isOpen, onClose, returnRecord }) => {
  if (!returnRecord) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Return Record #${returnRecord.returnNumber}`}
      subtitle={`Associated Work Order: ${returnRecord.workEntry?.workOrderNumber || 'Direct'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Top Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-surface-border text-xs">
          <div>
            <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary-500" />
              Return Date:
            </span>
            <span className="font-bold text-content-primary text-sm">
              {new Date(returnRecord.returnDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div>
            <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5 text-primary-500" />
              Returned By (Karigar):
            </span>
            <span className="font-bold text-content-primary text-sm">
              {returnRecord.karigar?.fullName || 'Technician'}
            </span>
          </div>

          <div>
            <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-primary-500" />
              Customer Site:
            </span>
            <span className="font-bold text-content-primary text-sm">
              {returnRecord.workEntry?.customerName || 'N/A'}
            </span>
          </div>
        </div>

        {returnRecord.notes && (
          <div className="p-3 rounded-xl bg-slate-50 border border-surface-border text-xs">
            <strong className="text-content-primary">Return Reason / Note:</strong>{' '}
            <span className="text-content-secondary">{returnRecord.notes}</span>
          </div>
        )}

        {/* Returned Items List */}
        <div>
          <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-2">
            Returned Items (Restored to Inventory)
          </h4>
          <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden bg-white">
            {returnRecord.items?.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-content-primary">
                    {item.productNameSnapshot || item.product?.name || 'Product'}
                  </span>
                </div>
                <span className="font-extrabold text-status-success text-sm">
                  +{item.returnedQuantity} {item.unitSnapshot || item.product?.unit || 'Units'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReturnDetailModal;

