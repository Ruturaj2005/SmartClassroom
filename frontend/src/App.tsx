import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { useAuth } from './contexts/AuthContext';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FacultyPage } from './pages/FacultyPage';
import { RFIDPage } from './pages/RFIDPage';
import { CoursesPage } from './pages/CoursesPage';
import { ClassroomsPage } from './pages/ClassroomsPage';
import { TimetablePage } from './pages/TimetablePage';
import { MaterialsPage } from './pages/MaterialsPage';
import { SessionsPage } from './pages/SessionsPage';
import { DevicesPage } from './pages/DevicesPage';
import { RFIDConsolePage } from './pages/RFIDConsolePage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/faculty" element={<ProtectedRoute adminOnly><FacultyPage /></ProtectedRoute>} />
        <Route path="/rfid" element={<ProtectedRoute adminOnly><RFIDPage /></ProtectedRoute>} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/classrooms" element={<ProtectedRoute adminOnly><ClassroomsPage /></ProtectedRoute>} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/devices" element={<ProtectedRoute adminOnly><DevicesPage /></ProtectedRoute>} />
        <Route path="/rfid-console" element={<ProtectedRoute adminOnly><RFIDConsolePage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
