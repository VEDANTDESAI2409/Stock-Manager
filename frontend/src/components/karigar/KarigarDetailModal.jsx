import React, { useState } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import useApiQuery from '../../services/useApiQuery';
import { User, Phone, MapPin, Calendar, Briefcase, RotateCcw, AlertTriangle } from 'lucide-react';

const KarigarDetailModal = ({ isOpen, onClose, karigarId }) => {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'work' | 'returns' | 'attendance'
  const karigarQuery = useApiQuery(`/karigars/${karigarId || ''}`, {
    enabled: Boolean(karigarId && isOpen),
    staleTime: 15_000,
  });
  const data = karigarQuery.data?.data;
  const loading = karigarQuery.isLoading;

  if (!isOpen) return null;

  const karigar = data?.karigar;
  const stats = data?.stats;
  const materialSummary = data?.materialSummary || [];
  const workEntries = data?.workEntries || [];
  const materialReturns = data?.materialReturns || [];
  const attendanceHistory = data?.attendanceHistory || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={karigar?.fullName || 'Karigar Profile'}
      subtitle={`Technician Status: ${karigar?.status || 'ACTIVE'}`}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-content-secondary">Loading profile...</div>
      ) : karigar ? (
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-surface-border text-center">
              <span className="text-[11px] font-semibold text-content-secondary uppercase block">
                Total Jobs
              </span>
              <span className="text-xl font-bold text-content-primary mt-0.5 block">
                {stats?.totalWorkOrders || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-surface-border text-center">
              <span className="text-[11px] font-semibold text-content-secondary uppercase block">
                Returns Logged
              </span>
              <span className="text-xl font-bold text-primary-600 mt-0.5 block">
                {stats?.totalReturns || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                Present Days
              </span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
                {stats?.attendance?.present || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-[11px] font-semibold text-amber-800 uppercase block">
                Half Days / Absent
              </span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                {stats?.attendance?.halfDay || 0} / {stats?.attendance?.absent || 0}
              </span>
            </div>
          </div>

          {/* Quick Contact & Details */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-surface-border text-xs">
            {karigar.phone && (
              <span className="flex items-center gap-1.5 font-medium text-content-secondary">
                <Phone className="w-3.5 h-3.5 text-primary-500" />
                {karigar.phone}
              </span>
            )}
            {karigar.address && (
              <span className="flex items-center gap-1.5 font-medium text-content-secondary">
                <MapPin className="w-3.5 h-3.5 text-primary-500" />
                {karigar.address}
              </span>
            )}
            <Badge variant={karigar.status === 'ACTIVE' ? 'success' : 'danger'}>
              {karigar.status}
            </Badge>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-surface-border text-xs font-bold space-x-4">
            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-2.5 border-b-2 transition ${
                activeTab === 'materials'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Material Balance ({materialSummary.length})
            </button>
            <button
              onClick={() => setActiveTab('work')}
              className={`pb-2.5 border-b-2 transition ${
                activeTab === 'work'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Work History ({workEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`pb-2.5 border-b-2 transition ${
                activeTab === 'returns'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Return History ({materialReturns.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-2.5 border-b-2 transition ${
                activeTab === 'attendance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Recent Attendance
            </button>
          </div>

          {/* Tab 1: Material Balance Summary */}
          {activeTab === 'materials' && (
            <div>
              {materialSummary.length === 0 ? (
                <p className="text-xs text-content-muted py-6 text-center">
                  No materials issued to this technician yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-surface-border text-content-secondary uppercase font-semibold">
                      <tr>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-center">Total Issued</th>
                        <th className="py-2 px-3 text-center">Total Returned</th>
                        <th className="py-2 px-3 text-center">Pending Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {materialSummary.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-content-primary">
                            {m.productName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-content-secondary">
                            {m.totalIssued} {m.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-status-success">
                            {m.totalReturned} {m.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span
                              className={
                                m.pendingReturn > 0
                                  ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full'
                                  : 'text-content-muted'
                              }
                            >
                              {m.pendingReturn} {m.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Work History */}
          {activeTab === 'work' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workEntries.length === 0 ? (
                <p className="text-xs text-content-muted py-6 text-center">No work entries found.</p>
              ) : (
                workEntries.map((w) => (
                  <div
                    key={w._id}
                    className="p-3 rounded-xl bg-slate-50 border border-surface-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-content-primary">{w.workOrderNumber}</span>
                      <span className="text-content-muted ml-2">
                        {new Date(w.workDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <p className="font-medium text-content-secondary mt-0.5">
                        Customer: {w.customerName} ({w.customerAddress})
                      </p>
                    </div>
                    <div>
                      <Badge
                        variant={
                          w.status === 'COMPLETED'
                            ? 'success'
                            : w.status === 'CANCELLED'
                            ? 'danger'
                            : 'primary'
                        }
                      >
                        {w.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Returns History */}
          {activeTab === 'returns' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {materialReturns.length === 0 ? (
                <p className="text-xs text-content-muted py-6 text-center">No returns recorded yet.</p>
              ) : (
                materialReturns.map((r) => (
                  <div
                    key={r._id}
                    className="p-3 rounded-xl bg-slate-50 border border-surface-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-content-primary">{r.returnNumber}</span>
                      <span className="text-content-muted ml-2">
                        {new Date(r.returnDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <p className="text-[11px] text-content-secondary mt-0.5">
                        Job: {r.workEntry?.workOrderNumber} ({r.workEntry?.customerName})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-bold"
                        >
                          +{it.returnedQuantity} {it.productNameSnapshot || it.product?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Recent Attendance */}
          {activeTab === 'attendance' && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {attendanceHistory.length === 0 ? (
                <p className="text-xs text-content-muted py-6 text-center">No attendance records yet.</p>
              ) : (
                attendanceHistory.map((att) => (
                  <div
                    key={att._id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-surface-border text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-content-primary">
                      {new Date(att.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <Badge
                      variant={
                        att.status === 'PRESENT'
                          ? 'success'
                          : att.status === 'ABSENT'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {att.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

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

export default KarigarDetailModal;

