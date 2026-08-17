import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import {
  Plus, Eye, Users, Calendar, TrendingUp, Edit3, Trash2,
  CheckCircle, ExternalLink
} from 'lucide-react';
import { useAuth, useToast } from '../App';
import ConfirmDialog from '../components/ConfirmDialog';
import { getCategoryById } from '../data/mockData';
import './DashboardPage.css';

export default function DashboardPage({ events, pendingEvents = [], onDelete }) {
  const { user, openAuth } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Hooks must run on every render, so this stays above the signed-out early
  // return — otherwise signing out while on /dashboard changes the hook count
  // and React throws "Rendered fewer hooks than expected".
  const myEvents = useMemo(() => {
    if (!user) return [];
    const isMine = (e) =>
      e.organizerId === user.id ||
      (user.club && e.organizer === user.club);
    return [...pendingEvents.filter(isMine), ...events.filter(isMine)];
  }, [events, pendingEvents, user]);

  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">🔒</div>
            <h3 className="empty-state-title">Sign in Required</h3>
            <p className="empty-state-text">Sign in to access your dashboard.</p>
            <button className="btn btn-primary" onClick={() => openAuth('login')}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  const upcomingEvents = myEvents.filter(e => !isPast(new Date(e.dateEnd || e.dateStart)));

  const totalViews = myEvents.reduce((sum, e) => sum + e.viewCount, 0);
  const totalRsvps = myEvents.reduce((sum, e) => sum + e.rsvpCount, 0);

  const stats = [
    { label: 'Total Events', value: myEvents.length, icon: <Calendar size={20} />, color: 'var(--color-primary-light)' },
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: <Eye size={20} />, color: 'var(--color-secondary)' },
    { label: 'Total RSVPs', value: totalRsvps, icon: <Users size={20} />, color: 'var(--color-accent)' },
    { label: 'Upcoming', value: upcomingEvents.length, icon: <TrendingUp size={20} />, color: 'var(--color-success)' },
  ];

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dash-header animate-fade-in-up" id="dashboard-header">
          <div className="dash-header-info">
            <img src={user.avatar} alt={user.name} className="dash-avatar" />
            <div>
              <h1 className="dash-title">
                Welcome back, {user.name.split(' ')[0]}
                {user.isVerified && <CheckCircle size={20} className="verified-icon" />}
              </h1>
              <p className="dash-subtitle">
                {user.club || user.email} • {user.role === 'admin' ? 'Admin' : 'Organizer'}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/create')} id="dash-create">
            <Plus size={18} />
            Post New Event
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats stagger-children" id="dashboard-stats">
          {stats.map((stat, i) => (
            <div key={stat.label} className="dash-stat-card" style={{ '--stat-color': stat.color }}>
              <div className="dash-stat-icon">
                {stat.icon}
              </div>
              <div className="dash-stat-info">
                <span className="dash-stat-value">{stat.value}</span>
                <span className="dash-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* My Events */}
        <div className="dash-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="dash-section-title">
            <Calendar size={20} />
            My Events ({myEvents.length})
          </h2>

          {myEvents.length > 0 ? (
            <div className="dash-events-table">
              <div className="dash-table-header">
                <span>Event</span>
                <span>Date</span>
                <span>Status</span>
                <span>Views</span>
                <span>RSVPs</span>
                <span>Actions</span>
              </div>
              {myEvents.map(event => {
                const cat = getCategoryById(event.category);
                const isEventPast =
                  event.status !== 'pending' &&
                  isPast(new Date(event.dateEnd || event.dateStart));

                return (
                  <div key={event.id} className={`dash-table-row ${isEventPast ? 'past' : ''}`}>
                    <div className="dash-event-cell">
                      <img src={event.coverImage} alt={event.title} className="dash-event-thumb" />
                      <div>
                        <Link to={`/event/${event.id}`} className="dash-event-title">
                          {event.title}
                        </Link>
                        <span className="dash-event-cat" style={{ color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      </div>
                    </div>
                    <div className="dash-cell">
                      <span className="dash-cell-date">
                        {format(new Date(event.dateStart), 'MMM d, yyyy')}
                      </span>
                      <span className="dash-cell-time">
                        {format(new Date(event.dateStart), 'h:mm a')}
                      </span>
                    </div>
                    <div className="dash-cell">
                      <span className={`badge ${
                        event.status === 'approved' ? 'badge-success' :
                        event.status === 'pending' ? 'badge-warning' :
                        'badge-error'
                      }`}>
                        {isEventPast ? 'Completed' : event.status}
                      </span>
                    </div>
                    <div className="dash-cell">
                      <span className="dash-cell-stat">
                        <Eye size={14} />
                        {event.viewCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="dash-cell">
                      <span className="dash-cell-stat">
                        <Users size={14} />
                        {event.rsvpCount}
                        {event.capacity && ` / ${event.capacity}`}
                      </span>
                    </div>
                    <div className="dash-cell dash-actions-cell">
                      <Link to={`/event/${event.id}`} className="btn btn-ghost btn-sm" title="View">
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Edit"
                        aria-label={`Edit ${event.title}`}
                        onClick={() => navigate(`/edit/${event.id}`)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm dash-delete-btn"
                        title="Delete"
                        aria-label={`Delete ${event.title}`}
                        onClick={() => setPendingDelete(event)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="empty-state-title">No Events Yet</h3>
              <p className="empty-state-text">Start by posting your first event!</p>
              <button className="btn btn-primary" onClick={() => navigate('/create')}>
                <Plus size={16} />
                Post Event
              </button>
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this event?"
          message={`"${pendingDelete.title}" will be permanently removed, along with every RSVP for it. This cannot be undone.`}
          confirmLabel="Delete event"
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await onDelete(pendingDelete.id);
              setPendingDelete(null);
            } catch (err) {
              addToast(`Could not delete: ${err.message}`, 'error');
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
