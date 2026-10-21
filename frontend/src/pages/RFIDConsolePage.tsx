import React, { useState } from 'react';
import { Wifi, Send, CheckCircle, XCircle, Clock, BookOpen, FileText, User, Building2 } from 'lucide-react';
import { edgeApi } from '../services/endpoints';
import type { EdgeTapResult } from '../types';
import { PageHeader, Alert } from '../components/ui/index';
import { Spinner } from '../components/ui/index';
import { formatTime } from '../utils/cn';

// Predefined test UIDs from seed data
const DEMO_UIDS = [
  { uid: '04:A1:B2:C3:D4', label: 'Dr. Priya Sharma', color: 'bg-brand-100 text-brand-700 border border-brand-200' },
  { uid: '04:E5:F6:07:18', label: 'Prof. Rahul Mehta', color: 'bg-sky-100 text-sky-700 border border-sky-200' },
  { uid: '04:29:3A:4B:5C', label: 'Dr. Kavita Nair', color: 'bg-violet-100 text-violet-700 border border-violet-200' },
  { uid: '04:6D:7E:8F:90', label: 'Prof. Arun Kumar', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
];

interface ResultCardProps {
  result: EdgeTapResult;
}

function ResultCard({ result }: ResultCardProps) {
  if (!result.authenticated) {
    return (
      <div className="card p-5 border-red-200 bg-red-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Authentication Failed</h3>
            <p className="text-sm text-red-600">{result.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Auth success header */}
      <div className="card p-5 border-emerald-200 bg-emerald-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800">Authentication Successful</h3>
            <p className="text-sm text-emerald-600">RFID card recognized and processed</p>
          </div>
        </div>
      </div>

      {/* Faculty + Classroom */}
      <div className="grid grid-cols-2 gap-4">
        {result.faculty && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <User className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Faculty</span>
            </div>
            <div className="font-semibold text-slate-900">{result.faculty.name}</div>
            <div className="text-sm text-slate-500 font-mono">{result.faculty.employeeId}</div>
          </div>
        )}
        {result.classroom && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Classroom</span>
            </div>
            <div className="font-semibold text-slate-900">{result.classroom.name}</div>
          </div>
        )}
      </div>

      {/* Scheduled lecture (only used to sort the list) */}
      {result.currentLecture ? (
        <div className="card p-4 border-brand-200 bg-brand-50">
          <div className="flex items-center gap-2 mb-2 text-brand-600">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled now</span>
            <span className="ml-auto text-xs badge-active px-2 py-0.5">LIVE</span>
          </div>
          <div className="font-bold text-brand-900">
            {result.currentLecture.courseCode} · {result.currentLecture.courseName}
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-600 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(result.currentLecture.startTime)} – {formatTime(result.currentLecture.endTime)}</span>
          </div>
        </div>
      ) : (
        <div className="card p-4 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Clock className="w-4 h-4" /> No lecture scheduled right now, so the full list is shown
          </div>
        </div>
      )}

      {/* Materials the Pi would offer */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-500">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Content shown on the classroom screen ({result.materials?.length ?? 0})
          </span>
        </div>
        {result.materials && result.materials.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {result.materials.map((m) => (
              <li key={m.id} className="py-2 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {m.title} <span className="text-xs text-slate-400 font-mono">v{m.version}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.course.courseCode} · {m.originalFileName}
                  </div>
                </div>
                {m.isCurrentLecture && <span className="text-[10px] badge-active px-2 py-0.5">Now</span>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.pdfAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {m.pdfAvailable ? 'PDF ready' : 'Original only'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">This faculty member hasn't uploaded any materials yet.</p>
        )}
      </div>

      {/* JSON response */}
      <details className="card overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 select-none">
          View raw API response (for development)
        </summary>
        <pre className="px-4 py-3 text-xs text-slate-600 overflow-x-auto bg-slate-50 border-t border-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function RFIDConsolePage() {
  const [uid, setUid] = useState('');
  const [deviceCode, setDeviceCode] = useState('PI-C302');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EdgeTapResult | null>(null);
  const [error, setError] = useState('');

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) { setError('RFID UID is required'); return; }
    if (!deviceCode.trim()) { setError('Device code is required'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await edgeApi.simulateTap(uid.trim().toUpperCase(), deviceCode.trim().toUpperCase());
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoUid: string) => {
    setUid(demoUid);
    setResult(null);
    setError('');
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader
        title="RFID Test Console"
        subtitle="Simulate card-tap authentication without hardware"
      />

      {/* Notice */}
      <Alert variant="warning" className="mb-5">
        <strong>🧪 Development Simulation Tool</strong>
        <br />
        This console simulates a card tap on a classroom Raspberry Pi.
        Enter an RFID UID to see exactly what that faculty member would see on the screen:
        <br />
        <code className="text-xs mt-1 block">UID → Faculty → their uploaded materials</code>
      </Alert>

      {/* Quick-fill buttons */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Quick fill (seeded UIDs)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_UIDS.map((d) => (
            <button
              key={d.uid}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-[1.02] ${d.color}`}
              onClick={() => handleQuickFill(d.uid)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 mb-5">
        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="form-field">
            <label className="label">
              <span className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-slate-400" />
                RFID UID (simulating NFC card scan)
              </span>
            </label>
            <input
              className="input font-mono text-base"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="04:A1:B2:C3:D4"
              aria-label="RFID UID"
            />
          </div>

          <div className="form-field">
            <label className="label">Device Code (simulating edge device)</label>
            <input
              className="input font-mono"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              placeholder="PI-C302"
            />
            <p className="text-xs text-slate-400 mt-1">
              Must match a registered edge device. PI-C302 is seeded by default.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading} id="simulate-rfid-btn">
            {loading ? (
              <><Spinner size="sm" className="text-white" /> Authenticating...</>
            ) : (
              <><Send className="w-4 h-4" /> Simulate Card Tap</>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && <ResultCard result={result} />}

      {/* Architecture note */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          What happens on a real Raspberry Pi
        </h3>
        <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
          <li>Faculty taps their RFID card on the PN532 reader</li>
          <li>Pi sends <code>POST /api/v1/edge/tap</code> with its device key</li>
          <li>Server returns that faculty's materials and a short-lived tap token</li>
          <li>Faculty picks a material on the screen</li>
          <li>Pi uses its cached copy if the hash matches, otherwise downloads the PDF</li>
          <li>Pi opens it full screen and the session is logged</li>
          <li>Tapping the card again logs out</li>
        </ol>
      </div>
    </div>
  );
}
