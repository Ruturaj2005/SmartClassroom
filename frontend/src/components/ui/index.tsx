import React from 'react';
import { cn } from '../../utils/cn';

// ── Loading Spinner ───────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg
      className={cn('animate-spin text-brand-500', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Loading State (full page) ─────────────────────────────────────────────────

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 mb-4">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">Something went wrong</h3>
      <p className="text-sm text-slate-500 mb-4">{message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const classes: Record<string, string> = {
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    LOST: 'badge-danger',
    ONLINE: 'badge-active',
    OFFLINE: 'badge-inactive',
    MAINTENANCE: 'badge-warning',
    STARTED: 'badge-info',
    COMPLETED: 'badge-active',
    FAILED: 'badge-danger',
    CACHED: 'badge-active',
    EXPIRED: 'badge-warning',
    INVALID: 'badge-danger',
  };

  const labels: Record<string, string> = {
    ACTIVE: 'Active', INACTIVE: 'Inactive', LOST: 'Lost',
    ONLINE: 'Online', OFFLINE: 'Offline', MAINTENANCE: 'Maintenance',
    STARTED: 'In Progress', COMPLETED: 'Completed', FAILED: 'Failed',
    CACHED: 'Cached', EXPIRED: 'Expired', INVALID: 'Invalid',
  };

  return (
    <span className={cn(classes[status] || 'badge bg-slate-100 text-slate-600', size === 'sm' && 'text-xs')}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1" />
      {labels[status] || status}
    </span>
  );
}

// ── Alert / Info Box ──────────────────────────────────────────────────────────

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

const alertStyles = {
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div className={cn('px-4 py-3 rounded-xl border text-sm', alertStyles[variant], className)}>
      {children}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
