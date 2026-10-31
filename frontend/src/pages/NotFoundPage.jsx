import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 text-content-secondary mb-4">
        <ShieldAlert className="w-12 h-12 text-slate-400" />
      </div>
      <h1 className="text-3xl font-extrabold text-content-primary">Page Not Found</h1>
      <p className="text-sm text-content-secondary mt-1 max-w-sm mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-primary-500 hover:bg-primary-600 shadow-soft transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </button>
    </div>
  );
};

export default NotFoundPage;

