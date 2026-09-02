'use client';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuickAddModal from './QuickAddModal';

export default function Shell({ children }) {
  const [quickAdd, setQuickAdd] = useState(null); // 'client' | 'case' | 'payment' | 'vendor' | null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onQuickAdd={setQuickAdd} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      {quickAdd && <QuickAddModal type={quickAdd} onClose={() => setQuickAdd(null)} />}
    </div>
  );
}
