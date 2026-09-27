import { useEffect, useState } from 'react';
import { Plus, Search, UserCheck, UserX, Edit } from 'lucide-react';
import { facultyApi } from '../services/endpoints';
import type { Faculty } from '../types';
import {
  LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader,
} from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';

// ── Create/Edit Faculty Form ──────────────────────────────────────────────────

function FacultyForm({
  faculty,
  onSuccess,
  onCancel,
}: {
  faculty?: Faculty;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!faculty;
  const [form, setForm] = useState({
    email: faculty?.user?.email ?? '',
    password: '',
    employeeId: faculty?.employeeId ?? '',
    name: faculty?.name ?? '',
    department: faculty?.department ?? '',
    designation: faculty?.designation ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
    if (!isEdit && form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!form.employeeId.trim()) e.employeeId = 'Employee ID required';
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.department.trim()) e.department = 'Department required';
    if (!form.designation.trim()) e.designation = 'Designation required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');
    try {
      if (isEdit) {
        await facultyApi.update(faculty!.id, {
          name: form.name,
          department: form.department,
          designation: form.designation,
          email: form.email,
        });
      } else {
        await facultyApi.create({ ...form, role: 'FACULTY' });
      }
      onSuccess();
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 form-field">
          <label className="label">Full Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>
        <div className="form-field">
          <label className="label">Employee ID <span className="text-red-500">*</span></label>
          <input className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="FAC001" disabled={isEdit} />
          {errors.employeeId && <p className="error-text">{errors.employeeId}</p>}
        </div>
        <div className="form-field">
          <label className="label">Email <span className="text-red-500">*</span></label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="faculty@uni.edu" />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>
        <div className="form-field">
          <label className="label">Department <span className="text-red-500">*</span></label>
          <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          {errors.department && <p className="error-text">{errors.department}</p>}
        </div>
        <div className="form-field">
          <label className="label">Designation <span className="text-red-500">*</span></label>
          <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Associate Professor" />
          {errors.designation && <p className="error-text">{errors.designation}</p>}
        </div>
        {!isEdit && (
          <div className="col-span-2 form-field">
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>
        )}
      </div>

      {apiError && <p className="error-text text-center">{apiError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner size="sm" className="text-white" /> : null}
          {isEdit ? 'Save Changes' : 'Create Faculty'}
        </button>
      </div>
    </form>
  );
}

// ── Main Faculty Page ─────────────────────────────────────────────────────────

export function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Faculty | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = async () => {
    try {
      const res = await facultyApi.list();
      setFaculty(res.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = faculty.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    f.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const isActive = deactivateTarget.user?.isActive ?? true;
      await facultyApi.setStatus(deactivateTarget.id, !isActive);
      await load();
      setDeactivateTarget(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Faculty"
        subtitle={`${faculty.length} faculty members`}
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-faculty-btn">
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, ID, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search faculty"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-6 h-6" />}
          title={search ? 'No results found' : 'No faculty added yet'}
          description={search ? 'Try a different search term.' : 'Add your first faculty member to get started.'}
          action={!search ? <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Faculty</button> : undefined}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>RFID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const activeRFID = f.rfidCards?.find((c) => c.status === 'ACTIVE');
                const isActive = f.user?.isActive ?? true;

                return (
                  <tr key={f.id}>
                    <td>
                      <div className="font-medium text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-400">{f.user?.email}</div>
                    </td>
                    <td className="font-mono text-sm">{f.employeeId}</td>
                    <td>{f.department}</td>
                    <td className="text-slate-600">{f.designation}</td>
                    <td>
                      {activeRFID ? (
                        <span className="badge-active">Registered</span>
                      ) : (
                        <span className="badge-inactive">None</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="btn-ghost py-1 px-2"
                          onClick={() => setEditFaculty(f)}
                          title="Edit"
                          aria-label={`Edit ${f.name}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className={`btn-ghost py-1 px-2 ${isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          onClick={() => setDeactivateTarget(f)}
                          title={isActive ? 'Deactivate' : 'Activate'}
                        >
                          {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Faculty Member" size="lg">
        <FacultyForm
          onSuccess={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit Modal */}
      {editFaculty && (
        <Modal isOpen={!!editFaculty} onClose={() => setEditFaculty(null)} title="Edit Faculty" size="lg">
          <FacultyForm
            faculty={editFaculty}
            onSuccess={() => { setEditFaculty(null); load(); }}
            onCancel={() => setEditFaculty(null)}
          />
        </Modal>
      )}

      {/* Confirm deactivate */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.user?.isActive ? 'Deactivate Faculty' : 'Activate Faculty'}
        message={`Are you sure you want to ${deactivateTarget?.user?.isActive ? 'deactivate' : 'activate'} ${deactivateTarget?.name}? ${deactivateTarget?.user?.isActive ? 'They will no longer be able to log in.' : ''}`}
        confirmLabel={deactivateTarget?.user?.isActive ? 'Deactivate' : 'Activate'}
        variant={deactivateTarget?.user?.isActive ? 'danger' : 'warning'}
        isLoading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
