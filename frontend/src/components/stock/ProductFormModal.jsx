import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ProductFormModal = ({ isOpen, onClose, product, categories, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'Piece',
    initialStock: 0,
    minStock: 5,
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category?._id || product.category || '',
        unit: product.unit || 'Piece',
        initialStock: product.currentStock || 0,
        minStock: product.minStock || 5,
        description: product.description || '',
      });
    } else {
      setFormData({
        name: '',
        category: categories.length > 0 ? categories[0]._id : '',
        unit: 'Piece',
        initialStock: 0,
        minStock: 5,
        description: '',
      });
    }
  }, [product, categories, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Product name is required.');
      return;
    }
    if (!formData.category) {
      showError('Please select a category.');
      return;
    }

    setLoading(true);
    try {
      if (product) {
        // Edit existing product
        await api.put(`/products/${product._id}`, {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          minStock: Number(formData.minStock),
          description: formData.description,
        });
        showSuccess('Product updated successfully.');
      } else {
        // Create new product
        await api.post('/products', {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          initialStock: Number(formData.initialStock),
          minStock: Number(formData.minStock),
          description: formData.description,
        });
        showSuccess('Product added to inventory successfully.');
      }
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
      title={product ? 'Edit CCTV Product' : 'Add New CCTV Product'}
      subtitle={product ? 'Update product specifications' : 'Register a new product in system inventory'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Product Name <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. 2MP HD Dome Camera (IR 20m)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Category <span className="text-status-danger">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Unit of Measurement <span className="text-status-danger">*</span>
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
            >
              {['Piece', 'Box', 'Roll', 'Meter', 'Packet', 'Set'].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!product && (
            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
                Opening Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Minimum Stock Alert Level <span className="text-status-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Description / Specifications (Optional)
          </label>
          <textarea
            rows="2"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Technical details, model number, indoor/outdoor rating..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium resize-none"
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
            {loading ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;

