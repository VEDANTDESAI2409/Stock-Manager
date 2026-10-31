import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useApiQuery from '../services/useApiQuery';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Settings,
  User,
  Lock,
  Building,
  CheckCircle,
  Database,
  Activity,
  Save,
} from 'lucide-react';

const SettingsPage = () => {
  const { admin, updateProfile, changePassword } = useAuth();
  const { showSuccess, showError } = useToast();

  // Profile State
  const [profileName, setProfileName] = useState(admin?.name || '');
  const [profileEmail, setProfileEmail] = useState(admin?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Business Details State
  const [businessName, setBusinessName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);

  // System Health State
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsQuery = useApiQuery('/settings', { staleTime: 5 * 60_000 });
  const healthQuery = useApiQuery('/health', { staleTime: 60_000 });
  const healthInfo = healthQuery.data;

  useEffect(() => {
    if (admin) {
      setProfileName(admin.name || '');
      setProfileEmail(admin.email || '');
    }
  }, [admin]);

  useEffect(() => {
    const settings = settingsQuery.data?.data?.settings;
    if (!settingsLoaded && settings) {
      setBusinessName(settings.businessName || '');
      setContactNumber(settings.contactNumber || '');
      setBusinessEmail(settings.email || '');
      setBusinessAddress(settings.address || '');
      setSettingsLoaded(true);
    }
  }, [settingsQuery.dataUpdatedAt, settingsLoaded]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name: profileName, email: profileEmail });
      showSuccess('Admin profile updated successfully.');
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      await changePassword(currentPassword, newPassword);
      showSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err.message);
    } finally {
      setChangingPass(false);
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setSavingBusiness(true);
    try {
      await api.put('/settings', {
        businessName,
        contactNumber,
        email: businessEmail,
        address: businessAddress,
      });
      showSuccess('Business settings updated successfully.');
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
          System & Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
          Configure CCTV business details, admin account security & monitor database status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Business Information */}
        <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Business Profile</h3>
                <p className="text-xs text-content-secondary">Displayed on reports and top navigation</p>
              </div>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. VisionSafe CCTV & Security Solutions"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Business Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. +91 98250 12345"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="e.g. info@visionsafecctv.com"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Office / Warehouse Address
                </label>
                <textarea
                  rows="2"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. 204, Tech Plaza, Ring Road, Surat"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBusiness}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingBusiness ? 'Saving Business Details...' : 'Save Business Details'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Card 2: Admin Profile */}
        <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-slate-100 text-content-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Admin Account</h3>
                <p className="text-xs text-content-secondary">System administrator credentials</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 px-4 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingProfile ? 'Updating Profile...' : 'Update Admin Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Database Health Pill */}
          <div className="mt-6 pt-4 border-t border-surface-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-secondary flex items-center gap-1.5 font-medium">
                <Database className="w-4 h-4 text-primary-500" />
                MongoDB Status:
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  healthInfo?.status === 'healthy'
                    ? 'text-status-success bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}
              >
                {healthInfo?.status === 'healthy' ? 'Connected & Healthy' : 'Degraded'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Change Password */}
        <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-soft md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-slate-100 text-content-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-content-primary">Security & Password</h3>
              <p className="text-xs text-content-secondary">Update your admin login password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="px-5 py-2.5 text-xs font-bold text-white bg-content-primary hover:bg-slate-800 rounded-xl shadow-soft transition"
              >
                {changingPass ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
