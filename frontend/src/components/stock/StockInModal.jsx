import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const StockInModal = ({ isOpen, onClose, products, preselectedProduct, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedProduct) {
      setProductId(preselectedProduct._id);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0]._id);
    }
  }, [preselectedProduct, products, isOpen]);

  const selectedProduct = products.find((p) => p._id === productId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      showError('Please select a product.');
      return;
    }
    if (Number(quantity) <= 0) {
      showError('Quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/products/stock-in', {
        productId,
        quantity: Number(quantity),
        date,
        notes: notes.trim(),
      });
      showSuccess(`Added ${quantity} ${selectedProduct?.unit || 'units'} to ${selectedProduct?.name}.`);
      setQuantity(1);
      setNotes('');
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
      title="Stock In — Receive Materials"
      subtitle="Add newly received materials to inventory without financial entries"
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
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-primary-800 font-medium">Current Available Stock:</span>
            <span className="font-bold text-primary-900 text-sm">
              {selectedProduct.currentStock} {selectedProduct.unit}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Received Quantity <span className="text-status-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-content-muted">
                {selectedProduct?.unit || 'Units'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Receiving Date <span className="text-status-danger">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Optional Note (e.g. Batch/Delivery Ref)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received new shipment from distributor"
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
            {loading ? 'Adding...' : 'Confirm Stock In'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockInModal;

