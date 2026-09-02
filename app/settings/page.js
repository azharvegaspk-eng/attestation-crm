'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import Modal, { ConfirmModal } from '../../components/Modal';

export default function SettingsPage() {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('');

  function load() {
    api.getServices().then(setServices).catch((e) => toast.error(e.message));
    api.getSettings().then((s) => { setSettings(s); setCompanyName(s.company_name || ''); setCurrency(s.currency || ''); }).catch((e) => toast.error(e.message));
  }
  useEffect(load, []);

  async function saveSettings() {
    try { await api.updateSettings({ company_name: companyName, currency }); toast.success('Settings saved'); }
    catch (e) { toast.error(e.message); }
  }

  async function doDelete() {
    try { await api.deleteService(deleting.Service_ID); toast.success('Service removed'); setDeleting(null); load(); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage services, statuses and organization details</p>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-700">Organization</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Company Name</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={saveSettings}>Save</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Services</h3>
          <button className="btn-primary" onClick={() => setEditing('new')}>➕ Add Service</button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-100">
            {['Service Name', 'Default Price', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.Service_ID} className="border-b border-slate-50">
                <td className="td font-medium">{s.Service_Name}</td>
                <td className="td">{s.Default_Price || '-'}</td>
                <td className="td">{s.Status}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => setEditing(s)}>Edit</button>
                    <button className="btn-danger" onClick={() => setDeleting(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!services.length && <tr><td colSpan={4} className="td text-center text-slate-400 py-6">No services yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-700 mb-2">Document Status Options</h3>
        <div className="flex flex-wrap gap-2">
          {(settings?.statuses || []).map((s) => <span key={s} className="badge bg-slate-100 text-slate-700">{s}</span>)}
        </div>
        <p className="text-xs text-slate-400 mt-3">Edit the "statuses" row directly in the Settings sheet to change these globally.</p>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add Service' : 'Edit Service'} onClose={() => setEditing(null)}>
          <ServiceForm initial={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && <ConfirmModal message={`Remove service "${deleting.Service_Name}"?`} onCancel={() => setDeleting(null)} onConfirm={doDelete} />}
    </div>
  );
}

function ServiceForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ Service_Name: '', Default_Price: '', Status: 'Active', ...initial });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.Service_Name) return toast.error('Service name is required');
    setSaving(true);
    try {
      if (initial?.Service_ID) await api.updateService(form);
      else await api.addService(form);
      toast.success('Saved');
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Service Name</label>
        <input className="input" value={form.Service_Name} onChange={(e) => set('Service_Name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Default Price (optional)</label>
        <input type="number" className="input" value={form.Default_Price} onChange={(e) => set('Default_Price', e.target.value)} />
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input" value={form.Status} onChange={(e) => set('Status', e.target.value)}>
          <option>Active</option><option>Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
