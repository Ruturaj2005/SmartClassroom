import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatFileSize } from '../../utils/cn';
import { Spinner } from './index';

interface FileUploaderProps {
  onUpload: (file: File, title: string, description: string, courseId: string) => Promise<void>;
  courses: Array<{ id: string; courseCode: string; courseName: string }>;
  isUploading?: boolean;
  onClose?: () => void;
}

export function FileUploader({ onUpload, courses, isUploading = false, onClose }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: 52428800,
    maxFiles: 1,
    onDrop: (accepted, rejected) => {
      if (rejected.length > 0) {
        const err = rejected[0].errors[0];
        if (err.code === 'file-too-large') setError('File exceeds 50MB limit');
        else if (err.code === 'file-invalid-type') setError('Only PDF, PPT, and PPTX files allowed');
        else setError(err.message);
        setSelectedFile(null);
      } else {
        setSelectedFile(accepted[0]);
        if (!title) setTitle(accepted[0].name.replace(/\.[^/.]+$/, ''));
        setError('');
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError('Please select a file'); return; }
    if (!title.trim()) { setError('Title is required'); return; }
    if (!courseId) { setError('Please select a course'); return; }

    setError('');
    try {
      await onUpload(selectedFile, title.trim(), description.trim(), courseId);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        setCourseId('');
        onClose?.();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <p className="text-base font-semibold text-slate-800">Upload Successful!</p>
        <p className="text-sm text-slate-500">Material has been saved and hashed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'upload-zone',
          isDragActive && 'upload-zone-active',
          selectedFile && 'border-emerald-300 bg-emerald-50'
        )}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <File className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-800">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              className="ml-2 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setTitle(''); }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {isDragActive ? 'Drop the file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, PPT, PPTX — max 50MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="form-field">
        <label className="label">Course <span className="text-red-500">*</span></label>
        <select
          className="input"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          required
        >
          <option value="">Select a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode} — {c.courseName}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="label">Title <span className="text-red-500">*</span></label>
        <input
          className="input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Unit 3 — IoT Protocols"
          required
        />
      </div>

      <div className="form-field">
        <label className="label">Description <span className="text-xs text-slate-400">(optional)</span></label>
        <textarea
          className="input resize-none"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this material..."
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onClose && (
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={isUploading || !selectedFile}>
          {isUploading ? (
            <><Spinner size="sm" className="text-white" /> Uploading...</>
          ) : 'Upload Material'}
        </button>
      </div>
    </form>
  );
}
