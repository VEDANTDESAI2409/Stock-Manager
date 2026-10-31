import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Trash2, Edit2, Plus, Tag } from 'lucide-react';

const CategoryManageModal = ({ isOpen, onClose, categories, onCategoriesUpdated }) => {
  const { showSuccess, showError } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat._id);
    setName(cat.name);
    setDescription(cat.description || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Category name is required.');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name, description });
        showSuccess('Category updated.');
      } else {
        await api.post('/categories', { name, description });
        showSuccess('Category added.');
      }
      resetForm();
      onCategoriesUpdated();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.productCount > 0) {
      showError(`Cannot delete "${cat.name}". It is assigned to ${cat.productCount} product(s).`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await api.delete(`/categories/${cat._id}`);
      showSuccess('Category deleted.');
      onCategoriesUpdated();
    } catch (err) {
      showError(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Category Management"
      subtitle="Organize CCTV products into structured categories"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Form: Add or Edit */}
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-50 border border-surface-border space-y-3">
          <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-primary-500" />
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name (e.g. CCTV Camera)"
                className="w-full px-3 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
              />
            </div>
            <div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (Optional)"
                className="w-full px-3 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-sm font-medium bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs font-semibold text-content-secondary hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {editingId ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>

        {/* Existing Categories List */}
        <div>
          <h4 className="text-xs font-bold text-content-secondary uppercase mb-3">
            Existing Categories ({categories.length})
          </h4>
          <div className="divide-y divide-surface-border max-h-60 overflow-y-auto rounded-xl border border-surface-border bg-white">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="flex items-center justify-between p-3 hover:bg-slate-50 transition"
              >
                <div>
                  <span className="font-bold text-sm text-content-primary">{cat.name}</span>
                  {cat.description && (
                    <p className="text-xs text-content-secondary">{cat.description}</p>
                  )}
                  <span className="inline-block mt-1 text-[11px] font-medium text-content-muted">
                    {cat.productCount || 0} Products
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 rounded-lg text-content-secondary hover:text-primary-600 hover:bg-primary-50 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg text-content-secondary hover:text-status-danger hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryManageModal;

