import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import api from '../../services/api';
import { User, MapPin, Calendar, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

const WorkDetailModal = ({ isOpen, onClose, workEntryId, onOpenReturnModal }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workEntryId && isOpen) {
      setLoading(true);
      api
        .get(`/work-entries/${workEntryId}`)
        .then((res) => {
          if (res.data?.success) setData(res.data.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [workEntryId, isOpen]);

  if (!isOpen) return null;

  const entry = data?.workEntry;
  const returns = data?.returns || [];

  const hasRemainingReturns = entry?.materials?.some(
    (m) => m.issuedQuantity - (m.returnedQuantity || 0) > 0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? `Work Order #${entry.workOrderNumber}` : 'Work Order Details'}
      subtitle={entry?.customerName}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-content-secondary">Loading details...</div>
      ) : entry ? (
        <div className="space-y-6">
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
                <User className="w-3.5 h-3.5 text-primary-500" />
                Technician (Karigar):
              </span>
              <span className="font-bold text-content-primary text-sm">
                {entry.karigar?.fullName || 'Unassigned'}
              </span>
              {entry.karigar?.phone && (
                <span className="text-content-muted block text-[11px]">{entry.karigar.phone}</span>
              )}
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
              <strong className="text-content-primary">Customer Location:</strong>{' '}
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
                <strong className="text-content-primary">Notes:</strong>{' '}
                <span className="text-content-secondary">{entry.notes}</span>
              </p>
            )}
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
                              remaining > 0 ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full' : 'text-content-muted'
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
  );
};

export default WorkDetailModal;

