import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import useApiQuery from '../../services/useApiQuery';
import { useToast } from '../../context/ToastContext';
import { RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';

const MaterialReturnModal = ({ isOpen, onClose, preselectedWorkEntry, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [workDetails, setWorkDetails] = useState(null);
  const [returnItems, setReturnItems] = useState([]); // [{ product, productName, unit, remainingQuantity, returnQty: 0 }]
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const activeWorkQuery = useApiQuery('/work-entries', {
    params: { status: 'ACTIVE', limit: 100 },
    enabled: isOpen,
    staleTime: 10_000,
  });
  const workItemsQuery = useApiQuery(
    `/returns/work-entry/${selectedWorkId || ''}/items`,
    { enabled: Boolean(selectedWorkId && isOpen), staleTime: 5_000 }
  );
  const activeWorkEntries = activeWorkQuery.data?.data || [];
  const fetchingItems = workItemsQuery.isLoading;

  useEffect(() => {
    if (isOpen && activeWorkQuery.data?.success) {
      if (preselectedWorkEntry) {
        setSelectedWorkId(preselectedWorkEntry._id);
      } else if (activeWorkEntries.length > 0 && !selectedWorkId) {
        setSelectedWorkId(activeWorkEntries[0]._id);
      }
    }
  }, [isOpen, activeWorkQuery.dataUpdatedAt, preselectedWorkEntry, selectedWorkId]);

  useEffect(() => {
    if (workItemsQuery.data?.success) {
      setWorkDetails(workItemsQuery.data.data.workEntry);
      setReturnItems(workItemsQuery.data.data.items.map((item) => ({ ...item, returnQty: 0 })));
    }
  }, [selectedWorkId, workItemsQuery.dataUpdatedAt]);

  useEffect(() => {
    if (workItemsQuery.error) {
      showError(workItemsQuery.error.message);
      setWorkDetails(null);
      setReturnItems([]);
    }
  }, [workItemsQuery.error]);

  const updateItemReturnQty = (index, val) => {
    const updated = [...returnItems];
    const maxVal = updated[index].remainingQuantity;
    const num = Math.min(Math.max(0, Number(val) || 0), maxVal);
    updated[index].returnQty = num;
    setReturnItems(updated);
  };

  const setAllToMax = () => {
    setReturnItems(
      returnItems.map((item) => ({
        ...item,
        returnQty: item.remainingQuantity,
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedWorkId) {
      showError('Please select a work order.');
      return;
    }

    const itemsToReturn = returnItems
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        product: it.product,
        returnedQuantity: it.returnQty,
      }));

    if (itemsToReturn.length === 0) {
      showError('Please enter a return quantity (> 0) for at least one product.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/returns', {
        workEntryId: selectedWorkId,
        karigarId: workDetails?.karigar?._id,
        returnDate,
        notes: notes.trim(),
        items: itemsToReturn,
      });

      showSuccess(res.data?.message || 'Material return processed successfully.');
      onSuccess?.();
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
      title="Material Return from Karigar"
      subtitle="Record unused CCTV materials brought back from an installation job"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Work Order */}
        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Select Original Work Order <span className="text-status-danger">*</span>
          </label>
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
          >
            <option value="">Choose active work order...</option>
            {activeWorkEntries.map((w) => (
              <option key={w._id} value={w._id}>
                {w.workOrderNumber} — {w.customerName} (Karigar: {w.karigar?.fullName})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Work Info Snapshot */}
        {workDetails && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-surface-border text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-content-secondary block">Customer:</span>
              <span className="font-bold text-content-primary text-sm">{workDetails.customerName}</span>
              <span className="text-content-muted block text-[11px]">{workDetails.customerAddress}</span>
            </div>
            <div>
              <span className="text-content-secondary block">Assigned Technician:</span>
              <span className="font-bold text-content-primary text-sm">
                {workDetails.karigar?.fullName || 'Technician'}
              </span>
            </div>
            <div>
              <span className="text-content-secondary block">Work Date:</span>
              <span className="font-bold text-content-primary">
                {new Date(workDetails.workDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )}

        {/* Returnable Items Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-content-secondary uppercase tracking-wider">
              Issued Materials & Return Quantities
            </label>
            {returnItems.length > 0 && (
              <button
                type="button"
                onClick={setAllToMax}
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition"
              >
                Return All Remaining
              </button>
            )}
          </div>

          {fetchingItems ? (
            <div className="py-8 text-center text-xs text-content-secondary">
              Loading returnable items...
            </div>
          ) : returnItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-surface-border text-center text-xs text-content-muted">
              No products found for this work order or all materials have already been returned.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-surface-border text-content-secondary uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Issued</th>
                    <th className="py-2.5 px-3 text-center">Prev Returned</th>
                    <th className="py-2.5 px-3 text-center">Remaining Returnable</th>
                    <th className="py-2.5 px-3 text-right">Return Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-content-primary">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-content-secondary">
                        {item.issuedQuantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-status-success">
                        {item.returnedQuantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                        {item.remainingQuantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={item.remainingQuantity}
                          disabled={item.remainingQuantity === 0}
                          value={item.returnQty}
                          onChange={(e) => updateItemReturnQty(idx, e.target.value)}
                          className={`w-20 px-2.5 py-1.5 rounded-lg border text-center font-bold text-xs focus:outline-none ${
                            item.remainingQuantity === 0
                              ? 'bg-slate-100 border-surface-border text-content-muted'
                              : 'bg-white border-primary-300 text-primary-700 focus:border-primary-500'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Date and Optional Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Return Date <span className="text-status-danger">*</span>
            </label>
            <input
              type="date"
              required
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Return Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Excess cable roll and 1 camera returned unused"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || returnItems.length === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {loading ? 'Processing Return...' : 'Confirm Return & Add to Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MaterialReturnModal;

