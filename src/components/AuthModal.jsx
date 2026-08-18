import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Building2, Eye, EyeOff, Sparkles } from 'lucide-react';
import * as api from '../lib/api';
import './AuthModal.css';

export default function AuthModal({ mode, onClose, onLogin, onSwitchMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    club: '',
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError('');
    try {
      if (mode === 'signup') {
        const { session } = await api.signUp({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          club: formData.club.trim(),
        });
        // With email confirmation on, Supabase returns no session yet.
        if (!session) {
          setFormError('');
          setNotice('Check your inbox to confirm your email, then sign in.');
          setSubmitting(false);
          return;
        }
      } else {
        await api.signIn({
          email: formData.email.trim(),
          password: formData.password,
        });
      }
      onLogin();
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-backdrop animate-fade-in" onClick={onClose} id="auth-modal">
      <div
        className="auth-modal animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to EventLab"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close" id="auth-close">
          <X size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} />
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Welcome back' : 'Join EventLab'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to post and manage your events'
              : 'Create an account to start posting events'
            }
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-input auth-input"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  id="auth-name"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                className="form-input auth-input"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                id="auth-email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input auth-input"
                placeholder="••••••••"
                required
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                id="auth-password"
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Organisation / Club (optional)</label>
              <div className="auth-input-wrapper">
                <Building2 size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-input auth-input"
                  placeholder="e.g. Tech Collective, Photography Society"
                  value={formData.club}
                  onChange={e => setFormData({ ...formData, club: e.target.value })}
                  id="auth-club"
                />
              </div>
            </div>
          )}

          {formError && (
            <p className="auth-error" role="alert" id="auth-error">{formError}</p>
          )}
          {notice && (
            <p className="auth-notice" role="status" id="auth-notice">{notice}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={submitting}
            id="auth-submit"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="auth-switch"
              onClick={() => { setFormError(''); setNotice(''); onSwitchMode(mode === 'login' ? 'signup' : 'login'); }}
              id="auth-switch"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="auth-hint">
          Passwords must be at least 6 characters.
        </p>
      </div>
    </div>
  );
}
