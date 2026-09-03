'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import Modal, { ConfirmModal } from '../../components/Modal';
import { getCurrentUser, setCurrentUser } from '../../lib/auth';

export default function SettingsPage() {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [teamUsers, setTeamUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [rates, setRates] = useState([]);
  const [editingRate, setEditingRate] = useState(null);
  const [deletingRate, setDeletingRate] = useState(null);
  const [checkingOverdue, setCheckingOverdue] = useState(false);

  function load() {
    api.getServices().then(setServices).catch((e) => toast.error(e.message));
    api.getSettings().then((s) => {
      setSettings(s);
      setCompanyName(s.company_name || '');
      setCurrency(s.currency || '');
      setFrontendUrl(s.frontend_url || '');
      setCompanyAddress(s.company_address || '');
      setCompanyPhone(s.company_phone || '');
      setCompanyEmail(s.company_email || '');
    }).catch((e) => toast.error(e.message));
    api.getUsers().then(setTeamUsers).catch(() => {});
    api.getServiceRates().then(setRates).catch(() => {});
    setMe(getCurrentUser());
  }
  useEffect(load, []);

  async function runOverdueCheck() {
    setCheckingOverdue(true);
    try {
      const r = await api.runOverdueCheck();
      toast.success(`${r.overdueCount} overdue case(s) found — reminders sent to: ${r.remindersSentTo.join(', ') || 'no one (no email on file)'}`);
    } catch (e) { toast.error(e.message); } finally { setCheckingOverdue(false); }
  }

  async function doDeleteRate() {
    try { await api.deleteServiceRate(deletingRate.Rate_ID); toast.success('Rate removed'); setDeletingRate(null); load(); }
    catch (e) { toast.error(e.message); }
  }

  async function saveSettings() {
    try {
      await api.updateSettings({ company_name: companyName, currency, frontend_url: frontendUrl, company_address: companyAddress, company_phone: companyPhone, company_email: companyEmail });
      toast.success('Settings saved');
    }
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
        <div>
          <label className="label">Public CRM URL (for invoice QR codes)</label>
          <input className="input" placeholder="https://your-crm.vercel.app" value={frontendUrl} onChange={(e) => setFrontendUrl(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">This is your deployed Vercel link. It's used to build the QR code/status link printed on client invoices — e.g. {frontendUrl || 'https://your-crm.vercel.app'}/status/CS-0001</p>
        </div>
        <div>
          <label className="label">Company Address</label>
          <input className="input" placeholder="Head Office - Islamabad | Office No. ..." value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Company Phone</label>
            <input className="input" placeholder="+92 3XX XXXXXXX" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Company Email</label>
            <input className="input" placeholder="info@avenzaconsultancy.pk" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400">These appear on every invoice, next to your logo.</p>
        <button className="btn-primary" onClick={saveSettings}>Save</button>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-700">Team & Login</h3>
        <table className="w-full">
          <thead><tr className="border-b border-slate-100">
            {['Username', 'Full Name', 'Role', 'Email (for overdue reminders)'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {teamUsers.map((u) => (
              <tr key={u.Username} className="border-b border-slate-50">
                <td className="td font-mono text-xs">{u.Username}</td>
                <td className="td font-medium">{u.Full_Name}</td>
                <td className="td capitalize">{u.Role}</td>
                <td className="td">{u.Email || <span className="text-slate-400">not set</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {me && <ChangePasswordForm me={me} onDone={(u) => { setCurrentUser(u); toast.success('Saved'); load(); }} />}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 max-w-md">Overdue case reminders are emailed daily to whoever added the case (set the daily trigger once from the Apps Script editor — see README). You can also run a check right now:</p>
          <button className="btn-secondary" disabled={checkingOverdue} onClick={runOverdueCheck}>{checkingOverdue ? 'Checking…' : 'Run Overdue Check Now'}</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Services</h3>
          <button className="btn-primary" onClick={() => setEditing('new')}>➕ Add Service</button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-100">
            {['Service Name', 'Default Price', 'Mode', 'Steps', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.Service_ID} className="border-b border-slate-50">
                <td className="td font-medium">{s.Service_Name}</td>
                <td className="td">{s.Default_Price || '-'}</td>
                <td className="td capitalize">{s.Mode || 'simultaneous'}</td>
                <td className="td text-xs">{s.Mode === 'process' ? (s.Steps || '-') : '-'}</td>
                <td className="td">{s.Status}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => setEditing(s)}>Edit</button>
                    <button className="btn-danger" onClick={() => setDeleting(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!services.length && <tr><td colSpan={6} className="td text-center text-slate-400 py-6">No services yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-700">Service Rates (Vendor Pricing per Service)</h3>
            <p className="text-xs text-slate-400 mt-1">The Case form auto-fetches the matching rate when a Service + Vendor is chosen.</p>
          </div>
          <button className="btn-primary" onClick={() => setEditingRate('new')}>➕ Add Rate</button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-100">
            {['Service', 'Vendor', 'Rate', 'Turnaround (days)', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.Rate_ID} className="border-b border-slate-50">
                <td className="td font-medium">{r.Service_Name}</td>
                <td className="td">{r.Vendor_Name}</td>
                <td className="td">{r.Rate}</td>
                <td className="td">{r.Turnaround_Days || '-'}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => setEditingRate(r)}>Edit</button>
                    <button className="btn-danger" onClick={() => setDeletingRate(r)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rates.length && <tr><td colSpan={5} className="td text-center text-slate-400 py-6">No rates yet</td></tr>}
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

      {editingRate && (
        <Modal title={editingRate === 'new' ? 'Add Service Rate' : 'Edit Service Rate'} onClose={() => setEditingRate(null)}>
          <ServiceRateForm initial={editingRate === 'new' ? undefined : editingRate} services={services} onSaved={() => { setEditingRate(null); load(); }} onCancel={() => setEditingRate(null)} />
        </Modal>
      )}
      {deletingRate && <ConfirmModal message={`Remove rate for "${deletingRate.Service_Name}" / "${deletingRate.Vendor_Name}"?`} onCancel={() => setDeletingRate(null)} onConfirm={doDeleteRate} />}
    </div>
  );
}

function ChangePasswordForm({ me, onDone }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState(me.email || '');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!newPassword && email === (me.email || '')) return toast.error('Enter a new password or change your email first');
    setSaving(true);
    try {
      const updated = await api.updateUser({ username: me.username, currentPassword, newPassword: newPassword || undefined, Email: email });
      onDone({ ...updated, email: updated.email });
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="border-t border-slate-100 pt-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">My Profile ({me.fullName})</h4>
      <div className="grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="label">My Email (for overdue reminders)</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label">Current Password</label>
          <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">New Password (optional)</label>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button disabled={saving} className="btn-primary h-fit">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

function ServiceForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ Service_Name: '', Default_Price: '', Status: 'Active', Mode: 'simultaneous', Steps: '', ...initial });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.Service_Name) return toast.error('Service name is required');
    if (form.Mode === 'process' && !String(form.Steps || '').trim()) return toast.error('List the process steps, e.g. IBCC, MOFA, UAE Embassy');
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
        <label className="label">Mode</label>
        <select className="input" value={form.Mode} onChange={(e) => set('Mode', e.target.value)}>
          <option value="simultaneous">Simultaneous (single vendor, single step)</option>
          <option value="process">Process (multiple sequential stages)</option>
        </select>
      </div>
      {form.Mode === 'process' && (
        <div>
          <label className="label">Steps (comma-separated, in order)</label>
          <input className="input" placeholder="e.g. IBCC, HEC, MOFA, UAE Embassy" value={form.Steps} onChange={(e) => set('Steps', e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Each case using this service moves through these stages one at a time, via "Advance Stage" on the Cases page.</p>
        </div>
      )}
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

function ServiceRateForm({ initial, services, onSaved, onCancel }) {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ Service_Name: '', Vendor_Name: '', Rate: '', Turnaround_Days: '', ...initial });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  useEffect(() => { api.getVendors().then(setVendors).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.Service_Name || !form.Vendor_Name) return toast.error('Service and Vendor are required');
    setSaving(true);
    try {
      if (initial?.Rate_ID) await api.updateServiceRate(form);
      else await api.addServiceRate(form);
      toast.success('Saved');
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Service</label>
          <select className="input" value={form.Service_Name} onChange={(e) => set('Service_Name', e.target.value)} required>
            <option value="">Select service</option>
            {services.map((s) => <option key={s.Service_ID} value={s.Service_Name}>{s.Service_Name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Vendor</label>
          <select className="input" value={form.Vendor_Name} onChange={(e) => set('Vendor_Name', e.target.value)} required>
            <option value="">Select vendor</option>
            {vendors.map((v) => <option key={v.Vendor_ID} value={v.Vendor_Name}>{v.Vendor_Name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Rate</label>
          <input type="number" className="input" value={form.Rate} onChange={(e) => set('Rate', e.target.value)} required />
        </div>
        <div>
          <label className="label">Turnaround (days)</label>
          <input type="number" className="input" value={form.Turnaround_Days} onChange={(e) => set('Turnaround_Days', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
