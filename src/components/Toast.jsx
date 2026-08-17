import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="toast-container"
      id="toast-container"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in-up`}>
          <span className="toast-icon">{ICONS[toast.type] || ICONS.success}</span>
          <span className="toast-message">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
