'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const STATUS_OPTIONS = ['New', 'Documents Received', 'Processing', 'Sent to Vendor', 'Pending', 'Completed', 'Returned to Client', 'Cancelled'];

export default function CaseForm({ initial, onSaved, onCancel }) {
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => ({
    Date: new Date().toISOString().slice(0, 10),
    Client_Name: '',
    Client_ID: '',
    Company: '',
    Service: '',
    Vendor: '',
    No_of_Documents: 1,
    Vendor_Payment: 0,
    Client_Payment: 0,
    Document_Status: 'New',
    Expected_Return_Date: '',
    Actual_Return_Date: '',
    Notes: '',
    ...initial,
  }));

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newServiceOpen, setNewServiceOpen] = useState(false);
  const [inlineName, setInlineName] = useState('');

  useEffect(() => {
    Promise.all([api.getClients(), api.getVendors(), api.getServices()]).then(([c, v, s]) => {
      setClients(c); setVendors(v); setServices(s);
    }).catch((e) => toast.error(e.message));
  }, []);

  const profit = useMemo(() => (Number(form.Client_Payment) || 0) - (Number(form.Vendor_Payment) || 0), [form.Client_Payment, form.Vendor_Payment]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function pickClient(name) {
    const c = clients.find((c) => c.Client_Name === name);
    set('Client_Name', name);
    if (c) { set('Client_ID', c.Client_ID); set('Company', c.Company || form.Company); }
  }

  async function addInline(kind) {
    if (!inlineName.trim()) return;
    try {
      if (kind === 'client') {
        const c = await api.addClient({ Client_Name: inlineName.trim() });
        setClients((cs) => [...cs, c]);
        pickClient(c.Client_Name);
        setNewClientOpen(false);
      } else if (kind === 'vendor') {
        const v = await api.addVendor({ Vendor_Name: inlineName.trim() });
        setVendors((vs) => [...vs, v]);
        set('Vendor', v.Vendor_Name);
        setNewVendorOpen(false);
      } else if (kind === 'service') {
        const s = await api.addService({ Service_Name: inlineName.trim() });
        setServices((ss) => [...ss, s]);
        set('Service', s.Service_Name);
        setNewServiceOpen(false);
      }
      setInlineName('');
      toast.success('Added');
    } catch (e) { toast.error(e.message); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.Client_Name) return toast.error('Client name is required');
    setSaving(true);
    try {
      const payload = { ...form, Profit: profit };
      if (initial?.Case_ID) {
        await api.updateCase({ ...payload, Case_ID: initial.Case_ID });
        toast.success('Case updated');
      } else {
        await api.addCase(payload);
        toast.success('Case added');
      }
      onSaved && onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.Date} onChange={(e) => set('Date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Document Status</label>
          <select className="input" value={form.Document_Status} onChange={(e) => set('Document_Status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label flex items-center justify-between">Client Name
          <button type="button" className="text-brand-600 text-xs font-medium" onClick={() => setNewClientOpen((v) => !v)}>+ New client</button>
        </label>
        <input list="client-list" className="input" value={form.Client_Name} onChange={(e) => pickClient(e.target.value)} placeholder="Type or select a client" required />
        <datalist id="client-list">{clients.map((c) => <option key={c.Client_ID} value={c.Client_Name} />)}</datalist>
        {newClientOpen && (
          <InlineAdd placeholder="New client name" onCancel={() => setNewClientOpen(false)} onAdd={(v) => { setInlineName(v); addInline('client'); }} />
        )}
      </div>

      <div>
        <label className="label">Client / Company</label>
        <input className="input" value={form.Company} onChange={(e) => set('Company', e.target.value)} placeholder="Optional company name" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center justify-between">Service
            <button type="button" className="text-brand-600 text-xs font-medium" onClick={() => setNewServiceOpen((v) => !v)}>+ New</button>
          </label>
          <select className="input" value={form.Service} onChange={(e) => set('Service', e.target.value)}>
            <option value="">Select service</option>
            {services.map((s) => <option key={s.Service_ID} value={s.Service_Name}>{s.Service_Name}</option>)}
          </select>
          {newServiceOpen && (
            <InlineAdd placeholder="New service name" onCancel={() => setNewServiceOpen(false)} onAdd={(v) => { setInlineName(v); addInline('service'); }} />
          )}
        </div>
        <div>
          <label className="label flex items-center justify-between">Vendor
            <button type="button" className="text-brand-600 text-xs font-medium" onClick={() => setNewVendorOpen((v) => !v)}>+ New</button>
          </label>
          <select className="input" value={form.Vendor} onChange={(e) => set('Vendor', e.target.value)}>
            <option value="">Select vendor</option>
            {vendors.map((v) => <option key={v.Vendor_ID} value={v.Vendor_Name}>{v.Vendor_Name}</option>)}
          </select>
          {newVendorOpen && (
            <InlineAdd placeholder="New vendor name" onCancel={() => setNewVendorOpen(false)} onAdd={(v) => { setInlineName(v); addInline('vendor'); }} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label"># of Documents</label>
          <input type="number" min="0" className="input" value={form.No_of_Documents} onChange={(e) => set('No_of_Documents', e.target.value)} />
        </div>
        <div>
          <label className="label">Vendor Payment</label>
          <input type="number" min="0" className="input" value={form.Vendor_Payment} onChange={(e) => set('Vendor_Payment', e.target.value)} />
        </div>
        <div>
          <label className="label">Client Payment</label>
          <input type="number" min="0" className="input" value={form.Client_Payment} onChange={(e) => set('Client_Payment', e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">Auto-calculated Profit</span>
        <span className="text-lg font-bold text-emerald-700">{profit.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Expected Return Date</label>
          <input type="date" className="input" value={form.Expected_Return_Date} onChange={(e) => set('Expected_Return_Date', e.target.value)} />
        </div>
        <div>
          <label className="label">Actual Return Date</label>
          <input type="date" className="input" value={form.Actual_Return_Date} onChange={(e) => set('Actual_Return_Date', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.Notes} onChange={(e) => set('Notes', e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : initial?.Case_ID ? 'Update Case' : 'Save Case'}</button>
      </div>
    </form>
  );
}

function InlineAdd({ placeholder, onAdd, onCancel }) {
  const [v, setV] = useState('');
  return (
    <div className="mt-2 flex gap-2">
      <input autoFocus className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
      <button type="button" className="btn-primary" onClick={() => onAdd(v)}>Add</button>
      <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}
