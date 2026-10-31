import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const StockAdjustModal = ({ isOpen, onClose, products, preselectedProduct, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [productId, setProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedProduct) {
      setProductId(preselectedProduct._id);
      setNewQuantity(preselectedProduct.currentStock || 0);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0]._id);
      setNewQuantity(products[0].currentStock || 0);
    }
  }, [preselectedProduct, products, isOpen]);

  const selectedProduct = products.find((p) => p._id === productId);

  useEffect(() => {
    if (selectedProduct) {
      setNewQuantity(selectedProduct.currentStock || 0);
    }
  }, [productId]);

  const diff = selectedProduct ? Number(newQuantity) - selectedProduct.currentStock : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      showError('Please select a product.');
      return;
    }
    if (Number(newQuantity) < 0) {
      showError('Stock quantity cannot be negative.');
      return;
    }
    if (diff === 0) {
      showError('New quantity is identical to current stock. No change needed.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 4) {
      showError('A descriptive reason (min 4 characters) is mandatory.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/products/stock-adjust', {
        productId,
        newQuantity: Number(newQuantity),
        reason: reason.trim(),
      });
      showSuccess(`Stock for ${selectedProduct.name} adjusted to ${newQuantity}.`);
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
      title="Stock Audit & Adjustment"
      subtitle="Correct stock discrepancies with a mandatory audit justification"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Select Product <span className="text-status-danger">*</span>
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (Current: {p.currentStock} {p.unit})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-surface-border text-xs">
            <div>
              <span className="text-content-secondary font-medium block">Current System Stock:</span>
              <span className="font-bold text-content-primary text-sm mt-0.5 block">
                {selectedProduct.currentStock} {selectedProduct.unit}
              </span>
            </div>
            <div>
              <span className="text-content-secondary font-medium block">Stock Adjustment Delta:</span>
              <span
                className={`font-bold text-sm mt-0.5 block ${
                  diff > 0
                    ? 'text-status-success'
                    : diff < 0
                    ? 'text-status-danger'
                    : 'text-content-muted'
                }`}
              >
                {diff > 0 ? `+${diff}` : diff} {selectedProduct.unit}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            New Verified Physical Count <span className="text-status-danger">*</span>
          </label>
          <input
            type="number"
            min="0"
            required
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Mandatory Audit Reason <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Annual physical inventory audit found discrepancy"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
          />
        </div>

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
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center gap-2"
          >
            {loading ? 'Adjusting...' : 'Save Stock Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
