import React, { useEffect, useState } from 'react';
import { Users, CreditCard, BookOpen, Building2, FileText, Clock, Calendar } from 'lucide-react';
import { facultyApi, timetableApi, materialApi, sessionApi } from '../services/endpoints';
import type { DashboardStats, TimetableSlot, Material, LectureSession } from '../types';
import { LoadingState, ErrorState, EmptyState, PageHeader } from '../components/ui/index';
import { formatTime, getMimeTypeLabel, getRelativeTime, formatDate } from '../utils/cn';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  subLabel?: string;
}) {
  return (
    <div className="stat-card group hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-3">
        <div className="stat-value">{value.toLocaleString()}</div>
        <div className="stat-label mt-1">{label}</div>
        {subLabel && <div className="stat-change">{subLabel}</div>}
      </div>
    </div>
  );
}

function TimetableCard({ slots }: { slots: TimetableSlot[] }) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (slots.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-6 h-6" />}
        title="No lectures today"
        description="Nothing scheduled for today."
      />
    );
  }

  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const isActive = currentTime >= slot.startTime && currentTime < slot.endTime;
        const isPast = currentTime >= slot.endTime;

        return (
          <div
            key={slot.id}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
              isActive
                ? 'bg-brand-50 border-brand-200'
                : isPast
                ? 'bg-slate-50/50 border-slate-100 opacity-60'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-center min-w-[52px] ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
              <div className="text-xs font-semibold">{formatTime(slot.startTime)}</div>
              <div className="text-xs text-slate-400">{formatTime(slot.endTime)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {slot.course?.courseName}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {slot.faculty?.name} · {slot.classroom?.name}
              </div>
            </div>
            {isActive && (
              <span className="badge-active text-xs px-2 py-0.5 flex-shrink-0">LIVE</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [recentSessions, setRecentSessions] = useState<LectureSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, todayRes, matRes, sessRes] = await Promise.all([
          facultyApi.getStats(),
          timetableApi.getToday(),
          materialApi.list(),
          sessionApi.list(),
        ]);

        setStats(statsRes.data.data);
        setTodaySlots(todayRes.data.data);
        setRecentMaterials(matRes.data.data.slice(0, 5));
        setRecentSessions(sessRes.data.data.slice(0, 5));
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${today}, ${new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Faculty" value={stats?.totalFaculty ?? 0} color="bg-brand-500" />
        <StatCard icon={CreditCard} label="Active RFID" value={stats?.activeRFIDCards ?? 0} color="bg-sky-500" />
        <StatCard icon={BookOpen} label="Courses" value={stats?.activeCourses ?? 0} color="bg-violet-500" />
        <StatCard icon={Building2} label="Classrooms" value={stats?.activeClassrooms ?? 0} color="bg-emerald-500" />
        <StatCard icon={FileText} label="Materials" value={stats?.totalMaterials ?? 0} color="bg-amber-500" />
        <StatCard icon={Users} label="Active Faculty" value={stats?.activeFaculty ?? 0} color="bg-teal-500" />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's timetable */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="section-title">Today's Timetable</h2>
            <span className="ml-auto text-xs text-slate-400">{today}</span>
          </div>
          <TimetableCard slots={todaySlots} />
        </div>

        {/* Recent Materials */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="section-title">Recent Materials</h2>
          </div>
          {recentMaterials.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No materials yet"
              description="Upload teaching materials to get started."
            />
          ) : (
            <div className="space-y-2">
              {recentMaterials.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">
                      {getMimeTypeLabel(m.mimeType)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                    <p className="text-xs text-slate-500">{m.course?.courseCode} · v{m.version}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{getRelativeTime(m.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="section-title">Recent Sessions</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Course</th>
                  <th>Classroom</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.faculty?.name}</td>
                    <td>{s.course?.courseCode}</td>
                    <td>{s.classroom?.name}</td>
                    <td>{formatDate(s.startedAt, true)}</td>
                    <td>
                      <span className={`badge ${
                        s.status === 'COMPLETED' ? 'badge-active' :
                        s.status === 'STARTED' ? 'badge-info' : 'badge-danger'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
