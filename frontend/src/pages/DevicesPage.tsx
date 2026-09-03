import React, { useEffect, useState } from 'react';
import { Plus, Monitor } from 'lucide-react';
import { deviceApi, classroomApi } from '../services/endpoints';
import type { EdgeDevice, Classroom } from '../types';
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
      await deviceApi.create({
        deviceCode: form.deviceCode.toUpperCase(),
        classroomId: form.classroomId,
        softwareVersion: form.softwareVersion || undefined,
      });
      await load();
      setShowCreate(false);
      setForm({ deviceCode: '', classroomId: '', softwareVersion: '' });
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to register device');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Edge Devices"
        subtitle="Raspberry Pi classroom devices (future integration)"
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-device-btn">
            <Plus className="w-4 h-4" /> Register Device
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-5">
        <strong>🔧 Hardware Integration Pending:</strong> Raspberry Pi + PN532 devices are not yet connected.
        Devices registered here will be used when the hardware is installed.
        The backend API (<code>/api/v1/edge/*</code>) is fully ready.
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
                <th>Last Sync</th>
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
                  <td className="text-slate-500 text-sm">{d.lastSyncAt ? formatDate(d.lastSyncAt, true) : 'Never'}</td>
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
    </div>
  );
}
