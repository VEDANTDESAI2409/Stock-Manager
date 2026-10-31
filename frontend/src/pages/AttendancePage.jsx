import React, { useState, useEffect } from 'react';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/csvExport';
import {
  CalendarCheck,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const AttendancePage = () => {
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'monthly'

  // Daily Mode States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailySheet, setDailySheet] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);

  // Monthly Mode States
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Fetch Daily Attendance
  const fetchDailyAttendance = async () => {
    setLoadingDaily(true);
    try {
      const res = await api.get(`/attendance/date/${selectedDate}`);
      if (res.data?.success) {
        setDailySheet(res.data.data);
        setSummary(res.data.summary);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    }
  }, [selectedDate, activeTab]);

  // Fetch Monthly Report
  const fetchMonthlyReport = async () => {
    setLoadingMonthly(true);
    try {
      const res = await api.get('/attendance/monthly', {
        params: { year: selectedYear, month: selectedMonth },
      });
      if (res.data?.success) {
        setMonthlyReport(res.data.data);
        setDaysInMonth(res.data.daysInMonth);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingMonthly(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport();
    }
  }, [selectedYear, selectedMonth, activeTab]);

  // Update a single karigar's status in the local daily sheet
  const handleStatusChange = (karigarId, status) => {
    setDailySheet((prev) =>
      prev.map((item) =>
        item.karigarId === karigarId ? { ...item, status } : item
      )
    );
  };

  // Mark all unmarked as Present
  const markAllPresent = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({ ...item, status: 'PRESENT' }))
    );
  };

  // Save Daily Attendance
  const handleSaveAttendance = async () => {
    setSavingDaily(true);
    try {
      const payload = {
        date: selectedDate,
        entries: dailySheet
          .filter((item) => item.status !== null)
          .map((item) => ({
            karigarId: item.karigarId,
            status: item.status,
            notes: item.notes || '',
          })),
      };

      const res = await api.post('/attendance/save', payload);
      showSuccess(res.data?.message || 'Attendance saved successfully.');
      fetchDailyAttendance();
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingDaily(false);
    }
  };

  // Export Monthly CSV
  const handleExportMonthlyCSV = () => {
    if (monthlyReport.length === 0) return;
    const flatData = monthlyReport.map((m) => ({
      'Technician Name': m.karigar.fullName,
      'Contact Number': m.karigar.phone || 'N/A',
      'Present Days': m.presentCount,
      'Half Days': m.halfDayCount,
      'Absent Days': m.absentCount,
      'Total Marked Days': m.totalRecorded,
    }));
    exportToCSV(flatData, `Monthly_Attendance_${selectedYear}_${selectedMonth}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Daily Karigar Attendance
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Mark technician attendance (Present, Absent, Half Day) and monitor monthly work participation
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-surface-border self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'daily'
                ? 'bg-white text-content-primary shadow-soft'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Daily Sheet
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'monthly'
                ? 'bg-white text-content-primary shadow-soft'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE SHEET */}
      {activeTab === 'daily' && (
        <div className="space-y-5">
          {/* Top Control Bar: Date Selector & Quick Mark All */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-content-secondary uppercase">
                Attendance Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs sm:text-sm font-bold focus:outline-none focus:border-primary-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllPresent}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingDaily}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition"
              >
                <Save className="w-3.5 h-3.5" />
                {savingDaily ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Quick Stats Pill for the Selected Date */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-surface-border shadow-soft text-center">
                <span className="text-[11px] font-semibold text-content-secondary uppercase block">
                  Total Active Technicians
                </span>
                <span className="text-xl font-extrabold text-content-primary mt-0.5 block">
                  {summary.total}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 shadow-soft text-center">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                  Present Today
                </span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
                  {summary.present}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 shadow-soft text-center">
                <span className="text-[11px] font-semibold text-amber-800 uppercase block">
                  Half Day
                </span>
                <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">
                  {summary.halfDay}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 shadow-soft text-center">
                <span className="text-[11px] font-semibold text-rose-800 uppercase block">
                  Absent
                </span>
                <span className="text-xl font-extrabold text-rose-700 mt-0.5 block">
                  {summary.absent}
                </span>
              </div>
            </div>
          )}

          {/* Attendance List */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
            {loadingDaily ? (
              <div className="py-16 text-center text-sm text-content-secondary font-medium">
                Loading technician roster for {selectedDate}...
              </div>
            ) : dailySheet.length === 0 ? (
              <EmptyState
                title="No Active Technicians"
                description="There are currently no active Karigars registered in the system."
              />
            ) : (
              <div className="divide-y divide-surface-border">
                {dailySheet.map((k) => (
                  <div
                    key={k.karigarId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-content-primary">{k.fullName}</h4>
                      {k.phone && (
                        <span className="text-xs text-content-secondary block mt-0.5">
                          {k.phone}
                        </span>
                      )}
                    </div>

                    {/* Status Toggles: Present, Absent, Half Day */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {/* Present */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(k.karigarId, 'PRESENT')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          k.status === 'PRESENT'
                            ? 'bg-status-success text-white border-status-success shadow-soft-sm'
                            : 'bg-white text-content-secondary border-surface-border hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Present
                      </button>

                      {/* Half Day */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(k.karigarId, 'HALF_DAY')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          k.status === 'HALF_DAY'
                            ? 'bg-status-warning text-white border-status-warning shadow-soft-sm'
                            : 'bg-white text-content-secondary border-surface-border hover:bg-slate-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Half Day
                      </button>

                      {/* Absent */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(k.karigarId, 'ABSENT')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          k.status === 'ABSENT'
                            ? 'bg-status-danger text-white border-status-danger shadow-soft-sm'
                            : 'bg-white text-content-secondary border-surface-border hover:bg-slate-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY ATTENDANCE REPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-5">
          {/* Month & Year Selectors + CSV Export */}
          <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs sm:text-sm font-bold focus:outline-none focus:border-primary-500 bg-white"
              >
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-xs sm:text-sm font-bold focus:outline-none focus:border-primary-500 bg-white"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportMonthlyCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Monthly Summary Table */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
            {loadingMonthly ? (
              <div className="py-16 text-center text-sm text-content-secondary font-medium">
                Loading monthly attendance matrix...
              </div>
            ) : monthlyReport.length === 0 ? (
              <EmptyState
                title="No Technicians Found"
                description="No technician records available for monthly reporting."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Technician Name</th>
                      <th className="py-3 px-3 text-center">Present</th>
                      <th className="py-3 px-3 text-center">Half Day</th>
                      <th className="py-3 px-3 text-center">Absent</th>
                      <th className="py-3 px-3 text-center">Recorded Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {monthlyReport.map((m) => (
                      <tr key={m.karigar._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-content-primary text-sm">
                          {m.karigar.fullName}
                          {m.karigar.phone && (
                            <span className="text-[11px] text-content-secondary block font-normal">
                              {m.karigar.phone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-status-success">
                          {m.presentCount}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-status-warning">
                          {m.halfDayCount}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-status-danger">
                          {m.absentCount}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-content-secondary">
                          {m.totalRecorded} / {daysInMonth}
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

export default AttendancePage;
