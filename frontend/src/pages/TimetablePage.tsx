import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { timetableApi, courseApi, facultyApi, classroomApi } from '../services/endpoints';
import type { TimetableSlot, Course, Faculty, Classroom } from '../types';
import { LoadingState, ErrorState, EmptyState, PageHeader } from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';
import { formatTime, getDayAbbr } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`); // 07:00–18:00

// ── Weekly Grid View ──────────────────────────────────────────────────────────

function WeeklyGrid({ slots }: { slots: TimetableSlot[] }) {
  const getSlotColor = (index: number) => {
    const colors = [
      'bg-brand-50 border-brand-200 text-brand-700',
      'bg-sky-50 border-sky-200 text-sky-700',
      'bg-violet-50 border-violet-200 text-violet-700',
      'bg-emerald-50 border-emerald-200 text-emerald-700',
      'bg-amber-50 border-amber-200 text-amber-700',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[700px] text-xs border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-2 py-3 text-center text-slate-400 font-medium border-r border-slate-200">
          Time
        </div>
        {DAYS.map((day) => (
          <div key={day} className="bg-slate-50 px-2 py-3 text-center font-semibold text-slate-600 border-r border-slate-200 last:border-r-0">
            {getDayAbbr(day)}
          </div>
        ))}

        {/* Time rows */}
        {DAY_HOURS.map((hour) => (
          <React.Fragment key={hour}>
            <div className="px-2 py-4 text-slate-400 text-center border-r border-t border-slate-100">
              {formatTime(hour)}
            </div>
            {DAYS.map((day) => {
              const daySlots = slots.filter((s) =>
                s.dayOfWeek === day &&
                s.startTime <= hour &&
                s.endTime > hour
              );

              return (
                <div key={day} className="border-r border-t border-slate-100 p-1 min-h-[48px] last:border-r-0 relative">
                  {daySlots.map((slot, i) => (
                    <div
                      key={slot.id}
                      className={`rounded-lg border px-1.5 py-1 text-[10px] font-medium leading-tight ${getSlotColor(i)}`}
                    >
                      <div className="font-semibold truncate">{slot.course?.courseCode}</div>
                      <div className="opacity-70 truncate">{slot.classroom?.name}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Slot Form ─────────────────────────────────────────────────────────────────

function SlotForm({
  courses, faculty, classrooms, onSuccess, onCancel,
}: {
  courses: Course[];
  faculty: Faculty[];
  classrooms: Classroom[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    courseId: '', facultyId: '', classroomId: '',
    dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00',
    academicYear: '2025-2026', semester: 'Semester 5',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.facultyId || !form.classroomId) {
      setError('All fields are required');
      return;
    }
    if (form.startTime >= form.endTime) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await timetableApi.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create slot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 form-field">
          <label className="label">Course <span className="text-red-500">*</span></label>
          <select className="input" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="label">Faculty <span className="text-red-500">*</span></label>
          <select className="input" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required>
            <option value="">Select faculty</option>
            {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="label">Classroom <span className="text-red-500">*</span></label>
          <select className="input" value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })} required>
            <option value="">Select classroom</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.building}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="label">Day <span className="text-red-500">*</span></label>
          <select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            {DAYS.map((d) => <option key={d} value={d}>{getDayAbbr(d)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="label">Start Time <span className="text-red-500">*</span></label>
          <input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="label">End Time <span className="text-red-500">*</span></label>
          <input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="label">Academic Year <span className="text-red-500">*</span></label>
          <input className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" />
        </div>
        <div className="form-field">
          <label className="label">Semester <span className="text-red-500">*</span></label>
          <input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="Semester 5" />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner size="sm" className="text-white" /> : null}
          Create Slot
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TimetablePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      // facultyApi.listNames() is accessible by any authenticated role.
      // facultyApi.list() is admin-only and must NOT be called by FACULTY users.
      const [slotsRes, coursesRes, facultyRes, classroomsRes] = await Promise.all([
        timetableApi.list(),
        courseApi.list(),
        facultyApi.listNames(),   // ← fixed: was facultyApi.list() which is admin-only
        classroomApi.list(),
      ]);
      setSlots(slotsRes.data.data);
      setCourses(coursesRes.data.data.filter((c) => c.isActive));
      setFaculty(facultyRes.data.data as Faculty[]);
      setClassrooms(classroomsRes.data.data.filter((c) => c.isActive));
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
      await timetableApi.delete(deleteTarget.id);
      await load();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Timetable"
        subtitle={`${slots.length} active slots`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500'}`}
                onClick={() => setView('list')}
              >
                List
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${view === 'grid' ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500'}`}
                onClick={() => setView('grid')}
              >
                Weekly
              </button>
            </div>
            {/* Only admins can create timetable slots */}
            {isAdmin && (
              <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-timetable-btn">
                <Plus className="w-4 h-4" /> Add Slot
              </button>
            )}
          </div>
        }
      />

      {slots.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No timetable slots"
          description="Create timetable slots to schedule classes."
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Slot</button>}
        />
      ) : view === 'grid' ? (
        <div className="card p-4">
          <WeeklyGrid slots={slots} />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Faculty</th>
                <th>Classroom</th>
                <th>Day</th>
                <th>Time</th>
                <th>Semester</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>
                    <span className="font-mono text-sm font-semibold text-brand-700">{slot.course?.courseCode}</span>
                    <div className="text-xs text-slate-400">{slot.course?.courseName}</div>
                  </td>
                  <td className="font-medium">{slot.faculty?.name}</td>
                  <td>
                    <span className="font-semibold">{slot.classroom?.name}</span>
                    <div className="text-xs text-slate-400">{slot.classroom?.building}</div>
                  </td>
                  <td className="font-medium">{getDayAbbr(slot.dayOfWeek)}</td>
                  <td className="font-mono text-sm text-slate-600">
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </td>
                  <td className="text-slate-500 text-sm">{slot.semester}</td>
                  {isAdmin && (
                    <td>
                      <button
                        className="btn-ghost py-1 px-2 text-red-500 hover:bg-red-50"
                        onClick={() => setDeleteTarget(slot)}
                        title="Remove slot"
                        aria-label="Remove timetable slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Timetable Slot" size="lg">
        <SlotForm
          courses={courses}
          faculty={faculty}
          classrooms={classrooms}
          onSuccess={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Timetable Slot"
        message={`Remove ${deleteTarget?.course?.courseCode} from ${getDayAbbr(deleteTarget?.dayOfWeek ?? 'MONDAY')} ${deleteTarget?.startTime}–${deleteTarget?.endTime}?`}
        confirmLabel="Remove"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
