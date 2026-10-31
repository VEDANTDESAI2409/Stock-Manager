import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle } from 'lucide-react';

const CancelWorkModal = ({ isOpen, onClose, workEntry, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!workEntry) return null;

  const hasReturns = workEntry.materials?.some((m) => m.returnedQuantity > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasReturns) {
      showError('Cannot cancel a work entry that has associated material returns. Reconcile returns first.');
      return;
    }
    if (!reason.trim()) {
      showError('Please enter a cancellation reason.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/work-entries/${workEntry._id}/cancel`, {
        reason: reason.trim(),
      });
      showSuccess(`Work Order ${workEntry.workOrderNumber} was cancelled and stock has been restored.`);
      setReason('');
      onSuccess();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Work Order #${workEntry.workOrderNumber}`}
      subtitle="Safely reverse issued materials back into main warehouse stock"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {hasReturns ? (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-status-danger" />
              Cancellation Blocked
            </span>
            <p>
              This work order has materials that were already logged as returned by the technician.
              To prevent inventory mismatch, you cannot cancel this order directly.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Inventory Restoration Warning
            </span>
            <p>
              Cancelling this order will mark it as CANCELLED and automatically restore all{' '}
              {workEntry.materials?.reduce((sum, m) => sum + m.issuedQuantity, 0)} issued item(s) back
              into your current inventory.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Cancellation Reason <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            required
            disabled={hasReturns}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer cancelled installation / Duplicate entry"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium disabled:bg-slate-100"
          />
        </div>

        <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
          >
            Go Back
          </button>
          {!hasReturns && (
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-status-danger hover:bg-red-700 rounded-xl shadow-soft transition flex items-center gap-2"
            >
              {loading ? 'Reversing...' : 'Confirm Cancellation'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CancelWorkModal;
