import { useEffect, useState } from 'react';
import { Plus, FileText, Download, Trash2, Search, Cloud, ExternalLink } from 'lucide-react';
import { materialApi, courseApi } from '../services/endpoints';
import type { Material, Course } from '../types';
import { LoadingState, ErrorState, EmptyState, PageHeader } from '../components/ui/index';
import { Modal, ConfirmDialog } from '../components/ui/Dialog';
import { FileUploader } from '../components/ui/FileUploader';
import { formatFileSize, formatDate, getMimeTypeLabel } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function MimeIcon({ mimeType }: { mimeType: string }) {
  const label = getMimeTypeLabel(mimeType);
  const colors: Record<string, string> = {
    PDF: 'bg-red-50 text-red-600',
    PPT: 'bg-orange-50 text-orange-600',
    PPTX: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[label] || 'bg-slate-100 text-slate-500'}`}>
      <span className="text-[10px] font-bold">{label}</span>
    </div>
  );
}

export function MaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [matRes, courseRes] = await Promise.all([materialApi.list(), courseApi.list()]);
      setMaterials(matRes.data.data);
      setCourses(courseRes.data.data.filter((c) => c.isActive));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File, title: string, description: string, courseId: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);
      formData.append('title', title);
      if (description) formData.append('description', description);
      await materialApi.upload(formData);
      await load();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      const response = await api.get(`/materials/${material.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = material.originalFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await materialApi.delete(deleteTarget.id);
      await load();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = materials.filter((m) => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.course?.courseCode?.toLowerCase().includes(search.toLowerCase());
    const matchCourse = !filterCourse || m.courseId === filterCourse;
    return matchSearch && matchCourse;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Material Library"
        subtitle={`${materials.length} teaching materials`}
        action={
          <button className="btn-primary" onClick={() => setShowUpload(true)} id="upload-material-btn">
            <Plus className="w-4 h-4" /> Upload Material
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.courseCode}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title={search || filterCourse ? 'No results' : 'No materials yet'}
          description="Upload PDF, PPT, or PPTX files for your courses."
          action={!search && !filterCourse ? <button className="btn-primary" onClick={() => setShowUpload(true)}><Plus className="w-4 h-4" /> Upload Material</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="card px-4 py-3 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
              <MimeIcon mimeType={m.mimeType} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{m.title}</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                    v{m.version}
                  </span>
                  {(m.storageProvider === 'r2' || m.storageProvider === 'cloudflare_r2') && (
                    <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 flex-shrink-0" title="Stored in Cloudflare R2 Object Storage">
                      <Cloud className="w-3 h-3" /> Cloudflare R2
                    </span>
                  )}
                  {m.storageProvider === 'cloudinary' && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 flex-shrink-0" title="Stored in Cloudinary Cloud">
                      <Cloud className="w-3 h-3" /> Cloudinary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono font-medium text-brand-600">{m.course?.courseCode}</span>
                  <span>·</span>
                  <span>{formatFileSize(m.fileSize)}</span>
                  <span>·</span>
                  <span>By {m.uploadedBy?.faculty?.name || m.uploadedBy?.email}</span>
                  <span>·</span>
                  <span>{formatDate(m.updatedAt)}</span>
                </div>
                <div className="font-mono text-[9px] text-slate-300 mt-0.5 truncate" title="SHA-256 hash">
                  SHA256: {m.fileHash.substring(0, 16)}...
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {m.fileUrl && (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost py-1.5 px-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                    title="Open Cloud URL directly"
                    aria-label={`Open direct cloud URL for ${m.title}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  className="btn-ghost py-1.5 px-2 text-brand-600 hover:bg-brand-50"
                  onClick={() => handleDownload(m)}
                  title="Download"
                  aria-label={`Download ${m.title}`}
                >
                  <Download className="w-4 h-4" />
                </button>
                {(user?.role === 'ADMIN' || m.uploadedById === user?.id) && (
                  <button
                    className="btn-ghost py-1.5 px-2 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteTarget(m)}
                    title="Delete"
                    aria-label={`Delete ${m.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Teaching Material" size="lg">
        <FileUploader
          courses={courses}
          onUpload={handleUpload}
          isUploading={isUploading}
          onClose={() => setShowUpload(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Material"
        message={`Delete "${deleteTarget?.title}"? This will deactivate the material but keep the file on disk.`}
        confirmLabel="Delete"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
