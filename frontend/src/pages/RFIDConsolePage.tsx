import React, { useState } from 'react';
import { Wifi, Send, CheckCircle, XCircle, Clock, BookOpen, FileText, User, Building2 } from 'lucide-react';
import { edgeApi } from '../services/endpoints';
import type { EdgeAuthResult } from '../types';
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
  result: EdgeAuthResult;
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

      {/* Current Lecture */}
      {result.lecture ? (
        <div className="card p-4 border-brand-200 bg-brand-50">
          <div className="flex items-center gap-2 mb-3 text-brand-600">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active Lecture</span>
            <span className="ml-auto text-xs badge-active px-2 py-0.5">LIVE</span>
          </div>
          <div className="font-bold text-lg text-brand-900">{result.lecture.courseName}</div>
          <div className="font-mono text-sm text-brand-700 mb-2">{result.lecture.courseCode}</div>
          <div className="flex items-center gap-2 text-sm text-brand-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(result.lecture.startTime)} – {formatTime(result.lecture.endTime)}</span>
          </div>
          {result.lecture.sessionId && (
            <div className="mt-2 text-xs text-brand-500 font-mono">
              Session: {result.lecture.sessionId}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{result.message || 'No active lecture at this time'}</span>
          </div>
        </div>
      )}

      {/* Material */}
      {result.material && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Teaching Material</span>
          </div>
          <div className="font-semibold text-slate-900">{result.material.title}</div>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <div>File: <span className="font-mono">{result.material.fileName}</span></div>
            <div>Version: <span className="font-mono">v{result.material.version}</span></div>
            <div className="text-[10px] text-slate-300">Hash: {result.material.hash}</div>
          </div>
        </div>
      )}

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
  const [result, setResult] = useState<EdgeAuthResult | null>(null);
  const [error, setError] = useState('');

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) { setError('RFID UID is required'); return; }
    if (!deviceCode.trim()) { setError('Device code is required'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await edgeApi.authenticate(uid.trim().toUpperCase(), deviceCode.trim().toUpperCase());
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
        This console simulates the Raspberry Pi + PN532 RFID scan workflow.
        Enter an RFID UID manually to test the full authentication flow:
        <br />
        <code className="text-xs mt-1 block">UID → Faculty → Classroom → Timetable → Material</code>
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
              <><Send className="w-4 h-4" /> Simulate Card Tap → POST /edge/authenticate</>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && <ResultCard result={result} />}

      {/* Architecture note */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Future Raspberry Pi Integration
        </h3>
        <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
          <li>Faculty taps RFID card on PN532 reader</li>
          <li>Raspberry Pi reads UID from PN532 via SPI/I2C</li>
          <li>Pi sends <code>POST /api/v1/edge/authenticate {'{'} uid, deviceCode {'}'}</code></li>
          <li>Backend identifies faculty, classroom, current lecture</li>
          <li>Pi compares local material hash vs server hash</li>
          <li>Pi downloads updated material if hash differs</li>
          <li>Pi opens presentation in fullscreen</li>
          <li>Session is logged in the database</li>
        </ol>
      </div>
    </div>
  );
}
