import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Navbar = ({ toggleMobileSidebar }) => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [businessName, setBusinessName] = useState('Stock Manager');

  useEffect(() => {
    const fetchQuickStatus = async () => {
      try {
        const [dashRes, setRes] = await Promise.all([
          api.get('/reports/dashboard').catch(() => null),
          api.get('/settings').catch(() => null),
        ]);

        if (dashRes?.data?.success) {
          setLowStockCount(dashRes.data.data.summary.lowStockProducts || 0);
        }
        if (setRes?.data?.success && setRes.data.data.settings?.businessName) {
          setBusinessName(setRes.data.data.settings.businessName);
        }
      } catch (e) {
        // Silent catch for initial load
      }
    };
    fetchQuickStatus();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-surface-border">
      {/* Left: Mobile Toggle & Business Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-slate-100 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
            {businessName}
          </span>
        </div>
      </div>

      {/* Right: Low Stock Alert Badge, Today Date & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Low Stock Quick Pill */}
        {lowStockCount > 0 && (
          <button
            onClick={() => navigate('/products?lowStock=true')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition shadow-soft-sm"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>{lowStockCount} Low Stock</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Current Date Display */}
        <div className="hidden md:block text-xs font-semibold text-content-secondary bg-slate-50 px-3 py-1.5 rounded-xl border border-surface-border">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {/* Admin Avatar Pill */}
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 pl-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs shadow-soft group-hover:scale-105 transition-transform">
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-content-primary leading-tight group-hover:text-primary-600 transition">
              {admin?.name || 'Admin'}
            </span>
            <span className="block text-[10px] text-content-secondary leading-tight">
              Administrator
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
