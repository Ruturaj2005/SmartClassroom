import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, BookOpen, Building2,
  Calendar, FileText, History, Monitor, Wifi, Menu, X,
  LogOut, ChevronRight, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Faculty', icon: Users, to: '/faculty', adminOnly: true },
  { label: 'RFID Cards', icon: CreditCard, to: '/rfid', adminOnly: true },
  { label: 'Courses', icon: BookOpen, to: '/courses' },
  { label: 'Classrooms', icon: Building2, to: '/classrooms', adminOnly: true },
  { label: 'Timetable', icon: Calendar, to: '/timetable' },
  { label: 'Materials', icon: FileText, to: '/materials' },
  { label: 'Sessions', icon: History, to: '/sessions' },
  { label: 'Devices', icon: Monitor, to: '/devices', adminOnly: true },
  { label: 'RFID Console', icon: Wifi, to: '/rfid-console', adminOnly: true },
];

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter((item) =>
    !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900">SmartClass</span>
            <div className="text-xs text-slate-400 leading-none">Classroom Platform</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(isActive ? 'nav-item-active' : 'nav-item')
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
            {item.adminOnly && (
              <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.name || user?.email}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.role?.toLowerCase()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex flex-col bg-white border-r border-slate-200 flex-shrink-0"
        style={{ width: '240px' }}
      >
        <SidebarNav />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col animate-fade-in">
            <div className="flex items-center justify-end p-3 border-b border-slate-100">
              <button
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarNav onNavClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 flex-shrink-0">
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg mr-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden sm:inline font-medium">SmartClass</span>
            <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
            <span className="text-slate-400 text-xs">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
