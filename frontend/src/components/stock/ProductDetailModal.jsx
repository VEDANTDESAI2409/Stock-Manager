import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import api from '../../services/api';
import { Package, History, ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react';

const ProductDetailModal = ({ isOpen, onClose, productId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId && isOpen) {
      setLoading(true);
      api
        .get(`/products/${productId}`)
        .then((res) => {
          if (res.data?.success) setData(res.data.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [productId, isOpen]);

  if (!isOpen) return null;

  const product = data?.product;
  const transactions = data?.transactions || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product?.name || 'Product Details'}
      subtitle={`Category: ${product?.category?.name || 'Uncategorized'} | Unit: ${product?.unit || 'Piece'}`}
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-content-secondary">Loading details...</div>
      ) : product ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-surface-border">
              <span className="text-xs font-semibold text-content-secondary uppercase block">
                Current Stock
              </span>
              <span className="text-2xl font-extrabold text-content-primary mt-1 block">
                {product.currentStock}{' '}
                <span className="text-xs font-normal text-content-secondary">{product.unit}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-surface-border">
              <span className="text-xs font-semibold text-content-secondary uppercase block">
                Min Stock Alert
              </span>
              <span className="text-2xl font-extrabold text-content-primary mt-1 block">
                {product.minStock}{' '}
                <span className="text-xs font-normal text-content-secondary">{product.unit}</span>
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-slate-50 border border-surface-border">
              <span className="text-xs font-semibold text-content-secondary uppercase block">
                Stock Status
              </span>
              <div className="mt-2">
                {product.currentStock <= product.minStock ? (
                  <Badge variant="warning" size="sm">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    Low Stock Alert
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    Adequate Stock
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {product.description && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-surface-border text-xs text-content-secondary">
              <span className="font-bold text-content-primary block mb-0.5">Description:</span>
              {product.description}
            </div>
          )}

          {/* Audit / Transaction History */}
          <div>
            <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary-500" />
              Recent Inventory Audit History
            </h4>

            {transactions.length === 0 ? (
              <p className="text-xs text-content-muted py-3">No transactions recorded yet.</p>
            ) : (
              <div className="border border-surface-border rounded-xl divide-y divide-surface-border max-h-56 overflow-y-auto">
                {transactions.map((t) => (
                  <div key={t._id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          t.changeType === 'ADD'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {t.changeType === 'ADD' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-content-primary block">{t.reason}</span>
                        <span className="text-[11px] text-content-muted">
                          {new Date(t.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold block ${
                          t.changeType === 'ADD' ? 'text-status-success' : 'text-status-danger'
                        }`}
                      >
                        {t.changeType === 'ADD' ? `+${t.quantity}` : `-${t.quantity}`} {product.unit}
                      </span>
                      <span className="text-[10px] text-content-muted">
                        Stock: {t.previousStock} &rarr; {t.updatedStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-surface-border">
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

export default ProductDetailModal;
