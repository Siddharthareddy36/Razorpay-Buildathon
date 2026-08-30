'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Clock,
  AlertOctagon,
  Users,
  Activity,
  Bot,
  Building2,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Receivables', href: '/receivables', icon: FileText },
    { name: 'Payment Commitments', href: '/commitments', icon: Clock },
    { name: 'Reconciliation', href: '/reconciliation', icon: AlertOctagon },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Activity & Audit', href: '/activity', icon: Activity },
    { name: 'Assistant', href: '/assistant', icon: Bot },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-md"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center space-x-3 mb-7 group">
            <div className="p-2 bg-sky-700 rounded-lg shadow-sm group-hover:bg-sky-800 transition-colors">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                AI Revenue Recovery
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Fintech Operations Console</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-800 font-semibold border border-sky-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-700' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">SYSTEM STATUS</span>
            <span className="flex items-center text-[11px] text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Data Updated
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Fintech Operations Console
          </div>
        </div>
      </aside>
    </>
  );
}
