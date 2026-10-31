import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import useApiQuery from '../services/useApiQuery';
import {
  Boxes,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  Plus,
  Truck,
  RotateCcw,
  CalendarCheck,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// Modals
import ProductFormModal from '../components/stock/ProductFormModal';
import StockInModal from '../components/stock/StockInModal';
import WorkEntryModal from '../components/work/WorkEntryModal';
import MaterialReturnModal from '../components/returns/MaterialReturnModal';
import WorkDetailModal from '../components/work/WorkDetailModal';
import ProductDetailModal from '../components/stock/ProductDetailModal';

const DashboardPage = () => {
  const navigate = useNavigate();
  const dashboardQuery = useApiQuery('/reports/dashboard', { staleTime: 15_000 });
  const categoriesQuery = useApiQuery('/categories', { staleTime: 60_000 });
  const productsQuery = useApiQuery('/products', {
    params: { all: 'true' },
    staleTime: 30_000,
  });
  const data = dashboardQuery.data?.data;
  const categories = categoriesQuery.data?.data || [];
  const products = productsQuery.data?.data || [];

  // Modal States for Quick Actions
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [preselectedStockInProd, setPreselectedStockInProd] = useState(null);

  const summary = data?.summary || {
    totalProducts: 0,
    lowStockProducts: 0,
    totalKarigars: 0,
    presentToday: 0,
    absentToday: 0,
    halfDayToday: 0,
  };

  const lowStockAlerts = data?.lowStockAlerts || [];
  const recentWork = data?.recentWorkEntries || [];
  const recentReturns = data?.recentReturns || [];
  const categoryChart = data?.categoryStockChart || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            CCTV hardware inventory, technician material allocations & daily attendance
          </p>
        </div>

        {/* Quick Actions Header Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWorkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition"
          >
            <Truck className="w-3.5 h-3.5" />
            Issue Material
          </button>
          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Record Return
          </button>
        </div>
      </div>

      {/* 5 Mandatory Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Products"
          value={summary.totalProducts}
          subtitle="Inventory Catalog"
          icon={Boxes}
          color="teal"
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Low Stock"
          value={summary.lowStockProducts}
          subtitle="Need Reordering"
          icon={AlertTriangle}
          color="amber"
          onClick={() => navigate('/products?lowStock=true')}
        />
        <StatCard
          title="Active Karigars"
          value={summary.totalKarigars}
          subtitle="Total Technicians"
          icon={Users}
          color="slate"
          onClick={() => navigate('/karigars')}
        />
        <StatCard
          title="Present Today"
          value={summary.presentToday}
          subtitle={`${summary.halfDayToday} Half Day`}
          icon={UserCheck}
          color="emerald"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Absent Today"
          value={summary.absentToday}
          subtitle="Not Marked Present"
          icon={UserX}
          color="rose"
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Quick Action Buttons Row */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-surface-border shadow-soft">
        <h3 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-3">
          Quick Operations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-surface-border hover:border-primary-300 hover:bg-primary-50/50 transition group"
          >
            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-500 group-hover:text-white transition text-content-secondary mb-1.5">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-content-primary">Add Product</span>
          </button>

          <button
            onClick={() => {
              setPreselectedStockInProd(null);
              setIsStockInOpen(true);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-surface-border hover:border-primary-300 hover:bg-primary-50/50 transition group"
          >
            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-500 group-hover:text-white transition text-content-secondary mb-1.5">
              <Boxes className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-content-primary">Stock In</span>
          </button>

          <button
            onClick={() => setIsWorkModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-surface-border hover:border-primary-300 hover:bg-primary-50/50 transition group"
          >
            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-500 group-hover:text-white transition text-content-secondary mb-1.5">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-content-primary">New Work Entry</span>
          </button>

          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-surface-border hover:border-primary-300 hover:bg-primary-50/50 transition group"
          >
            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-500 group-hover:text-white transition text-content-secondary mb-1.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-content-primary">Material Return</span>
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-xl border border-surface-border hover:border-primary-300 hover:bg-primary-50/50 transition group"
          >
            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-500 group-hover:text-white transition text-content-secondary mb-1.5">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-content-primary">Mark Attendance</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Stock Chart & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Category Stock Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-surface-border shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-content-primary">Inventory by Category</h3>
              <p className="text-xs text-content-secondary">Total quantity in stock across categories</p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View Inventory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {categoryChart.length === 0 ? (
              <EmptyState title="No category data" description="Add products to visualize stock levels." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#718096' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#718096' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value} Units`, 'Current Stock']}
                  />
                  <Bar dataKey="totalStock" fill="#087F8C" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right (1 col): Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-surface-border shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-content-primary">Low Stock Alerts</h3>
            </div>
            {summary.lowStockProducts > 0 && (
              <Badge variant="warning">{summary.lowStockProducts} Critical</Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-surface-border">
            {lowStockAlerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-content-secondary">
                All inventory items are currently above minimum threshold levels.
              </div>
            ) : (
              lowStockAlerts.map((p) => (
                <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span
                      onClick={() => setSelectedProductId(p._id)}
                      className="font-bold text-content-primary hover:text-primary-600 cursor-pointer block truncate max-w-[160px]"
                    >
                      {p.name}
                    </span>
                    <span className="text-[11px] text-content-muted">
                      Min: {p.minStock} {p.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-status-danger bg-rose-50 px-2 py-0.5 rounded-md">
                      {p.currentStock} {p.unit}
                    </span>
                    <button
                      onClick={() => {
                        setPreselectedStockInProd(p);
                        setIsStockInOpen(true);
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition"
                      title="Stock In"
                    >
                      + Stock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Work Entries & Recent Material Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-white rounded-2xl p-5 border border-surface-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-content-primary">Recent Work Orders</h3>
              <p className="text-xs text-content-secondary">Technician installations & material issues</p>
            </div>
            <button
              onClick={() => navigate('/work-entries')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {recentWork.length === 0 ? (
              <EmptyState title="No work entries" description="Create a work entry to issue materials." />
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-surface-border text-content-secondary uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Order / Customer</th>
                    <th className="py-2.5 px-3">Karigar</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {recentWork.map((w) => (
                    <tr key={w._id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-content-primary block">{w.workOrderNumber}</span>
                        <span className="text-[11px] text-content-secondary block truncate max-w-[150px]">
                          {w.customerName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-content-primary">
                        {w.karigar?.fullName || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-content-primary">
                        {w.materials?.length || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedWorkId(w._id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Material Returns */}
        <div className="bg-white rounded-2xl p-5 border border-surface-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-content-primary">Recent Material Returns</h3>
              <p className="text-xs text-content-secondary">Unused products returned to warehouse</p>
            </div>
            <button
              onClick={() => navigate('/material-returns')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentReturns.length === 0 ? (
              <EmptyState title="No material returns" description="Material returns will appear here." />
            ) : (
              recentReturns.map((r) => (
                <div
                  key={r._id}
                  className="p-3 rounded-xl bg-slate-50 border border-surface-border text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-content-primary">{r.returnNumber}</span>
                      <span className="text-content-muted text-[11px]">
                        {new Date(r.returnDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <span className="text-[11px] text-content-secondary block mt-0.5">
                      Technician: {r.karigar?.fullName} &bull; Order: {r.workEntry?.workOrderNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.items?.map((it, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-bold"
                      >
                        +{it.returnedQuantity} {it.productNameSnapshot || it.product?.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals for Quick Actions */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        product={null}
        categories={categories}
      />

      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        products={products}
        preselectedProduct={preselectedStockInProd}
      />

      <WorkEntryModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
      />

      <MaterialReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        preselectedWorkEntry={null}
      />

      <WorkDetailModal
        isOpen={!!selectedWorkId}
        onClose={() => setSelectedWorkId(null)}
        workEntryId={selectedWorkId}
        onOpenReturnModal={(entry) => {
          setSelectedWorkId(null);
          setIsReturnModalOpen(true);
        }}
      />

      <ProductDetailModal
        isOpen={!!selectedProductId}
        onClose={() => setSelectedProductId(null)}
        productId={selectedProductId}
      />
    </div>
  );
};

export default DashboardPage;
