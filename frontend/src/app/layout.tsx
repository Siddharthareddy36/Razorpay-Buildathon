import React from 'react';
import './globals.css';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export const metadata = {
  title: 'AI Revenue Recovery & Receivables Intelligence',
  description: 'B2B Accounts Receivable Intelligence, Promise-to-Pay Monitoring, and Reconciliation Exception Console.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex antialiased">
        {/* Left Persistent Navigation Sidebar */}
        <Sidebar />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-3 px-8 text-center text-xs text-slate-500 font-medium">
            AI Revenue Recovery • Financial Operations Console
          </footer>
        </div>
      </body>
    </html>
  );
}
