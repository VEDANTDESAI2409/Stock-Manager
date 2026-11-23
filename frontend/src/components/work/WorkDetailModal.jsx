import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import useApiQuery from '../../services/useApiQuery';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileDown,
  LoaderCircle,
} from 'lucide-react';
import { downloadWorkEntryPdf } from '../../utils/workEntryPdf';

const WorkDetailModal = ({ isOpen, onClose, workEntryId, onOpenReturnModal }) => {
  const { showSuccess, showError } = useToast();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const workQuery = useApiQuery(`/work-entries/${workEntryId || ''}`, {
    enabled: Boolean(workEntryId && isOpen),
    staleTime: 5_000,
  });
  const data = workQuery.data?.data;
  const loading = workQuery.isLoading;

  if (!isOpen) return null;

  const entry = data?.workEntry;
  const returns = data?.returns || [];
  const photos = entry?.photos || [];

  // Determine list of assigned karigars
  const assignedKarigars =
    entry?.karigars && entry.karigars.length > 0
      ? entry.karigars
      : entry?.karigar
      ? [entry.karigar]
      : [];

  const hasRemainingReturns = entry?.materials?.some(
    (m) => m.issuedQuantity - (m.returnedQuantity || 0) > 0
  );

  const handleDownloadPdf = async () => {
    if (!entry || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const imageFailures = await downloadWorkEntryPdf(entry);
      if (imageFailures.length) {
        showError(`PDF downloaded, but ${imageFailures.length} photo(s) could not be loaded and are marked in the report.`);
      } else {
        showSuccess('Work Entry PDF downloaded successfully.');
      }
    } catch (error) {
      showError(error.message || 'Could not generate the Work Entry PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Upload additional photos to this work entry
  const handleUploadPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles = files.filter((f) => allowedTypes.includes(f.type.toLowerCase()));

    if (validFiles.length === 0) {
      showError('Please select valid JPG, PNG, or WebP images.');
      return;
    }

    const formData = new FormData();
    validFiles.forEach((file) => formData.append('photos', file));

    setUploadingPhotos(true);
    try {
      const res = await api.post(`/work-entries/${entry._id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showSuccess(res.data?.message || 'Photos attached successfully.');
      workQuery.refetch?.();
    } catch (err) {
      showError(err.message);
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  // Delete a photo from this work entry
  const handleDeletePhoto = async () => {
    if (!photoToDelete || !entry) return;
    try {
      const res = await api.delete(`/work-entries/${entry._id}/photos/${photoToDelete._id}`);
      showSuccess(res.data?.message || 'Photo removed.');
      setPhotoToDelete(null);
      if (lightboxIndex !== null) setLightboxIndex(null);
      workQuery.refetch?.();
    } catch (err) {
      showError(err.message);
    }
  };

  // Lightbox Navigation
  const handlePrevPhoto = (e) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && photos.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
    }
  };

  const handleNextPhoto = (e) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && photos.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={entry ? `Work Order #${entry.workOrderNumber}` : 'Work Order Details'}
        subtitle={entry?.customerName}
        maxWidth="max-w-4xl"
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-content-secondary">Loading details...</div>
        ) : entry ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-primary-600 disabled:cursor-wait disabled:opacity-70"
              >
                {generatingPdf ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {generatingPdf ? 'Generating PDF…' : 'Download PDF'}
              </button>
            </div>

            {/* Header Info Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-surface-border text-xs">
              <div>
                <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                  Work Date:
                </span>
                <span className="font-bold text-content-primary text-sm">
                  {new Date(entry.workDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div>
                <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-primary-500" />
                  Assigned Karigars ({assignedKarigars.length}):
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {assignedKarigars.map((k, idx) => (
                    <span
                      key={k._id || idx}
                      className="px-2 py-0.5 bg-white border border-surface-border rounded-md font-bold text-content-primary text-[11px]"
                    >
                      {k.fullName || 'Technician'}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-content-secondary font-medium flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" />
                  Status:
                </span>
                <div className="mt-0.5">
                  {entry.status === 'COMPLETED' ? (
                    <Badge variant="success">Completed</Badge>
                  ) : entry.status === 'CANCELLED' ? (
                    <Badge variant="danger">Cancelled</Badge>
                  ) : (
                    <Badge variant="primary">Active Work</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="p-3.5 rounded-xl bg-slate-50/50 border border-surface-border text-xs space-y-1">
              <p>
                <strong className="text-content-primary">Customer Location / Site:</strong>{' '}
                <span className="text-content-secondary">{entry.customerAddress}</span>
              </p>
              {entry.customerPhone && (
                <p>
                  <strong className="text-content-primary">Customer Phone:</strong>{' '}
                  <span className="text-content-secondary">{entry.customerPhone}</span>
                </p>
              )}
              {entry.notes && (
                <p>
                  <strong className="text-content-primary">Installation Notes:</strong>{' '}
                  <span className="text-content-secondary">{entry.notes}</span>
                </p>
              )}
            </div>

            {/* FEATURE 1: DETAILED KARIGARS LIST */}
            <div>
              <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary-500" />
                Assigned Technicians ({assignedKarigars.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {assignedKarigars.map((k, idx) => (
                  <div
                    key={k._id || idx}
                    className="p-3 rounded-xl bg-white border border-surface-border shadow-soft-sm flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-content-primary text-xs truncate">
                        {k.fullName || 'Technician'}
                      </p>
                      <p className="text-[11px] text-content-secondary mt-0.5">
                        {k.phone ? `📞 ${k.phone}` : 'No phone listed'}
                      </p>
                    </div>
                    <Badge variant={k.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {k.status || 'ACTIVE'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials Table */}
            <div>
              <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-2.5">
                Issued Materials Breakdown
              </h4>

              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-surface-border text-content-secondary uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Issued Qty</th>
                      <th className="py-2.5 px-3 text-center">Returned Qty</th>
                      <th className="py-2.5 px-3 text-center">Remaining Unreturned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {entry.materials.map((m) => {
                      const remaining = Math.max(0, m.issuedQuantity - (m.returnedQuantity || 0));
                      return (
                        <tr key={m._id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-content-primary">
                            {m.productNameSnapshot || m.product?.name || 'Product'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-content-primary">
                            {m.issuedQuantity} {m.unitSnapshot || m.product?.unit || 'Units'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-status-success">
                            {m.returnedQuantity || 0} {m.unitSnapshot || m.product?.unit || 'Units'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span
                              className={
                                remaining > 0
                                  ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full'
                                  : 'text-content-muted'
                              }
                            >
                              {remaining} {m.unitSnapshot || m.product?.unit || 'Units'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FEATURE 2 & 3: WORK PHOTOS / INSTALLATION PHOTOS GALLERY */}
            <div className="p-4 rounded-xl bg-slate-50 border border-surface-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary-500" />
                    Installation & Work Photos ({photos.length})
                  </h4>
                  <p className="text-[11px] text-content-secondary mt-0.5">
                    Photos of the site, installation progress, and completed equipment
                  </p>
                </div>

                {/* Upload More Photos Buttons */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={galleryInputRef}
                    onChange={handleUploadPhotos}
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhotos}
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-content-primary bg-white hover:bg-slate-100 border border-surface-border rounded-xl transition shadow-soft-sm disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                    Upload from Gallery
                  </button>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleUploadPhotos}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhotos}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition shadow-soft-sm disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Photo
                  </button>
                </div>
              </div>

              {uploadingPhotos && (
                <div className="py-2 text-center text-xs font-medium text-primary-600 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 animate-spin" />
                  Uploading new photos to work order...
                </div>
              )}

              {/* Photo Gallery Grid */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo._id || pIdx}
                      className="group relative rounded-xl border border-surface-border overflow-hidden bg-white shadow-soft-sm hover:shadow transition"
                    >
                      <img
                        src={photo.url}
                        alt={photo.originalName || 'Work Photo'}
                        onClick={() => setLightboxIndex(pIdx)}
                        className="w-full h-28 object-cover cursor-pointer group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />

                      {/* Hover Overlay Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(pIdx)}
                          className="p-1.5 bg-white text-slate-800 rounded-full hover:bg-primary-500 hover:text-white transition shadow"
                          title="View enlarged"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoToDelete(photo)}
                          className="p-1.5 bg-white text-rose-600 rounded-full hover:bg-rose-600 hover:text-white transition shadow"
                          title="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sub-label */}
                      <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-content-primary font-medium truncate max-w-[120px]">
                          {photo.originalName || photo.filename}
                        </span>
                        <span className="text-content-muted">
                          {photo.uploadedAt
                            ? new Date(photo.uploadedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center bg-white">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-content-secondary font-medium">
                    No installation photos attached to this work order yet.
                  </p>
                  <p className="text-[11px] text-content-muted mt-0.5">
                    Use the buttons above to upload photos from your device gallery or capture them with your mobile camera.
                  </p>
                </div>
              )}
            </div>

            {/* Associated Material Returns History */}
            {returns.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-primary-500" />
                  Material Returns Logged Against This Work Order ({returns.length})
                </h4>
                <div className="space-y-2">
                  {returns.map((ret) => (
                    <div
                      key={ret._id}
                      className="p-3 rounded-xl bg-slate-50 border border-surface-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-content-primary">{ret.returnNumber}</span>
                        <span className="text-content-muted ml-2">
                          {new Date(ret.returnDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {ret.karigar?.fullName && (
                          <span className="text-content-secondary ml-2 font-medium">
                            (Returned by {ret.karigar.fullName})
                          </span>
                        )}
                        {ret.notes && (
                          <p className="text-[11px] text-content-secondary mt-0.5">{ret.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ret.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-800 text-[11px] font-medium"
                          >
                            +{it.returnedQuantity} {it.productNameSnapshot || it.product?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between">
              <div>
                {entry.status === 'ACTIVE' && hasRemainingReturns && onOpenReturnModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReturnModal(entry);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3.5 py-2 rounded-xl transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Record Return for this Work
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Lightbox Modal for Photo Gallery */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-medium">
                Photo {lightboxIndex + 1} of {photos.length} —{' '}
                {photos[lightboxIndex].originalName || photos[lightboxIndex].filename}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPhotoToDelete(photos[lightboxIndex])}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition flex items-center gap-1 text-xs"
                  title="Delete this photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                  title="Close lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Display with Prev/Next Navigation */}
            <div className="relative flex items-center justify-center">
              {photos.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition z-10"
                  title="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <img
                src={photos[lightboxIndex].url}
                alt="Enlarged installation photo"
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
              />

              {photos.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition z-10"
                  title="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPhotoToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-status-danger">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Delete Installation Photo?</h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  This photo will be removed from Work Order #{entry?.workOrderNumber}. The work order itself will remain intact.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-content-secondary hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="px-4 py-1.5 text-xs font-bold text-white bg-status-danger hover:bg-rose-700 rounded-xl transition"
              >
                Yes, Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkDetailModal;
