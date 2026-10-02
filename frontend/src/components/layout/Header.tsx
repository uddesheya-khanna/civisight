import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, FileText, History, Info, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useBackendHealth } from '../../hooks/useBackendHealth';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inspections', label: 'Inspections', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/about', label: 'About', icon: Info },
];

export const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOnline, isLoading } = useBackendHealth();

  const statusPill =
    isLoading ? null : isOnline ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Backend connected
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Backend offline
      </span>
    );

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-brand font-bold text-lg tracking-tight hover:text-brand-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand rounded-md"
        >
          <Activity className="w-5 h-5" aria-hidden="true" />
          <span>CiviSight AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
                  isActive
                    ? 'text-brand bg-brand-light'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status pill + mobile toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">{statusPill}</div>
          <button
            className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-3 space-y-1">
          {statusPill && <div className="pb-2">{statusPill}</div>}
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-brand bg-brand-light'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};
