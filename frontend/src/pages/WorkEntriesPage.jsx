import React, { useState, useEffect } from 'react';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  Calendar,
  User,
  MapPin,
  FileText,
} from 'lucide-react';

// Modals
import WorkEntryModal from '../components/work/WorkEntryModal';
import WorkDetailModal from '../components/work/WorkDetailModal';
import CancelWorkModal from '../components/work/CancelWorkModal';
import MaterialReturnModal from '../components/returns/MaterialReturnModal';

const WorkEntriesPage = () => {
  const { showSuccess, showError } = useToast();

  const [workEntries, setWorkEntries] = useState([]);
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedKarigar, setSelectedKarigar] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailEntryId, setDetailEntryId] = useState(null);
  const [entryToCancel, setEntryToCancel] = useState(null);
  const [entryForReturn, setEntryForReturn] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kRes, wRes] = await Promise.all([
        api.get('/karigars'),
        api.get('/work-entries', {
          params: {
            customer: searchCustomer.trim() || undefined,
            karigar: selectedKarigar !== 'ALL' ? selectedKarigar : undefined,
            status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: 100,
          },
        }),
      ]);

      if (kRes.data?.success) setKarigars(kRes.data.data);
      if (wRes.data?.success) setWorkEntries(wRes.data.data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedKarigar, selectedStatus, startDate, endDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Work Entries / Material Issue
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Record CCTV equipment given to technicians for customer installation sites
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Work Entry (Issue Materials)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Customer Search */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchCustomer}
            onChange={(e) => setSearchCustomer(e.target.value)}
            placeholder="Search customer name or site location..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
          />
        </form>

        {/* Karigar Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedKarigar}
            onChange={(e) => setSelectedKarigar(e.target.value)}
            className="px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 bg-white"
          >
            <option value="ALL">All Technicians</option>
            {karigars.map((k) => (
              <option key={k._id} value={k._id}>
                {k.fullName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Date Range Inputs */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
            title="End Date"
          />
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-content-secondary font-medium">
            Loading work entries and material allocations...
          </div>
        ) : workEntries.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No Work Orders Found"
            description="No work entries match your filters or search keywords."
            actionText="Create Work Entry"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Technician (Karigar)</th>
                  <th className="py-3 px-4">Customer & Site Address</th>
                  <th className="py-3 px-4">Materials Issued</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {workEntries.map((entry) => {
                  const totalIssued = entry.materials.reduce((s, m) => s + m.issuedQuantity, 0);
                  const totalReturned = entry.materials.reduce((s, m) => s + (m.returnedQuantity || 0), 0);
                  const hasPendingReturns = totalIssued > totalReturned;

                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order & Date */}
                      <td className="py-3 px-4">
                        <span
                          onClick={() => setDetailEntryId(entry._id)}
                          className="font-bold text-content-primary hover:text-primary-600 cursor-pointer block text-sm"
                        >
                          {entry.workOrderNumber}
                        </span>
                        <span className="text-[11px] text-content-muted flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(entry.workDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Karigar */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-content-primary block text-sm">
                          {entry.karigar?.fullName || 'Technician'}
                        </span>
                        {entry.karigar?.phone && (
                          <span className="text-[11px] text-content-secondary">
                            {entry.karigar.phone}
                          </span>
                        )}
                      </td>

                      {/* Customer & Address */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-content-primary block text-sm">
                          {entry.customerName}
                        </span>
                        <span className="text-[11px] text-content-secondary flex items-center gap-1 mt-0.5 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-content-muted flex-shrink-0" />
                          {entry.customerAddress}
                        </span>
                      </td>

                      {/* Materials Summary */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {entry.materials.slice(0, 2).map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-semibold"
                            >
                              {m.issuedQuantity}x {m.productNameSnapshot || m.product?.name}
                            </span>
                          ))}
                          {entry.materials.length > 2 && (
                            <span className="text-[11px] font-bold text-content-muted self-center">
                              +{entry.materials.length - 2} more
                            </span>
                          )}
                        </div>
                        {totalReturned > 0 && (
                          <span className="text-[10px] text-status-success font-bold block mt-1">
                            ({totalReturned} item(s) returned)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            entry.status === 'COMPLETED'
                              ? 'success'
                              : entry.status === 'CANCELLED'
                              ? 'danger'
                              : 'primary'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setDetailEntryId(entry._id)}
                            className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-slate-100 transition"
                            title="View Work Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Record Material Return */}
                          {entry.status === 'ACTIVE' && hasPendingReturns && (
                            <button
                              onClick={() => setEntryForReturn(entry)}
                              className="p-1.5 rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100 transition"
                              title="Record Material Return"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Order */}
                          {entry.status === 'ACTIVE' && (
                            <button
                              onClick={() => setEntryToCancel(entry)}
                              className="p-1.5 rounded-lg text-content-secondary hover:text-status-danger hover:bg-rose-50 transition"
                              title="Cancel Work Order (Reverse Stock)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchData}
      />

      <WorkDetailModal
        isOpen={!!detailEntryId}
        onClose={() => setDetailEntryId(null)}
        workEntryId={detailEntryId}
        onOpenReturnModal={(entry) => setEntryForReturn(entry)}
      />

      <CancelWorkModal
        isOpen={!!entryToCancel}
        onClose={() => setEntryToCancel(null)}
        workEntry={entryToCancel}
        onSuccess={fetchData}
      />

      <MaterialReturnModal
        isOpen={!!entryForReturn}
        onClose={() => setEntryForReturn(null)}
        preselectedWorkEntry={entryForReturn}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default WorkEntriesPage;
