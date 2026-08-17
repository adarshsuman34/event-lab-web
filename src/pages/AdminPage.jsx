import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, MapPin, Calendar, Users, Flag, Edit3, Trash2,
  UserCog, Mail, CalendarDays
} from 'lucide-react';
import { useAuth, useToast } from '../App';
import ConfirmDialog from '../components/ConfirmDialog';
import * as api from '../lib/api';
import { getCategoryById } from '../data/mockData';
import './AdminPage.css';

export default function AdminPage({ pendingEvents, approvedEvents, onApprove, onReject, onDelete }) {
  const { user, openAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [savingRole, setSavingRole] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) { setLoadingMembers(false); return; }
    let active = true;
    (async () => {
      try {
        const list = await api.fetchAllUsers();
        if (active) setMembers(list);
      } catch (err) {
        if (active) setMembersError(err.message);
      } finally {
        if (active) setLoadingMembers(false);
      }
    })();
    return () => { active = false; };
  }, [isAdmin]);

  const changeRole = async (member, role) => {
    setSavingRole(member.id);
    try {
      await api.setUserRole(member.id, role);
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, role } : m)));
      addToast(`${member.name} is now ${role}.`);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingRole(null);
    }
  };

  if (!user) {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">🔒</div>
            <h3 className="empty-state-title">Admin Access Required</h3>
            <p className="empty-state-text">Sign in with admin credentials to access moderation.</p>
            <button className="btn btn-primary" onClick={() => openAuth('login')}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">⛔</div>
            <h3 className="empty-state-title">Access Denied</h3>
            <p className="empty-state-text">Only administrators can access this page.</p>
            <Link to="/" className="btn btn-primary">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="admin-page">
      <div className="container">
        {/* Header */}
        <div className="admin-header animate-fade-in-up" id="admin-header">
          <div>
            <h1 className="admin-title">
              <Shield size={28} />
              Admin Panel
            </h1>
            <p className="admin-subtitle">Review and moderate event submissions</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="admin-overview animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="admin-overview-stat">
            <Clock size={20} />
            <span className="admin-overview-number">{pendingEvents.length}</span>
            <span className="admin-overview-label">Pending Review</span>
          </div>
          <div className="admin-overview-stat">
            <CheckCircle size={20} />
            <span className="admin-overview-number">{approvedEvents.length}</span>
            <span className="admin-overview-label">Approved</span>
          </div>
          <div className="admin-overview-stat">
            <Users size={20} />
            <span className="admin-overview-number">{members.length}</span>
            <span className="admin-overview-label">Members</span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="admin-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="admin-section-title">
            <AlertTriangle size={20} />
            Pending Review ({pendingEvents.length})
          </h2>

          {pendingEvents.length > 0 ? (
            <div className="admin-queue">
              {pendingEvents.map(event => {
                const cat = getCategoryById(event.category);
                const isExpanded = expandedId === event.id;

                return (
                  <div key={event.id} className="admin-card" id={`admin-card-${event.id}`}>
                    <div className="admin-card-header" onClick={() => toggleExpand(event.id)}>
                      <div className="admin-card-left">
                        <img src={event.coverImage} alt={event.title} className="admin-card-thumb" />
                        <div className="admin-card-info">
                          <h3 className="admin-card-title">{event.title}</h3>
                          <div className="admin-card-meta">
                            <span style={{ color: cat.color }}>{cat.icon} {cat.label}</span>
                            <span>•</span>
                            <span>by {event.organizer}</span>
                            <span>•</span>
                            <span>
                              <Calendar size={12} />
                              {format(new Date(event.dateStart), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="admin-card-right">
                        <span className="badge badge-warning">
                          <Clock size={10} />
                          Pending
                        </span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-card-body animate-fade-in">
                        <div className="admin-card-details">
                          <div className="admin-detail-row">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                          <div className="admin-detail-row">
                            <Calendar size={16} />
                            <span>
                              {format(new Date(event.dateStart), 'EEEE, MMM d, yyyy — h:mm a')}
                              {event.dateEnd && ` to ${format(new Date(event.dateEnd), 'h:mm a')}`}
                            </span>
                          </div>
                          {event.capacity && (
                            <div className="admin-detail-row">
                              <Users size={16} />
                              <span>Capacity: {event.capacity}</span>
                            </div>
                          )}
                          <div className="admin-detail-row">
                            <span className="admin-detail-label">Contact:</span>
                            <span>{event.contactEmail}</span>
                          </div>
                        </div>

                        <div className="admin-card-description">
                          <h4>Description</h4>
                          <p>{event.description}</p>
                        </div>

                        {event.tags && event.tags.length > 0 && (
                          <div className="admin-card-tags">
                            {event.tags.map(tag => (
                              <span key={tag} className="detail-keyword">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="admin-card-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => onApprove(event.id)}
                            id={`btn-approve-${event.id}`}
                          >
                            <CheckCircle size={16} />
                            Approve & Publish
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => onReject(event.id)}
                            id={`btn-reject-${event.id}`}
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(`/edit/${event.id}`)}
                            id={`btn-edit-${event.id}`}
                          >
                            <Edit3 size={16} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost admin-delete-btn"
                            onClick={() => setPendingDelete(event)}
                            id={`btn-delete-${event.id}`}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty">
              <CheckCircle size={40} />
              <h3>All Clear!</h3>
              <p>No pending events to review. You're up to date.</p>
            </div>
          )}
        </div>

        {/* Recently Approved */}
        <div className="admin-section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h2 className="admin-section-title">
            <CheckCircle size={20} />
            Recently Approved
          </h2>
          <div className="admin-approved-list">
            {approvedEvents.slice(0, 5).map(event => {
              const cat = getCategoryById(event.category);
              return (
                <div key={event.id} className="admin-approved-item">
                  <Link to={`/event/${event.id}`} className="admin-approved-link">
                    <img src={event.coverImage} alt={event.title} className="admin-approved-thumb" />
                    <div className="admin-approved-info">
                      <span className="admin-approved-title">{event.title}</span>
                      <span className="admin-approved-meta" style={{ color: cat.color }}>
                        {cat.icon} {cat.label} • {event.organizer}
                      </span>
                    </div>
                  </Link>
                  <div className="admin-approved-actions">
                    <span className="badge badge-success">Live</span>
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
                      className="btn btn-ghost btn-sm admin-delete-btn"
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
        </div>

        {/* Members */}
        <div className="admin-section animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h2 className="admin-section-title">
            <UserCog size={20} />
            Members ({members.length})
          </h2>

          {loadingMembers ? (
            <div className="admin-empty"><p>Loading members…</p></div>
          ) : membersError ? (
            <div className="admin-empty">
              <p>Could not load members: {membersError}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="admin-empty"><p>No members yet.</p></div>
          ) : (
            <div className="member-table" id="member-table">
              <div className="member-row member-head">
                <span>Member</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Events</span>
                <span>RSVPs</span>
              </div>
              {members.map(m => (
                <div className="member-row" key={m.id}>
                  <div className="member-cell member-identity">
                    <img src={m.avatar} alt="" className="member-avatar" />
                    <div className="member-info">
                      <span className="member-name">
                        {m.name}
                        {m.id === user.id && <span className="member-you">you</span>}
                      </span>
                      <span className="member-email">
                        <Mail size={11} />
                        {m.email}
                      </span>
                      {m.club && <span className="member-club">{m.club}</span>}
                    </div>
                  </div>

                  <div className="member-cell">
                    <select
                      className="form-select member-role-select"
                      value={m.role}
                      disabled={savingRole === m.id || m.id === user.id}
                      onChange={e => changeRole(m, e.target.value)}
                      aria-label={`Role for ${m.name}`}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="organizer">Organizer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="member-cell member-muted">
                    <CalendarDays size={12} />
                    {m.joinedAt ? format(m.joinedAt, 'MMM d, yyyy') : '—'}
                  </div>
                  <div className="member-cell member-muted">{m.eventCount}</div>
                  <div className="member-cell member-muted">{m.rsvpCount}</div>
                </div>
              ))}
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
