import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  RotateCcw,
  Users,
  CalendarCheck,
  FileBarChart,
  Settings,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigationItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Products / Stock', path: '/products', icon: Boxes },
  { name: 'Work / Material Issue', path: '/work-entries', icon: Truck },
  { name: 'Material Return', path: '/material-returns', icon: RotateCcw },
  { name: 'Karigars', path: '/karigars', icon: Users },
  { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = ({ isMobileOpen, closeMobileSidebar }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-sidebar text-slate-300 border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border bg-sidebar-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-300 shadow-soft">
              <ShieldCheck className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white block leading-none">
                STOCK MANAGER
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-300 block mt-1">
                CCTV Business Suite
              </span>
            </div>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-soft font-bold'
                      : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Admin User Footer & Logout */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-dark/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-sidebar-hover/40 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-500/30 text-primary-200 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary-500/50">
                {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{admin?.name || 'Admin'}</p>
                <p className="text-[11px] text-slate-400 truncate">{admin?.email || 'admin'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-sm font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

