import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { sessionApi } from '../services/endpoints';
import type { LectureSession } from '../types';
import { LoadingState, ErrorState, EmptyState, PageHeader } from '../components/ui/index';
import { formatDate } from '../utils/cn';

export function SessionsPage() {
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    sessionApi.list()
      .then((r) => setSessions(r.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Lecture Sessions" subtitle={`${sessions.length} sessions recorded`} />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<History className="w-6 h-6" />}
          title="No sessions yet"
          description="Sessions are created automatically when RFID authentication is used."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Course</th>
                <th>Classroom</th>
                <th>Material</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-medium">{s.faculty?.name}</div>
                    <div className="text-xs text-slate-400">{s.faculty?.employeeId}</div>
                  </td>
                  <td className="font-mono text-sm font-semibold text-brand-700">{s.course?.courseCode}</td>
                  <td>{s.classroom?.name}</td>
                  <td className="text-sm">{s.material?.title ?? <span className="text-slate-400">—</span>}</td>
                  <td className="text-sm text-slate-600">{formatDate(s.startedAt, true)}</td>
                  <td className="text-sm text-slate-600">{s.endedAt ? formatDate(s.endedAt, true) : <span className="badge-info">Ongoing</span>}</td>
                  <td>
                    <span className={`badge text-xs ${
                      s.retrievalMode === 'CACHE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      s.retrievalMode === 'OFFLINE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}>{s.retrievalMode}</span>
                  </td>
                  <td>
                    <span className={`badge text-xs ${
                      s.status === 'COMPLETED' ? 'badge-active' :
                      s.status === 'STARTED' ? 'badge-info' : 'badge-danger'
                    }`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
