import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
interface Props { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; }
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-100">{title}</h3>
            <p className="text-sm text-dark-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
