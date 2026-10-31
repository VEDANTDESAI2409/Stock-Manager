import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import useApiQuery from '../../services/useApiQuery';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

const WorkEntryModal = ({ isOpen, onClose, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const karigarsQuery = useApiQuery('/karigars', {
    params: { status: 'ACTIVE' },
    enabled: isOpen,
    staleTime: 15_000,
  });
  const productsQuery = useApiQuery('/products', {
    params: { all: 'true' },
    enabled: isOpen,
    staleTime: 15_000,
  });
  const karigars = karigarsQuery.data?.data || [];
  const products = productsQuery.data?.data || [];

  // Form Fields
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [karigarId, setKarigarId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic Materials List: [{ product: '', quantity: 1 }]
  const [materials, setMaterials] = useState([
    { product: '', quantity: 1 },
  ]);

  useEffect(() => {
    if (isOpen && karigars.length > 0 && !karigarId) {
      setKarigarId(karigars[0]._id);
    }
  }, [isOpen, karigarsQuery.dataUpdatedAt, karigarId]);

  const addMaterialRow = () => {
    setMaterials([...materials, { product: '', quantity: 1 }]);
  };

  const removeMaterialRow = (index) => {
    if (materials.length <= 1) {
      showError('At least one product material must be present.');
      return;
    }
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const getProductById = (id) => products.find((p) => p._id === id);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!karigarId) {
      showError('Please select a technician (Karigar).');
      return;
    }
    if (!customerName.trim()) {
      showError('Customer name is required.');
      return;
    }
    if (!customerAddress.trim()) {
      showError('Customer location / installation address is required.');
      return;
    }

    // Validate materials
    for (let i = 0; i < materials.length; i++) {
      const item = materials[i];
      if (!item.product) {
        showError(`Row #${i + 1}: Please select a product.`);
        return;
      }
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        showError(`Row #${i + 1}: Quantity must be at least 1.`);
        return;
      }
      const p = getProductById(item.product);
      if (p && qty > p.currentStock) {
        showError(
          `Insufficient stock for "${p.name}". Available: ${p.currentStock} ${p.unit}, requested: ${qty} ${p.unit}.`
        );
        return;
      }
    }

    // Check for duplicate products in the list
    const selectedProdIds = materials.map((m) => m.product);
    const uniqueIds = new Set(selectedProdIds);
    if (uniqueIds.size !== selectedProdIds.length) {
      showError('Duplicate products detected in the material list. Please combine quantities into one row.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        workDate,
        karigar: karigarId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: notes.trim(),
        materials: materials.map((m) => ({
          product: m.product,
          issuedQuantity: Number(m.quantity),
        })),
      };

      const res = await api.post('/work-entries', payload);
      showSuccess(res.data?.message || 'Work entry created and stock deducted successfully.');
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
      title="New Work Entry / Material Issue"
      subtitle="Issue materials to a technician for customer CCTV installation work"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Work Date & Karigar Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Work / Issue Date <span className="text-status-danger">*</span>
            </label>
            <input
              type="date"
              required
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Assigned Karigar (Technician) <span className="text-status-danger">*</span>
            </label>
            <select
              value={karigarId}
              onChange={(e) => setKarigarId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">Select Technician</option>
              {karigars.map((k) => (
                <option key={k._id} value={k._id}>
                  {k.fullName} {k.phone ? `(${k.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-4 rounded-xl bg-slate-50 border border-surface-border space-y-3">
          <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider">
            Customer / Site Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-content-secondary uppercase mb-1">
                Customer Name / Business <span className="text-status-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. XYZ Diamond Workshop / Rajeshbhai Shah"
                className="w-full px-3 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-content-secondary uppercase mb-1">
                Customer Phone (Optional)
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98250 12345"
                className="w-full px-3 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-content-secondary uppercase mb-1">
              Installation Address / Location <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="e.g. Shop 402, Ring Road Textile Market, Surat"
              className="w-full px-3 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
            />
          </div>
        </div>

        {/* Dynamic Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-content-secondary uppercase tracking-wider">
              Materials Issued to Karigar <span className="text-status-danger">*</span>
            </label>
            <button
              type="button"
              onClick={addMaterialRow}
              className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Product
            </button>
          </div>

          <div className="space-y-2.5">
            {materials.map((row, idx) => {
              const selectedProd = getProductById(row.product);
              const isInsufficient = selectedProd && Number(row.quantity) > selectedProd.currentStock;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-white border border-surface-border shadow-soft-sm"
                >
                  {/* Product selector */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={row.product}
                      onChange={(e) => updateMaterialRow(idx, 'product', e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium bg-white"
                    >
                      <option value="">Select CCTV Product...</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (Stock: {p.currentStock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity input */}
                  <div className="w-full sm:w-36 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={row.quantity}
                      onChange={(e) => updateMaterialRow(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-sm font-bold text-center focus:outline-none ${
                        isInsufficient
                          ? 'border-status-danger text-status-danger bg-rose-50'
                          : 'border-surface-border focus:border-primary-500'
                      }`}
                    />
                    <span className="text-xs font-medium text-content-secondary w-12 truncate">
                      {selectedProd?.unit || 'Unit'}
                    </span>
                  </div>

                  {/* Remove button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeMaterialRow(idx)}
                      disabled={materials.length <= 1}
                      className="p-2 text-content-secondary hover:text-status-danger rounded-lg hover:bg-rose-50 transition disabled:opacity-30"
                      title="Remove product row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Work Notes / Installation Instructions (Optional)
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 4 cameras outdoor + 1 DVR inside security office"
            className="w-full px-3.5 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium resize-none"
          />
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
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center gap-2"
          >
            {loading ? 'Issuing Materials...' : 'Save & Issue Materials'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkEntryModal;

