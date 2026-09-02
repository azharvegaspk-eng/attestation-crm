'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { money, fmtDate, exportCSV, exportExcel } from '../../lib/utils';
import StatusBadge from '../../components/StatusBadge';
import Modal, { ConfirmModal } from '../../components/Modal';
import CaseForm from '../../components/CaseForm';

const STATUS_OPTIONS = ['New', 'Documents Received', 'Processing', 'Sent to Vendor', 'Pending', 'Completed', 'Returned to Client', 'Cancelled'];
const PAGE_SIZE = 15;

export default function CasesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', client: '', vendor: '', service: '', status: '', dateFrom: '', dateTo: '' });
  const [sortBy, setSortBy] = useState('Date');
  const [sortDir, setSortDir] = useState('desc');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function load() {
    setLoading(true);
    api.getCases({ ...filters, sortBy, sortDir, page, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [filters, sortBy, sortDir, page]);

  function setFilter(k, v) { setPage(1); setFilters((f) => ({ ...f, [k]: v })); }
  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }

  async function fetchAllForExport() {
    const r = await api.getCases({ ...filters, sortBy, sortDir });
    return r.rows.map((c) => ({
      'S.No': c.Case_ID, Date: fmtDate(c.Date), 'Client Name': c.Client_Name, Company: c.Company,
      Service: c.Service, Vendor: c.Vendor, 'No. of Documents': c.No_of_Documents,
      'Vendor Payment': c.Vendor_Payment, 'Client Payment': c.Client_Payment, Profit: c.Profit,
      'Document Status': c.Document_Status, 'Return Date': fmtDate(c.Actual_Return_Date || c.Expected_Return_Date),
    }));
  }

  async function doDelete() {
    try { await api.deleteCase(deleting.Case_ID); toast.success('Case deleted'); setDeleting(null); load(); }
    catch (e) { toast.error(e.message); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cases / Documents</h1>
          <p className="text-sm text-slate-500">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={async () => exportCSV('cases.csv', await fetchAllForExport())}>⬇ CSV</button>
          <button className="btn-secondary" onClick={async () => exportExcel('cases.xlsx', await fetchAllForExport())}>⬇ Excel</button>
          <button className="btn-secondary" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn-primary" onClick={() => setEditing('new')}>➕ Add Case</button>
        </div>
      </div>

      <div className="card print:hidden">
        <div className="grid grid-cols-6 gap-3">
          <input className="input col-span-2" placeholder="Search everything…" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} />
          <input className="input" placeholder="Client" value={filters.client} onChange={(e) => setFilter('client', e.target.value)} />
          <input className="input" placeholder="Vendor" value={filters.vendor} onChange={(e) => setFilter('vendor', e.target.value)} />
          <input className="input" placeholder="Service" value={filters.service} onChange={(e) => setFilter('service', e.target.value)} />
          <select className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} />
          <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-slate-100">
            {[
              ['Case_ID', 'S.No'], ['Date', 'Date'], ['Client_Name', 'Client Name'], ['Company', 'Client/Company'],
              ['Service', 'Service'], ['Vendor', 'Vendor'], ['No_of_Documents', 'Docs'], ['Vendor_Payment', 'Vendor Pmt'],
              ['Client_Payment', 'Client Pmt'], ['Profit', 'Profit'], ['Document_Status', 'Status'], ['Actual_Return_Date', 'Return Date'],
            ].map(([key, label]) => (
              <th key={key} className="th cursor-pointer select-none" onClick={() => toggleSort(key)}>
                {label} {sortBy === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
            <th className="th print:hidden">Actions</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={13} className="td text-center text-slate-400 py-8">Loading…</td></tr>}
            {!loading && !rows.length && <tr><td colSpan={13} className="td text-center text-slate-400 py-8">No cases found</td></tr>}
            {rows.map((c) => (
              <tr key={c.Case_ID} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="td font-mono text-xs">{c.Case_ID}</td>
                <td className="td">{fmtDate(c.Date)}</td>
                <td className="td font-medium">{c.Client_Name}</td>
                <td className="td">{c.Company}</td>
                <td className="td">{c.Service}</td>
                <td className="td">{c.Vendor}</td>
                <td className="td">{c.No_of_Documents}</td>
                <td className="td">{money(c.Vendor_Payment)}</td>
                <td className="td">{money(c.Client_Payment)}</td>
                <td className="td font-semibold text-emerald-600">{money(c.Profit)}</td>
                <td className="td"><StatusBadge status={c.Document_Status} /></td>
                <td className="td">{fmtDate(c.Actual_Return_Date || c.Expected_Return_Date)}</td>
                <td className="td print:hidden">
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => setViewing(c)}>View</button>
                    <button className="btn-ghost" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn-danger" onClick={() => setDeleting(c)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 print:hidden">
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {(editing) && (
        <Modal title={editing === 'new' ? 'Add New Case' : 'Edit Case'} onClose={() => setEditing(null)} width="max-w-2xl">
          <CaseForm initial={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {viewing && (
        <Modal title={`Case ${viewing.Case_ID}`} onClose={() => setViewing(null)}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(viewing).filter(([k]) => k !== 'Deleted').map(([k, v]) => (
              <div key={k}><dt className="text-slate-400 text-xs">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
            ))}
          </dl>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal message={`Delete case ${deleting.Case_ID} for ${deleting.Client_Name}?`} onCancel={() => setDeleting(null)} onConfirm={doDelete} />
      )}
    </div>
  );
}
