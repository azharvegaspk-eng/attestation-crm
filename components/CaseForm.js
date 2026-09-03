'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

const STATUS_OPTIONS = ['New', 'Documents Received', 'Processing', 'Sent to Vendor', 'Pending', 'Completed', 'Returned to Client', 'Cancelled'];

export default function CaseForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial?.Case_ID;
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => ({
    Date: new Date().toISOString().slice(0, 10),
    Client_Name: '',
    Client_ID: '',
    Client_Type: 'Walk-in',
    Company: '',
    Service: '',
    Vendor: '',
    No_of_Documents: 1,
    Vendor_Payment: 0,
    Client_Payment: 0,
    Special_Rate_Adjustment: 0,
    Document_Status: 'New',
    Expected_Return_Date: '',
    Actual_Return_Date: '',
    Notes: '',
    Process_Mode: 'simultaneous',
    ...initial,
  }));

  const [baseRate, setBaseRate] = useState(0);
  const [stageNames, setStageNames] = useState([]); // from the selected service's Steps, when Mode=process
  const [stage0Vendor, setStage0Vendor] = useState('');
  const [stage0Rate, setStage0Rate] = useState(0);
  const [stage0Adjustment, setStage0Adjustment] = useState(0);

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newServiceOpen, setNewServiceOpen] = useState(false);
  const [inlineName, setInlineName] = useState('');

  useEffect(() => {
    Promise.all([api.getClients(), api.getVendors(), api.getServices()]).then(([c, v, s]) => {
      setClients(c); setVendors(v); setServices(s);
    }).catch((e) => toast.error(e.message));
  }, []);

  const selectedService = useMemo(() => services.find((s) => s.Service_Name === form.Service), [services, form.Service]);
  const isProcessMode = !isEdit && selectedService ? selectedService.Mode === 'process' : form.Process_Mode === 'process';

  // When a service is picked (new case only), pick up its Mode + Steps.
  useEffect(() => {
    if (isEdit || !selectedService) return;
    const mode = selectedService.Mode === 'process' ? 'process' : 'simultaneous';
    set('Process_Mode', mode);
    if (mode === 'process') {
      const names = String(selectedService.Steps || '').split(',').map((s) => s.trim()).filter(Boolean);
      setStageNames(names);
    } else {
      setStageNames([]);
    }
  }, [selectedService]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simultaneous mode: auto-fetch the Service+Vendor rate, then apply the Special Rate Adjustment on top.
  useEffect(() => {
    if (isEdit || isProcessMode || !form.Service || !form.Vendor) return;
    api.getServiceRates({ service: form.Service, vendor: form.Vendor }).then((rates) => {
      const r = rates && rates[0];
      setBaseRate(r ? Number(r.Rate) : 0);
    }).catch(() => {});
  }, [form.Service, form.Vendor, isProcessMode, isEdit]);

  useEffect(() => {
    if (isEdit || isProcessMode) return;
    set('Vendor_Payment', Number(baseRate || 0) + Number(form.Special_Rate_Adjustment || 0));
  }, [baseRate, form.Special_Rate_Adjustment, isProcessMode, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process mode: auto-fetch the rate for the first stage's vendor.
  useEffect(() => {
    if (isEdit || !isProcessMode || !form.Service || !stage0Vendor) return;
    api.getServiceRates({ service: form.Service, vendor: stage0Vendor }).then((rates) => {
      const r = rates && rates[0];
      setStage0Rate(r ? Number(r.Rate) : 0);
    }).catch(() => {});
  }, [form.Service, stage0Vendor, isProcessMode, isEdit]);

  const profit = useMemo(() => {
    const vp = isProcessMode && !isEdit ? Number(stage0Rate || 0) + Number(stage0Adjustment || 0) : Number(form.Vendor_Payment) || 0;
    return (Number(form.Client_Payment) || 0) - vp;
  }, [form.Client_Payment, form.Vendor_Payment, isProcessMode, isEdit, stage0Rate, stage0Adjustment]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function pickClient(name) {
    const c = clients.find((c) => c.Client_Name === name);
    set('Client_Name', name);
    if (c) {
      set('Client_ID', c.Client_ID);
      set('Company', c.Company || form.Company);
      set('Client_Type', c.Client_Type || 'Walk-in');
    }
  }

  async function addInline(kind) {
    if (!inlineName.trim()) return;
    try {
      if (kind === 'client') {
        const c = await api.addClient({ Client_Name: inlineName.trim(), Client_Type: form.Client_Type });
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
    if (!isEdit && isProcessMode && !stageNames.length) return toast.error('This service has no steps configured — add Steps in Settings, or switch it to Simultaneous mode');
    setSaving(true);
    try {
      const user = getCurrentUser();
      const payload = { ...form, Added_By: initial?.Added_By || user?.fullName || '' };
      if (isEdit) {
        payload.Profit = profit;
        await api.updateCase({ ...payload, Case_ID: initial.Case_ID });
        toast.success('Case updated');
      } else if (isProcessMode) {
        await api.addCase({
          ...payload,
          Process_Mode: 'process',
          Stage_Names: stageNames,
          Stage0_Vendor: stage0Vendor,
          Stage0_Rate: stage0Rate,
          Stage0_Adjustment: stage0Adjustment,
        });
        toast.success('Case added (multi-step)');
      } else {
        payload.Profit = profit;
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
          <select className="input" value={form.Document_Status} disabled={!isEdit && isProcessMode} onChange={(e) => set('Document_Status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          {!isEdit && isProcessMode && <p className="text-xs text-slate-400 mt-1">Set automatically as this case moves through its stages.</p>}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Client Type</label>
          <select className="input" value={form.Client_Type} onChange={(e) => set('Client_Type', e.target.value)}>
            <option value="Walk-in">Walk-in</option>
            <option value="Consultant">Consultant</option>
          </select>
        </div>
        <div>
          <label className="label">Client / Company</label>
          <input className="input" value={form.Company} onChange={(e) => set('Company', e.target.value)} placeholder="Optional company name" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center justify-between">Service
            <button type="button" className="text-brand-600 text-xs font-medium" onClick={() => setNewServiceOpen((v) => !v)}>+ New</button>
          </label>
          <select className="input" value={form.Service} onChange={(e) => set('Service', e.target.value)}>
            <option value="">Select service</option>
            {services.map((s) => <option key={s.Service_ID} value={s.Service_Name}>{s.Service_Name}{s.Mode === 'process' ? ' (multi-step)' : ''}</option>)}
          </select>
          {newServiceOpen && (
            <InlineAdd placeholder="New service name" onCancel={() => setNewServiceOpen(false)} onAdd={(v) => { setInlineName(v); addInline('service'); }} />
          )}
        </div>
        {!isProcessMode && (
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
        )}
      </div>

      {!isEdit && isProcessMode && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-3">
          <div className="text-sm font-semibold text-amber-800">Multi-step service — {stageNames.length} stage(s): {stageNames.join(' → ') || '(no steps configured)'}</div>
          <p className="text-xs text-amber-700">Assign the vendor for the first stage now. Later stages are assigned as you advance the case from the Cases list.</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Stage 1 Vendor ({stageNames[0] || '—'})</label>
              <select className="input" value={stage0Vendor} onChange={(e) => setStage0Vendor(e.target.value)}>
                <option value="">Select vendor</option>
                {vendors.map((v) => <option key={v.Vendor_ID} value={v.Vendor_Name}>{v.Vendor_Name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rate</label>
              <input type="number" className="input" value={stage0Rate} onChange={(e) => setStage0Rate(e.target.value)} />
            </div>
            <div>
              <label className="label">Special Adjustment (+/-)</label>
              <input type="number" className="input" value={stage0Adjustment} onChange={(e) => setStage0Adjustment(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label"># of Documents</label>
          <input type="number" min="0" className="input" value={form.No_of_Documents} onChange={(e) => set('No_of_Documents', e.target.value)} />
        </div>
        {!isProcessMode && (
          <>
            <div>
              <label className="label">Vendor Payment {baseRate > 0 && !isEdit ? <span className="text-xs text-slate-400">(rate: {baseRate})</span> : null}</label>
              <input type="number" min="0" className="input" value={form.Vendor_Payment} onChange={(e) => set('Vendor_Payment', e.target.value)} />
            </div>
            <div>
              <label className="label">Client Payment</label>
              <input type="number" min="0" className="input" value={form.Client_Payment} onChange={(e) => set('Client_Payment', e.target.value)} />
            </div>
          </>
        )}
        {isProcessMode && (
          <div className="col-span-2">
            <label className="label">Client Payment (total for the whole process)</label>
            <input type="number" min="0" className="input" value={form.Client_Payment} onChange={(e) => set('Client_Payment', e.target.value)} />
          </div>
        )}
      </div>

      {!isProcessMode && !isEdit && (
        <div>
          <label className="label">Special Rate Adjustment (+/-, on top of the auto-fetched rate)</label>
          <input type="number" className="input" value={form.Special_Rate_Adjustment} onChange={(e) => set('Special_Rate_Adjustment', e.target.value)} />
        </div>
      )}

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
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : isEdit ? 'Update Case' : 'Save Case'}</button>
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
