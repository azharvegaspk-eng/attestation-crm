'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { money, fmtDate } from '../../lib/utils';
import Modal, { ConfirmModal } from '../../components/Modal';
import ClientForm from '../../components/ClientForm';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // client obj or 'new'
  const [deleting, setDeleting] = useState(null);

  function load() {
    setLoading(true);
    api.getClients(q).then(setClients).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  async function doDelete() {
    try {
      await api.deleteClient(deleting.Client_ID);
      toast.success('Client deleted');
      setDeleting(null);
      load();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>➕ Add Client</button>
      </div>

      <div className="card">
        <input className="input max-w-sm mb-4" placeholder="Search by name, phone, email, company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              {['Client Name', 'Phone', 'Email', 'Company', 'Total Cases', 'Total Paid', 'Pending', 'Last Activity', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="td text-center text-slate-400 py-8">Loading…</td></tr>}
              {!loading && clients.length === 0 && <tr><td colSpan={9} className="td text-center text-slate-400 py-8">No clients yet</td></tr>}
              {clients.map((c) => (
                <tr key={c.Client_ID} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="td"><Link href={`/clients/${c.Client_ID}`} className="font-medium text-brand-700 hover:underline">{c.Client_Name}</Link></td>
                  <td className="td">{c.Phone}</td>
                  <td className="td">{c.Email}</td>
                  <td className="td">{c.Company}</td>
                  <td className="td">{c.Total_Cases}</td>
                  <td className="td">{money(c.Total_Paid)}</td>
                  <td className="td text-red-600 font-medium">{money(c.Pending_Amount)}</td>
                  <td className="td">{fmtDate(c.Last_Activity)}</td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => setEditing(c)}>Edit</button>
                      <button className="btn-danger" onClick={() => setDeleting(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add Client' : 'Edit Client'} onClose={() => setEditing(null)}>
          <ClientForm initial={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <ConfirmModal message={`Delete client "${deleting.Client_Name}"? This can be restored by an admin later.`} onCancel={() => setDeleting(null)} onConfirm={doDelete} />
      )}
    </div>
  );
}
