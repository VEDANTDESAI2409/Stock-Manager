import React, { useState, useEffect } from 'react';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Eye,
  Edit2,
  Power,
  Briefcase,
  CheckCircle,
} from 'lucide-react';

// Modals
import KarigarModal from '../components/karigar/KarigarModal';
import KarigarDetailModal from '../components/karigar/KarigarDetailModal';

const KarigarsPage = () => {
  const { showSuccess, showError } = useToast();

  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKarigar, setEditingKarigar] = useState(null);
  const [detailKarigarId, setDetailKarigarId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/karigars', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      if (res.data?.success) {
        setKarigars(res.data.data);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleToggleStatus = async (karigar) => {
    try {
      const res = await api.patch(`/karigars/${karigar._id}/toggle-status`);
      showSuccess(res.data?.message || 'Status updated');
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Karigars (CCTV Technicians)
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Manage technician profiles, assigned materials, return reconciliations & attendance
          </p>
        </div>

        <button
          onClick={() => {
            setEditingKarigar(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Karigar
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technician by full name or phone number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 bg-white"
        >
          <option value="ALL">All Technicians</option>
          <option value="ACTIVE">ACTIVE Only</option>
          <option value="INACTIVE">INACTIVE Only</option>
        </select>
      </div>

      {/* Karigars Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-sm text-content-secondary font-medium">
            Loading Karigar technicians...
          </div>
        ) : karigars.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="No Karigars Found"
              description="No technicians registered yet or matching your search filter."
              actionText="Add New Karigar"
              onAction={() => {
                setEditingKarigar(null);
                setIsModalOpen(true);
              }}
            />
          </div>
        ) : (
          karigars.map((k) => (
            <div
              key={k._id}
              className="bg-white rounded-2xl p-5 border border-surface-border shadow-soft flex flex-col justify-between hover:shadow-soft-lg transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm border border-primary-100 shadow-soft-sm">
                      {k.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3
                        onClick={() => setDetailKarigarId(k._id)}
                        className="font-bold text-base text-content-primary hover:text-primary-600 cursor-pointer"
                      >
                        {k.fullName}
                      </h3>
                      <span className="text-xs text-content-secondary flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-content-muted" />
                        {k.phone || 'No phone recorded'}
                      </span>
                    </div>
                  </div>

                  <Badge variant={k.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {k.status}
                  </Badge>
                </div>

                {k.address && (
                  <p className="text-xs text-content-secondary flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-content-muted flex-shrink-0" />
                    <span className="truncate">{k.address}</span>
                  </p>
                )}

                <div className="bg-slate-50 rounded-xl p-2.5 border border-surface-border flex items-center justify-between text-xs mb-4">
                  <span className="text-content-secondary font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary-500" />
                    Total Installations:
                  </span>
                  <span className="font-extrabold text-content-primary text-sm">
                    {k.totalWorkEntries || 0} Jobs
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                <button
                  onClick={() => setDetailKarigarId(k._id)}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View History
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingKarigar(k);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-slate-100 transition"
                    title="Edit Information"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(k)}
                    className={`p-1.5 rounded-lg transition ${
                      k.status === 'ACTIVE'
                        ? 'text-status-danger hover:bg-rose-50'
                        : 'text-status-success hover:bg-emerald-50'
                    }`}
                    title={k.status === 'ACTIVE' ? 'Deactivate Technician' : 'Activate Technician'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <KarigarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        karigar={editingKarigar}
        onSuccess={fetchData}
      />

      <KarigarDetailModal
        isOpen={!!detailKarigarId}
        onClose={() => setDetailKarigarId(null)}
        karigarId={detailKarigarId}
      />
    </div>
  );
};

export default KarigarsPage;
