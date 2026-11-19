import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import useApiQuery from '../../services/useApiQuery';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Trash2,
  AlertCircle,
  Users,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  Upload,
} from 'lucide-react';

const WorkEntryModal = ({ isOpen, onClose, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
  // Multi-Karigar state: Array of Karigar IDs
  const [selectedKarigars, setSelectedKarigars] = useState(['']);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic Materials List: [{ product: '', quantity: 1 }]
  const [materials, setMaterials] = useState([{ product: '', quantity: 1 }]);

  // Photo Attachments: [{ file, previewUrl, name, size }]
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewLightboxPhoto, setPreviewLightboxPhoto] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (karigars.length > 0 && (!selectedKarigars[0] || selectedKarigars.length === 0)) {
        setSelectedKarigars([karigars[0]._id]);
      }
    } else {
      // Reset state on modal close
      photoFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      setPhotoFiles([]);
      setPreviewLightboxPhoto(null);
    }
  }, [isOpen, karigarsQuery.dataUpdatedAt]);

  // Karigar Management
  const addKarigarRow = () => {
    // Pick the first available Karigar not already selected
    const unselected = karigars.find((k) => !selectedKarigars.includes(k._id));
    setSelectedKarigars([...selectedKarigars, unselected ? unselected._id : '']);
  };

  const removeKarigarRow = (index) => {
    if (selectedKarigars.length <= 1) {
      showError('At least one technician (Karigar) must be assigned.');
      return;
    }
    setSelectedKarigars(selectedKarigars.filter((_, i) => i !== index));
  };

  const updateKarigarRow = (index, value) => {
    if (value && selectedKarigars.includes(value) && selectedKarigars[index] !== value) {
      showError('This technician is already assigned to this work entry.');
      return;
    }
    const updated = [...selectedKarigars];
    updated[index] = value;
    setSelectedKarigars(updated);
  };

  const getKarigarById = (id) => karigars.find((k) => k._id === id);

  // Material Management
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

  // Photo Handling
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        showError(`"${file.name}" is not a supported image format. Use JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showError(`"${file.name}" exceeds the 10MB file size limit.`);
        continue;
      }
      validFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
      });
    }

    setPhotoFiles((prev) => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input to allow selecting same file again if desired
  };

  const removePhoto = (index) => {
    setPhotoFiles((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate Karigars
    const validKarigars = selectedKarigars.filter(Boolean);
    if (validKarigars.length === 0) {
      showError('Please select at least one assigned technician (Karigar).');
      return;
    }
    const uniqueKarigarSet = new Set(validKarigars);
    if (uniqueKarigarSet.size !== validKarigars.length) {
      showError('Duplicate technician selected. Each Karigar can only be assigned once.');
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
      // Step 1: Upload photos if any are selected
      let uploadedPhotos = [];
      if (photoFiles.length > 0) {
        const formData = new FormData();
        photoFiles.forEach((p) => {
          formData.append('photos', p.file);
        });

        const uploadRes = await api.post('/work-entries/upload-photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data?.success) {
          uploadedPhotos = uploadRes.data.data;
        }
      }

      // Step 2: Create Work Entry with multiple Karigars & photos
      const payload = {
        workDate,
        karigar: validKarigars[0], // primary for backwards compatibility
        karigars: validKarigars,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: notes.trim(),
        materials: materials.map((m) => ({
          product: m.product,
          issuedQuantity: Number(m.quantity),
        })),
        photos: uploadedPhotos,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="New Work Entry / Material Issue"
        subtitle="Issue materials to technicians for customer CCTV installation work"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Work Date */}
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
          </div>

          {/* FEATURE 1: MULTIPLE ASSIGNED KARIGARS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary-500" />
                  Assigned Technicians (Karigars) <span className="text-status-danger">*</span>
                </label>
                <p className="text-[11px] text-content-secondary mt-0.5">
                  Assign one or more technicians working on this installation job
                </p>
              </div>
              <button
                type="button"
                onClick={addKarigarRow}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Karigar
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedKarigars.map((kId, idx) => {
                const karigarDoc = getKarigarById(kId);
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-white border border-surface-border shadow-soft-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <select
                        value={kId}
                        onChange={(e) => updateKarigarRow(idx, e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium bg-white"
                      >
                        <option value="">Select Technician...</option>
                        {karigars.map((k) => {
                          const isAlreadySelected =
                            selectedKarigars.includes(k._id) && k._id !== kId;
                          return (
                            <option
                              key={k._id}
                              value={k._id}
                              disabled={isAlreadySelected}
                            >
                              {k.fullName} {k.phone ? `(${k.phone})` : ''}{' '}
                              {isAlreadySelected ? '— Already assigned' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {karigarDoc?.phone && (
                      <span className="text-[11px] font-medium text-content-secondary px-2 py-1 bg-slate-50 rounded-lg whitespace-nowrap hidden sm:inline-block">
                        📞 {karigarDoc.phone}
                      </span>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeKarigarRow(idx)}
                        disabled={selectedKarigars.length <= 1}
                        className="p-2 text-content-secondary hover:text-status-danger rounded-lg hover:bg-rose-50 transition disabled:opacity-30"
                        title={
                          selectedKarigars.length <= 1
                            ? 'At least one technician is required'
                            : 'Remove technician'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  placeholder="Customer or business name"
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
                Materials Issued for Work <span className="text-status-danger">*</span>
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
                const isInsufficient =
                  selectedProd && Number(row.quantity) > selectedProd.currentStock;

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

          {/* FEATURE 2: WORK PHOTOS / INSTALLATION PHOTOS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-surface-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary-500" />
                  Work Photos / Installation Photos
                </label>
                <p className="text-[11px] text-content-secondary mt-0.5">
                  Attach site photos, equipment layout, or completed installation images (JPG, PNG, WebP)
                </p>
              </div>

              {/* Action Buttons: Gallery & Camera */}
              <div className="flex items-center gap-2">
                {/* Upload from Gallery */}
                <input
                  type="file"
                  ref={galleryInputRef}
                  onChange={handlePhotoSelect}
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-content-primary bg-white hover:bg-slate-100 border border-surface-border rounded-xl transition shadow-soft-sm"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                  Upload from Gallery
                </button>

                {/* Take Photo (Direct Camera on mobile / file picker fallback) */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition shadow-soft-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo
                </button>
              </div>
            </div>

            {/* Photos Preview Grid */}
            {photoFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {photoFiles.map((photo, pIdx) => (
                  <div
                    key={pIdx}
                    className="relative group rounded-xl border border-surface-border overflow-hidden bg-white shadow-soft-sm"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      onClick={() => setPreviewLightboxPhoto(photo.previewUrl)}
                      className="w-full h-24 object-cover cursor-pointer group-hover:opacity-90 transition"
                    />

                    {/* Remove Overlay Button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(pIdx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition shadow"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewLightboxPhoto(photo.previewUrl)}
                      className="absolute bottom-1.5 left-1.5 p-1 bg-black/60 hover:bg-primary-600 text-white rounded-full transition shadow"
                      title="Preview larger"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    {/* Photo Info */}
                    <div className="p-1.5 bg-white border-t border-slate-100">
                      <p className="text-[10px] font-medium text-content-primary truncate">
                        {photo.name}
                      </p>
                      <span className="text-[9px] text-content-muted block">{photo.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-white">
                <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-content-secondary font-medium">
                  No photos attached yet. Click "Upload from Gallery" or "Take Photo" to add images.
                </p>
              </div>
            )}
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
              className="px-5 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Upload className="w-4 h-4 animate-spin" />
                  Saving & Issuing Materials...
                </>
              ) : (
                'Save & Issue Materials'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lightbox for Previewing Selected Photo */}
      {previewLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewLightboxPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewLightboxPhoto}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default WorkEntryModal;
