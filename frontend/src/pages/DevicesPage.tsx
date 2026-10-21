import React, { useEffect, useState } from 'react';
import { Plus, Monitor, KeyRound, Copy, Check } from 'lucide-react';
import { deviceApi, classroomApi } from '../services/endpoints';
import type { EdgeDevice, EdgeDeviceWithKey, Classroom } from '../types';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader } from '../components/ui/index';
import { Modal } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';
import { formatDate } from '../utils/cn';

export function DevicesPage() {
  const [devices, setDevices] = useState<EdgeDevice[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ deviceCode: '', classroomId: '', softwareVersion: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issuedKey, setIssuedKey] = useState<EdgeDeviceWithKey | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const [devRes, classRes] = await Promise.all([deviceApi.list(), classroomApi.list()]);
      setDevices(devRes.data.data);
      setClassrooms(classRes.data.data.filter((c: Classroom) => c.isActive));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deviceCode.trim() || !form.classroomId) {
      setFormError('Device code and classroom are required');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await deviceApi.create({
        deviceCode: form.deviceCode.toUpperCase(),
        classroomId: form.classroomId,
        softwareVersion: form.softwareVersion || undefined,
      });
      await load();
      setShowCreate(false);
      showKey(res.data.data);
      setForm({ deviceCode: '', classroomId: '', softwareVersion: '' });
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to register device');
    } finally {
      setSubmitting(false);
    }
  };

  const showKey = (device: EdgeDeviceWithKey) => {
    setCopied(false);
    setIssuedKey(device);
  };

  const handleRegenerate = async (device: EdgeDevice) => {
    if (!window.confirm(`Issue a new key for ${device.deviceCode}? The Pi will stop working until you update its config.`)) return;
    try {
      const res = await deviceApi.regenerateKey(device.id);
      await load();
      showKey(res.data.data);
    } catch (err: any) {
      window.alert(err.response?.data?.error?.message || 'Failed to issue a new key');
    }
  };

  const copyKey = async () => {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey.apiKey);
      setCopied(true);
    } catch {
      // Clipboard API is blocked on plain-http LAN addresses; the key is still selectable
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Edge Devices"
        subtitle="Raspberry Pi RFID readers installed in classrooms"
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-device-btn">
            <Plus className="w-4 h-4" /> Register Device
          </button>
        }
      />

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-800 mb-5">
        Each Raspberry Pi signs in with its own <strong>device key</strong>. The key is shown only once, when
        the device is registered or a new key is issued. Put it in the Pi's <code>config.ini</code>.
      </div>

      {devices.length === 0 ? (
        <EmptyState
          icon={<Monitor className="w-6 h-6" />}
          title="No edge devices registered"
          description="Register Raspberry Pi edge devices for each classroom."
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Register Device</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Device Code</th>
                <th>Classroom</th>
                <th>Status</th>
                <th>Version</th>
                <th>Last Seen</th>
                <th>Key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono font-semibold text-brand-700">{d.deviceCode}</td>
                  <td>{d.classroom?.name}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="text-slate-500 text-sm">{d.softwareVersion ?? '—'}</td>
                  <td className="text-slate-500 text-sm">{d.lastSeenAt ? formatDate(d.lastSeenAt, true) : 'Never'}</td>
                  <td className="text-sm">
                    {d.hasApiKey ? <span className="text-emerald-600">Issued</span> : <span className="text-amber-600">Missing</span>}
                  </td>
                  <td className="text-right">
                    <button className="btn-secondary text-xs" onClick={() => handleRegenerate(d)}>
                      <KeyRound className="w-3.5 h-3.5" /> New key
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Register Edge Device">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="form-field">
            <label className="label">Device Code <span className="text-red-500">*</span></label>
            <input className="input font-mono" value={form.deviceCode} onChange={(e) => setForm({ ...form, deviceCode: e.target.value })} placeholder="PI-C302" />
            <p className="text-xs text-slate-400 mt-1">Uppercase letters, numbers, hyphens only (e.g., PI-C302)</p>
          </div>
          <div className="form-field">
            <label className="label">Classroom <span className="text-red-500">*</span></label>
            <select className="input" value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>
              <option value="">Select classroom</option>
              {classrooms.filter((c) => !devices.some((d) => d.classroomId === c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.building}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="label">Software Version</label>
            <input className="input font-mono" value={form.softwareVersion} onChange={(e) => setForm({ ...form, softwareVersion: e.target.value })} placeholder="1.0.0" />
          </div>
          {formError && <p className="error-text">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" className="text-white" /> : null}
              Register Device
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!issuedKey} onClose={() => setIssuedKey(null)} title={`Device key for ${issuedKey?.deviceCode ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Copy this key into the Pi's <code>config.ini</code> as <code>device_key</code>.
            It will <strong>not be shown again</strong>. If it's lost, issue a new key.
          </p>
          <div className="flex items-center gap-2">
            <input readOnly className="input font-mono text-xs" value={issuedKey?.apiKey ?? ''} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn-secondary" onClick={copyKey} aria-label="Copy key">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setIssuedKey(null)}>Done</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
