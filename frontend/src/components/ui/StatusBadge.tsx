import React from 'react';

type Status = string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Email status
  VALID: { label: 'Valid', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
  INVALID: { label: 'Invalid', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  UNKNOWN: { label: 'Unknown', className: 'bg-dark-700 text-dark-400 border border-dark-600' },
  // AI Priority
  HIGH: { label: 'High', className: 'bg-primary-500/15 text-primary-400 border border-primary-500/20' },
  MEDIUM: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  LOW: { label: 'Low', className: 'bg-dark-700 text-dark-400 border border-dark-600' },
  UNCLASSIFIED: { label: 'Unclassified', className: 'bg-dark-800 text-dark-500 border border-dark-700' },
  // Campaign status
  DRAFT: { label: 'Draft', className: 'bg-dark-700 text-dark-400 border border-dark-600' },
  READY: { label: 'Ready', className: 'bg-primary-500/15 text-primary-400 border border-primary-500/20' },
  RUNNING: { label: 'Running', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
  PAUSED: { label: 'Paused', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  COMPLETED: { label: 'Completed', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
  FAILED: { label: 'Failed', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Email log status
  SENT: { label: 'Sent', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
  SKIPPED: { label: 'Skipped', className: 'bg-dark-700 text-dark-400 border border-dark-600' },
  PENDING: { label: 'Pending', className: 'bg-dark-700 text-dark-500 border border-dark-600' },
  SENDING: { label: 'Sending', className: 'bg-primary-500/15 text-primary-400 border border-primary-500/20' },
  ALREADY_CONTACTED: { label: 'Already Contacted', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
  INVALID_EMAIL: { label: 'Invalid Email', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Outreach
  CONTACTED: { label: 'Contacted', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-dark-800 text-dark-400 border border-dark-700' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
