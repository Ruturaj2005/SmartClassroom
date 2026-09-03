import React, { useEffect, useState } from 'react';
import { Plus, Building2, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { classroomApi } from '../services/endpoints';
import type { Classroom } from '../types';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader } from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';

function ClassroomForm({ classroom, onSuccess, onCancel }: { classroom?: Classroom; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: classroom?.name ?? '',
    building: classroom?.building ?? '',
    floor: classroom?.floor ?? '',
    roomNumber: classroom?.roomNumber ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.building.trim()) e.building = 'Building required';
    if (!form.floor.trim()) e.floor = 'Floor required';
    if (!form.roomNumber.trim()) e.roomNumber = 'Room number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (classroom) await classroomApi.update(classroom.id, form);
      else await classroomApi.create(form);
      onSuccess();
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 form-field">
          <label className="label">Classroom Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="C-302" />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>
        <div className="form-field">
          <label className="label">Building <span className="text-red-500">*</span></label>
          <input className="input" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="C Block" />
          {errors.building && <p className="error-text">{errors.building}</p>}
        </div>
        <div className="form-field">
          <label className="label">Floor <span className="text-red-500">*</span></label>
          <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="3rd" />
          {errors.floor && <p className="error-text">{errors.floor}</p>}
        </div>
        <div className="form-field">
          <label className="label">Room Number <span className="text-red-500">*</span></label>
          <input className="input" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="302" />
          {errors.roomNumber && <p className="error-text">{errors.roomNumber}</p>}
        </div>
      </div>
      {apiError && <p className="error-text">{apiError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner size="sm" className="text-white" /> : null}
          {classroom ? 'Save Changes' : 'Create Classroom'}
        </button>
      </div>
    </form>
  );
}

export function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<Classroom | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Classroom | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    try { setClassrooms((await classroomApi.list()).data.data); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await classroomApi.setStatus(toggleTarget.id, !toggleTarget.isActive);
      await load();
      setToggleTarget(null);
    } finally { setToggling(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classrooms"
        subtitle={`${classrooms.filter((c) => c.isActive).length} active classrooms`}
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-classroom-btn">
            <Plus className="w-4 h-4" /> Add Classroom
          </button>
        }
      />

      {classrooms.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title="No classrooms yet"
          description="Add classrooms to start building your timetable."
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Classroom</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Building</th>
                <th>Floor</th>
                <th>Room</th>
                <th>Edge Device</th>
                <th>Device Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-slate-900">{c.name}</td>
                  <td>{c.building}</td>
                  <td>{c.floor}</td>
                  <td className="font-mono">{c.roomNumber}</td>
                  <td>{c.edgeDevice ? <span className="font-mono text-sm text-brand-600">{c.edgeDevice.deviceCode}</span> : <span className="text-slate-400">—</span>}</td>
                  <td>{c.edgeDevice ? <StatusBadge status={c.edgeDevice.status} /> : <span className="text-slate-400 text-sm">No device</span>}</td>
                  <td><StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost py-1 px-2" onClick={() => setEdit(c)} title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button
                        className={`btn-ghost py-1 px-2 ${c.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        onClick={() => setToggleTarget(c)}
                      >
                        {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Classroom">
        <ClassroomForm onSuccess={() => { setShowCreate(false); load(); }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {edit && (
        <Modal isOpen onClose={() => setEdit(null)} title="Edit Classroom">
          <ClassroomForm classroom={edit} onSuccess={() => { setEdit(null); load(); }} onCancel={() => setEdit(null)} />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={toggleTarget?.isActive ? 'Deactivate Classroom' : 'Activate Classroom'}
        message={`${toggleTarget?.isActive ? 'Deactivate' : 'Activate'} ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant="warning"
        isLoading={toggling}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
