import React, { useEffect, useState } from 'react';
import { Plus, BookOpen, Search, ToggleLeft, ToggleRight, Edit } from 'lucide-react';
import { courseApi } from '../services/endpoints';
import type { Course } from '../types';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader } from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/index';

function CourseForm({
  course, onSuccess, onCancel,
}: { course?: Course; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    courseCode: course?.courseCode ?? '',
    courseName: course?.courseName ?? '',
    department: course?.department ?? '',
    description: course?.description ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.courseCode.match(/^[A-Z0-9]{2,20}$/)) e.courseCode = 'Course code must be uppercase letters and numbers (2-20 chars)';
    if (!form.courseName.trim()) e.courseName = 'Course name required';
    if (!form.department.trim()) e.department = 'Department required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      if (course) {
        await courseApi.update(course.id, form);
      } else {
        await courseApi.create(form);
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
        <div className="form-field">
          <label className="label">Course Code <span className="text-red-500">*</span></label>
          <input
            className="input font-mono"
            value={form.courseCode}
            onChange={(e) => setForm({ ...form, courseCode: e.target.value.toUpperCase() })}
            placeholder="IOT301"
            disabled={!!course}
          />
          {errors.courseCode && <p className="error-text">{errors.courseCode}</p>}
        </div>
        <div className="form-field">
          <label className="label">Department <span className="text-red-500">*</span></label>
          <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          {errors.department && <p className="error-text">{errors.department}</p>}
        </div>
        <div className="col-span-2 form-field">
          <label className="label">Course Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} placeholder="Internet of Things" />
          {errors.courseName && <p className="error-text">{errors.courseName}</p>}
        </div>
        <div className="col-span-2 form-field">
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief course description..." />
        </div>
      </div>
      {apiError && <p className="error-text text-center">{apiError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner size="sm" className="text-white" /> : null}
          {course ? 'Save Changes' : 'Create Course'}
        </button>
      </div>
    </form>
  );
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Course | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    try {
      const res = await courseApi.list();
      setCourses(res.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = courses.filter((c) =>
    c.courseName.toLowerCase().includes(search.toLowerCase()) ||
    c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await courseApi.setStatus(toggleTarget.id, !toggleTarget.isActive);
      await load();
      setToggleTarget(null);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Courses"
        subtitle={`${courses.filter((c) => c.isActive).length} active courses`}
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)} id="add-course-btn">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        }
      />

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title={search ? 'No results' : 'No courses yet'}
          description={search ? 'Try a different search term.' : 'Create your first course to get started.'}
          action={!search ? <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Course</button> : undefined}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Materials</th>
                <th>Slots</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-semibold text-brand-700">{c.courseCode}</td>
                  <td>
                    <div className="font-medium">{c.courseName}</div>
                    {c.description && <div className="text-xs text-slate-400 truncate max-w-xs">{c.description}</div>}
                  </td>
                  <td>{c.department}</td>
                  <td className="text-slate-600">{c._count?.materials ?? 0}</td>
                  <td className="text-slate-600">{c._count?.timetableSlots ?? 0}</td>
                  <td><StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost py-1 px-2" onClick={() => setEditCourse(c)} title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className={`btn-ghost py-1 px-2 ${c.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        onClick={() => setToggleTarget(c)}
                        title={c.isActive ? 'Deactivate' : 'Activate'}
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Course" size="md">
        <CourseForm onSuccess={() => { setShowCreate(false); load(); }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {editCourse && (
        <Modal isOpen onClose={() => setEditCourse(null)} title="Edit Course" size="md">
          <CourseForm course={editCourse} onSuccess={() => { setEditCourse(null); load(); }} onCancel={() => setEditCourse(null)} />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={toggleTarget?.isActive ? 'Deactivate Course' : 'Activate Course'}
        message={`${toggleTarget?.isActive ? 'Deactivate' : 'Activate'} ${toggleTarget?.courseName}?`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'danger' : 'warning'}
        isLoading={toggling}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
