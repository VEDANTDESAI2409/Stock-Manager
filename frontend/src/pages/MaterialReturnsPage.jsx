import React, { useState, useEffect } from 'react';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  RotateCcw,
  Plus,
  Calendar,
  User,
  Eye,
  CheckCircle2,
  ArrowDownLeft,
} from 'lucide-react';

// Modals
import MaterialReturnModal from '../components/returns/MaterialReturnModal';
import ReturnDetailModal from '../components/returns/ReturnDetailModal';

const MaterialReturnsPage = () => {
  const { showSuccess, showError } = useToast();

  const [returns, setReturns] = useState([]);
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKarigar, setSelectedKarigar] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kRes, rRes] = await Promise.all([
        api.get('/karigars'),
        api.get('/returns', {
          params: {
            karigar: selectedKarigar !== 'ALL' ? selectedKarigar : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: 100,
          },
        }),
      ]);

      if (kRes.data?.success) setKarigars(kRes.data.data);
      if (rRes.data?.success) setReturns(rRes.data.data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedKarigar, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Material Returns
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Track unused CCTV hardware returned by technicians and automatically restore main stock
          </p>
        </div>

        <button
          onClick={() => setIsReturnModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Record Material Return
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Karigar Filter */}
          <select
            value={selectedKarigar}
            onChange={(e) => setSelectedKarigar(e.target.value)}
            className="px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 bg-white"
          >
            <option value="ALL">All Technicians (Karigars)</option>
            {karigars.map((k) => (
              <option key={k._id} value={k._id}>
                {k.fullName}
              </option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-content-secondary font-medium hidden sm:inline">Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
            />
            <span className="text-content-muted">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Material Returns Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-content-secondary font-medium">
            Loading material return logs...
          </div>
        ) : returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No Material Returns"
            description="No returned materials recorded for the chosen filters."
            actionText="Record Material Return"
            onAction={() => setIsReturnModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Return ID & Date</th>
                  <th className="py-3 px-4">Associated Work Order</th>
                  <th className="py-3 px-4">Technician (Karigar)</th>
                  <th className="py-3 px-4">Items Returned (+Stock)</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Return Number & Date */}
                    <td className="py-3 px-4">
                      <span
                        onClick={() => setSelectedReturn(ret)}
                        className="font-bold text-content-primary hover:text-primary-600 cursor-pointer block text-sm"
                      >
                        {ret.returnNumber}
                      </span>
                      <span className="text-[11px] text-content-muted flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(ret.returnDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Work Entry & Customer */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-content-primary block">
                        {ret.workEntry?.workOrderNumber || 'Direct Return'}
                      </span>
                      <span className="text-[11px] text-content-secondary block truncate max-w-xs">
                        Customer: {ret.workEntry?.customerName || 'N/A'}
                      </span>
                    </td>

                    {/* Karigar */}
                    <td className="py-3 px-4 font-semibold text-content-primary">
                      {ret.karigar?.fullName || 'Technician'}
                    </td>

                    {/* Returned items */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {ret.items?.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold"
                          >
                            +{it.returnedQuantity} {it.productNameSnapshot || it.product?.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-content-secondary max-w-xs truncate">
                      {ret.notes || '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-slate-100 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <MaterialReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        preselectedWorkEntry={null}
        onSuccess={fetchData}
      />

      <ReturnDetailModal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
      />
    </div>
  );
};

export default MaterialReturnsPage;
