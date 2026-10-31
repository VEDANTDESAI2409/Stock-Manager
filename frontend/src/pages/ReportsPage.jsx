import React, { useState, useEffect } from 'react';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/csvExport';
import {
  FileBarChart,
  Download,
  Filter,
  Boxes,
  Users,
  Briefcase,
  Calendar,
  Search,
} from 'lucide-react';

const ReportsPage = () => {
  const { showSuccess, showError } = useToast();

  const [activeReportTab, setActiveReportTab] = useState('stock-history'); // 'stock-history' | 'karigar-materials' | 'customer-work'

  // Master lists for filters
  const [products, setProducts] = useState([]);
  const [karigars, setKarigars] = useState([]);

  // Common Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedKarigar, setSelectedKarigar] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchCustomer, setSearchCustomer] = useState('');

  // Report Data
  const [stockHistoryData, setStockHistoryData] = useState([]);
  const [karigarMaterialData, setKarigarMaterialData] = useState([]);
  const [customerWorkData, setCustomerWorkData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial lookup data
  useEffect(() => {
    Promise.all([
      api.get('/products?all=true'),
      api.get('/karigars'),
    ])
      .then(([pRes, kRes]) => {
        if (pRes.data?.success) setProducts(pRes.data.data);
        if (kRes.data?.success) setKarigars(kRes.data.data);
      })
      .catch(console.error);
  }, []);

  // Fetch report data on tab change or filter change
  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'stock-history') {
        const res = await api.get('/reports/stock-history', {
          params: {
            productId: selectedProduct !== 'ALL' ? selectedProduct : undefined,
            type: selectedType !== 'ALL' ? selectedType : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: 200,
          },
        });
        if (res.data?.success) setStockHistoryData(res.data.data);
      } else if (activeReportTab === 'karigar-materials') {
        const res = await api.get('/reports/karigar-materials', {
          params: {
            karigarId: selectedKarigar !== 'ALL' ? selectedKarigar : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });
        if (res.data?.success) setKarigarMaterialData(res.data.data);
      } else if (activeReportTab === 'customer-work') {
        const res = await api.get('/reports/customer-work', {
          params: {
            search: searchCustomer.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });
        if (res.data?.success) setCustomerWorkData(res.data.data);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReport();
  }, [activeReportTab, selectedProduct, selectedKarigar, selectedType, startDate, endDate]);

  const handleCustomerSearch = (e) => {
    e.preventDefault();
    fetchActiveReport();
  };

  // CSV Exports
  const handleExportStockCSV = () => {
    if (stockHistoryData.length === 0) return;
    const flat = stockHistoryData.map((t) => ({
      'Transaction ID': t._id,
      Date: new Date(t.date).toLocaleDateString('en-IN'),
      Product: t.product?.name || 'N/A',
      'Transaction Type': t.type,
      'Change Type': t.changeType,
      Quantity: t.quantity,
      'Previous Stock': t.previousStock,
      'Updated Stock': t.updatedStock,
      Reason: t.reason,
    }));
    exportToCSV(flat, `Stock_Movement_History_${Date.now()}.csv`);
  };

  const handleExportKarigarMaterialCSV = () => {
    if (karigarMaterialData.length === 0) return;
    const rows = [];
    karigarMaterialData.forEach((k) => {
      k.materialList.forEach((m) => {
        rows.push({
          'Technician Name': k.karigarName,
          'Contact Phone': k.phone || 'N/A',
          'Total Installation Jobs': k.totalWorks,
          'Product Name': m.productName,
          Unit: m.unit,
          'Total Issued': m.issued,
          'Total Returned': m.returned,
          'Pending Unreturned Balance': m.pending,
        });
      });
    });
    exportToCSV(rows, `Karigar_Material_Balance_${Date.now()}.csv`);
  };

  const handleExportCustomerWorkCSV = () => {
    if (customerWorkData.length === 0) return;
    const flat = customerWorkData.map((w) => ({
      'Work Order Number': w.workOrderNumber,
      Date: new Date(w.workDate).toLocaleDateString('en-IN'),
      Customer: w.customerName,
      'Site Address': w.customerAddress,
      Karigar: w.karigar?.fullName || 'N/A',
      Status: w.status,
      'Total Materials': w.materials.length,
      Notes: w.notes || '',
    }));
    exportToCSV(flat, `Customer_Work_History_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Inventory & Work Reports
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Audit stock logs, analyze technician material balances, and view customer installation history
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-surface-border self-start sm:self-auto">
          <button
            onClick={() => setActiveReportTab('stock-history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'stock-history'
                ? 'bg-white text-content-primary shadow-soft'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Stock Movement
          </button>
          <button
            onClick={() => setActiveReportTab('karigar-materials')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'karigar-materials'
                ? 'bg-white text-content-primary shadow-soft'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Karigar Material Balance
          </button>
          <button
            onClick={() => setActiveReportTab('customer-work')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'customer-work'
                ? 'bg-white text-content-primary shadow-soft'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Customer Work History
          </button>
        </div>
      </div>

      {/* REPORT 1: STOCK MOVEMENT / AUDIT TRAIL */}
      {activeReportTab === 'stock-history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="ALL">All Transactions</option>
                <option value="STOCK_IN">STOCK_IN</option>
                <option value="STOCK_OUT">STOCK_OUT</option>
                <option value="WORK_ISSUE">WORK_ISSUE</option>
                <option value="MATERIAL_RETURN">MATERIAL_RETURN</option>
                <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
                title="End Date"
              />
            </div>

            <button
              onClick={handleExportStockCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-sm text-content-secondary font-medium">
                Generating stock movement report...
              </div>
            ) : stockHistoryData.length === 0 ? (
              <EmptyState title="No transactions found" description="Try selecting a wider date range." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Change Qty</th>
                      <th className="py-3 px-4 text-center">Stock Before &rarr; After</th>
                      <th className="py-3 px-4">Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {stockHistoryData.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-content-secondary">
                          {new Date(t.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-content-primary">
                          {t.product?.name || 'Product'}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={
                              t.type === 'STOCK_IN' || t.type === 'MATERIAL_RETURN'
                                ? 'success'
                                : t.type === 'WORK_ISSUE'
                                ? 'primary'
                                : t.type === 'STOCK_OUT'
                                ? 'danger'
                                : 'warning'
                            }
                            size="xs"
                          >
                            {t.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          <span
                            className={
                              t.changeType === 'ADD' ? 'text-status-success' : 'text-status-danger'
                            }
                          >
                            {t.changeType === 'ADD' ? `+${t.quantity}` : `-${t.quantity}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-content-secondary">
                          {t.previousStock} &rarr;{' '}
                          <span className="font-bold text-content-primary">{t.updatedStock}</span>
                        </td>
                        <td className="py-2.5 px-4 text-content-secondary max-w-xs truncate">
                          {t.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT 2: KARIGAR MATERIAL BALANCE REPORT */}
      {activeReportTab === 'karigar-materials' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedKarigar}
                onChange={(e) => setSelectedKarigar(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="ALL">All Technicians</option>
                {karigars.map((k) => (
                  <option key={k._id} value={k._id}>
                    {k.fullName}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
                title="End Date"
              />
            </div>

            <button
              onClick={handleExportKarigarMaterialCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-content-secondary font-medium bg-white rounded-2xl border border-surface-border">
                Aggregating material balances...
              </div>
            ) : karigarMaterialData.length === 0 ? (
              <EmptyState title="No material records" description="No work entries for selected filters." />
            ) : (
              karigarMaterialData.map((k) => (
                <div
                  key={k.karigarId}
                  className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden"
                >
                  <div className="p-4 bg-slate-50 border-b border-surface-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-content-primary">{k.karigarName}</h3>
                      <span className="text-xs text-content-secondary">
                        {k.phone} &bull; Total Work Orders: {k.totalWorks}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white border-b border-surface-border text-content-secondary uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Product Name</th>
                          <th className="py-2.5 px-4 text-center">Total Issued</th>
                          <th className="py-2.5 px-4 text-center">Total Returned</th>
                          <th className="py-2.5 px-4 text-center">Pending Return (Balance)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {k.materialList.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-bold text-content-primary">
                              {m.productName}
                            </td>
                            <td className="py-2.5 px-4 text-center font-medium text-content-secondary">
                              {m.issued} {m.unit}
                            </td>
                            <td className="py-2.5 px-4 text-center font-medium text-status-success">
                              {m.returned} {m.unit}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold">
                              <span
                                className={
                                  m.pending > 0
                                    ? 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full'
                                    : 'text-content-muted'
                                }
                              >
                                {m.pending} {m.unit}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REPORT 3: CUSTOMER WORK HISTORY REPORT */}
      {activeReportTab === 'customer-work' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3">
            <form onSubmit={handleCustomerSearch} className="flex items-center gap-2 flex-1 max-w-sm">
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="Search customer name or address..."
                className="w-full px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary-500 text-white rounded-xl text-xs font-bold"
              >
                Search
              </button>
            </form>

            <button
              onClick={handleExportCustomerWorkCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-sm text-content-secondary font-medium">
                Loading customer work records...
              </div>
            ) : customerWorkData.length === 0 ? (
              <EmptyState title="No customer work records found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer & Location</th>
                      <th className="py-3 px-4">Karigar</th>
                      <th className="py-3 px-4">Materials Issued</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {customerWorkData.map((w) => (
                      <tr key={w._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-content-primary block">{w.workOrderNumber}</span>
                          <span className="text-[11px] text-content-muted">
                            {new Date(w.workDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-content-primary block">{w.customerName}</span>
                          <span className="text-[11px] text-content-secondary block truncate max-w-xs">
                            {w.customerAddress}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-content-primary">
                          {w.karigar?.fullName || 'Technician'}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {w.materials?.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-medium"
                              >
                                {m.issuedQuantity}x {m.productNameSnapshot || m.product?.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant={
                              w.status === 'COMPLETED'
                                ? 'success'
                                : w.status === 'CANCELLED'
                                ? 'danger'
                                : 'primary'
                            }
                            size="xs"
                          >
                            {w.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
