import React, { useEffect, useState } from 'react';
import { Plus, CreditCard, Trash2, AlertCircle } from 'lucide-react';
import { rfidApi, facultyApi } from '../services/endpoints';
import type { RFIDCard, Faculty } from '../types';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader, Alert } from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';
import { formatDate, getRelativeTime } from '../utils/cn';

function RegisterRFIDForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [facultyId, setFacultyId] = useState('');
  const [uid, setUid] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    facultyApi.list().then((r) => setFaculty(r.data.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyId) { setError('Please select a faculty member'); return; }
    const uidPattern = /^([0-9A-Fa-f]{2}:){1,9}[0-9A-Fa-f]{2}$|^[0-9A-Fa-f]{8,20}$/;
    if (!uidPattern.test(uid.trim())) {
      setError('Invalid RFID UID format. Use hex pairs like 04:A1:B2:C3 or plain hex like 04A1B2C3');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await rfidApi.register(facultyId, uid.trim().toUpperCase());
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFaculty = faculty.find((f) => f.id === facultyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Warning label */}
      <Alert variant="info">
        <strong>🔧 Simulation / Manual UID Registration</strong>
        <br />
        This form manually registers an RFID UID. When the Raspberry Pi + PN532 hardware is available,
        the UID will be populated automatically by the device.
      </Alert>

      <div className="form-field">
        <label className="label">Faculty Member <span className="text-red-500">*</span></label>
        <select className="input" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} required>
          <option value="">Select faculty</option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({f.employeeId})</option>
          ))}
        </select>
      </div>

      {selectedFaculty && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedFaculty.name}</span></div>
            <div><span className="text-slate-500">ID:</span> <span className="font-medium font-mono">{selectedFaculty.employeeId}</span></div>
            <div><span className="text-slate-500">Dept:</span> <span className="font-medium">{selectedFaculty.department}</span></div>
          </div>
        </div>
      )}

      <div className="form-field">
        <label className="label">RFID UID <span className="text-red-500">*</span></label>
        <input
          className="input font-mono"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="04:A1:B2:C3:D4 or 04A1B2C3D4"
          aria-describedby="uid-hint"
        />
        <p id="uid-hint" className="text-xs text-slate-400 mt-1">
          Enter hex pairs separated by colons, or plain hex. Will be uppercased automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner size="sm" className="text-white" /> : <CreditCard className="w-4 h-4" />}
          Register RFID
        </button>
      </div>
    </form>
  );
}

export function RFIDPage() {
  const [cards, setCards] = useState<RFIDCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RFIDCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await rfidApi.list();
      setCards(res.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rfidApi.delete(deleteTarget.id);
      await load();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (card: RFIDCard) => {
    const newStatus = card.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await rfidApi.setStatus(card.id, newStatus);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="RFID Cards"
        subtitle={`${cards.filter((c) => c.status === 'ACTIVE').length} active cards`}
        action={
          <button className="btn-primary" onClick={() => setShowRegister(true)} id="register-rfid-btn">
            <Plus className="w-4 h-4" /> Register RFID
          </button>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-6 h-6" />}
          title="No RFID cards registered"
          description="Register RFID cards for faculty members to enable card-tap lecture delivery."
          action={<button className="btn-primary" onClick={() => setShowRegister(true)}><Plus className="w-4 h-4" /> Register RFID</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>UID</th>
                <th>Faculty</th>
                <th>Department</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className="font-mono text-sm text-slate-800">{card.uid}</td>
                  <td>
                    <div className="font-medium">{card.faculty?.name}</div>
                    <div className="text-xs text-slate-400">{card.faculty?.employeeId}</div>
                  </td>
                  <td className="text-slate-600">{card.faculty?.department}</td>
                  <td>
                    <button
                      onClick={() => handleStatusChange(card)}
                      className="focus:outline-none"
                      title={`Click to ${card.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                    >
                      <StatusBadge status={card.status} />
                    </button>
                  </td>
                  <td className="text-slate-500 text-sm">{formatDate(card.registeredAt)}</td>
                  <td className="text-slate-500 text-sm">
                    {card.lastUsedAt ? getRelativeTime(card.lastUsedAt) : '—'}
                  </td>
                  <td>
                    <button
                      className="btn-ghost py-1 px-2 text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(card)}
                      title="Delete"
                      aria-label={`Delete RFID ${card.uid}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)} title="Register RFID Card" size="md">
        <RegisterRFIDForm
          onSuccess={() => { setShowRegister(false); load(); }}
          onCancel={() => setShowRegister(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete RFID Card"
        message={`Remove RFID card ${deleteTarget?.uid} from the system? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
