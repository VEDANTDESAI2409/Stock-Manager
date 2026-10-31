import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const KarigarModal = ({ isOpen, onClose, karigar, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    notes: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (karigar) {
      setFormData({
        fullName: karigar.fullName || '',
        phone: karigar.phone || '',
        address: karigar.address || '',
        notes: karigar.notes || '',
        status: karigar.status || 'ACTIVE',
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        address: '',
        notes: '',
        status: 'ACTIVE',
      });
    }
  }, [karigar, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showError('Karigar full name is required.');
      return;
    }

    setLoading(true);
    try {
      if (karigar) {
        await api.put(`/karigars/${karigar._id}`, formData);
        showSuccess('Karigar updated successfully.');
      } else {
        await api.post('/karigars', formData);
        showSuccess('New Karigar added successfully.');
      }
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
      title={karigar ? 'Edit Karigar Details' : 'Add New Karigar (Technician)'}
      subtitle="Register technicians who install CCTV cameras and receive materials"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Full Name <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter technician name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Mobile Number (Optional)
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
              Status <span className="text-status-danger">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="ACTIVE">ACTIVE (Available for work)</option>
              <option value="INACTIVE">INACTIVE (Deactivated)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Residential Address (Optional)
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. Varachha, Surat"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-content-secondary uppercase mb-1.5">
            Internal Notes (Optional)
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Specialized in IP cameras and wiring"
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
            {loading ? 'Saving...' : karigar ? 'Save Changes' : 'Register Karigar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default KarigarModal;

