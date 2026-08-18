import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, ExternalLink, Share2,
  Mail, Phone, Globe, CheckCircle, Heart, Flag,
  Tag, Eye, Bookmark
} from 'lucide-react';
import { getCategoryById } from '../data/mockData';
import { useToast } from '../App';
import * as api from '../lib/api';
import './EventDetailPage.css';

// Renders the lightweight markdown subset used by event descriptions.
// Consecutive "- " lines are collected into a single <ul> so the list items
// are not emitted bare into a <div>.
function renderDescription(description) {
  const lines = description.split('\n');
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="detail-desc-list">
        {bullets.map((text, i) => <li key={i}>{text}</li>)}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      return;
    }
    flushBullets();
    if (line.startsWith('**') && line.endsWith('**')) {
      blocks.push(
        <h3 key={i} className="detail-desc-heading">{line.replace(/\*\*/g, '')}</h3>
      );
    } else if (line.trim() !== '') {
      blocks.push(<p key={i}>{line.replace(/\*\*/g, '')}</p>);
    }
  });

  flushBullets();
  return blocks;
}

export default function EventDetailPage({ events, onRsvp, rsvpedIds = [], onSave, savedIds = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const event = events.find(e => e.id === id);
  const hasRsvped = rsvpedIds.includes(id);
  const hasSaved = savedIds.includes(id);

  // Count one view per event per browser session, so refreshing or coming
  // back from the RSVP flow does not inflate the number.
  useEffect(() => {
    if (!id) return;
    const key = `viewed:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    api.incrementView(id);
  }, [id]);

  if (!event) {
    return (
      <div className="detail-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">😢</div>
            <h3 className="empty-state-title">Event Not Found</h3>
            <p className="empty-state-text">This event may have been removed or doesn't exist.</p>
            <Link to="/" className="btn btn-primary">Back to Events</Link>
          </div>
        </div>
      </div>
    );
  }

  const category = getCategoryById(event.category);
  const capacityPercent = event.capacity ? Math.round((event.rsvpCount / event.capacity) * 100) : 0;

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on EventLab!`,
          url,
        });
        return;
      } catch (err) {
        // The user dismissing the share sheet is not an error worth reporting.
        if (err.name === 'AbortError') return;
        // Anything else: fall through to the clipboard path below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied to clipboard!', 'info');
    } catch {
      addToast('Could not copy the link. Copy it from the address bar.', 'error');
    }
  };

  return (
    <div className="detail-page">
      {/* Hero Banner */}
      <div className="detail-hero" id="event-detail-hero">
        <img src={event.coverImage} alt={event.title} className="detail-hero-img" />
        <div className="detail-hero-overlay" />
        <div className="container detail-hero-content">
          <button className="detail-back btn btn-ghost" onClick={() => navigate(-1)} id="btn-back">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container detail-container">
        <div className="detail-layout">
          {/* Left: Main Content */}
          <div className="detail-main animate-fade-in-up">
            {/* Category & Tags */}
            <div className="detail-tags-row">
              <span
                className="badge"
                style={{
                  background: `${category.color}20`,
                  color: category.color,
                  border: `1px solid ${category.color}40`
                }}
              >
                {category.icon} {category.label}
              </span>
              {event.isOnline && (
                <span className="badge badge-secondary">
                  <Globe size={12} />
                  Online Available
                </span>
              )}
              {event.isVerified && (
                <span className="badge badge-success">
                  <CheckCircle size={12} />
                  Verified
                </span>
              )}
            </div>

            <h1 className="detail-title" id="event-title">{event.title}</h1>

            {/* Organizer */}
            <div className="detail-organizer">
              <img src={event.organizerAvatar} alt={event.organizer} className="detail-org-avatar" />
              <div>
                <p className="detail-org-name">
                  {event.organizer}
                  {event.isVerified && <CheckCircle size={14} className="verified-icon" />}
                </p>
                <p className="detail-org-label">Organizer</p>
              </div>
            </div>

            {/* Description */}
            <div className="detail-description" id="event-description">
              <h2 className="detail-section-title">About This Event</h2>
              <div className="detail-description-content">
                {renderDescription(event.description)}
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="detail-keywords">
                <h2 className="detail-section-title">Tags</h2>
                <div className="detail-keyword-list">
                  {event.tags.map(tag => (
                    <span key={tag} className="detail-keyword">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="detail-sidebar animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {/* Action Card */}
            <div className="detail-card detail-action-card" id="event-action-card">
              {/* Date & Time */}
              <div className="detail-info-row">
                <div className="detail-info-icon">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="detail-info-primary">
                    {format(new Date(event.dateStart), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="detail-info-secondary">
                    <Clock size={14} />
                    {format(new Date(event.dateStart), 'h:mm a')}
                    {event.dateEnd && ` — ${format(new Date(event.dateEnd), 'h:mm a')}`}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="detail-info-row">
                <div className="detail-info-icon">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="detail-info-primary">{event.location}</p>
                  {event.isOnline && event.onlineLink && (
                    <a
                      href={event.onlineLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-info-link"
                    >
                      <Globe size={14} />
                      Join Online
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Capacity */}
              {event.capacity && (
                <div className="detail-info-row">
                  <div className="detail-info-icon">
                    <Users size={20} />
                  </div>
                  <div className="detail-capacity-info">
                    <p className="detail-info-primary">
                      {event.rsvpCount} / {event.capacity} spots filled
                    </p>
                    <div className="detail-capacity-bar">
                      <div
                        className="detail-capacity-fill"
                        style={{
                          width: `${Math.min(capacityPercent, 100)}%`,
                          background: capacityPercent > 90
                            ? 'var(--color-error)'
                            : capacityPercent > 70
                              ? 'var(--color-warning)'
                              : 'var(--color-primary-light)'
                        }}
                      />
                    </div>
                    {capacityPercent > 80 && (
                      <p className="detail-spots-warning">
                        {capacityPercent >= 100 ? '🔴 Sold out!' : '⚠️ Filling up fast!'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="detail-actions">
                {event.registrationLink ? (
                  <a
                    href={event.registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-lg detail-register-btn"
                    id="btn-register"
                  >
                    Register Now
                    <ExternalLink size={16} />
                  </a>
                ) : event.rsvpEnabled ? (
                  <button
                    className={`btn btn-lg detail-register-btn ${hasRsvped ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => onRsvp(event.id)}
                    id="btn-rsvp"
                  >
                    <Heart size={18} />
                    {hasRsvped ? "You're going — cancel RSVP" : "RSVP — I'm Interested"}
                  </button>
                ) : null}

                <div className="detail-secondary-actions">
                  <button className="btn btn-secondary" onClick={handleShare} id="btn-share">
                    <Share2 size={16} />
                    Share
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary ${hasSaved ? 'detail-saved' : ''}`}
                    onClick={() => onSave(event.id)}
                    aria-pressed={hasSaved}
                    id="btn-save"
                  >
                    <Bookmark size={16} fill={hasSaved ? 'currentColor' : 'none'} />
                    {hasSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="detail-card" id="event-contact-card">
              <h3 className="detail-card-title">Contact Organizer</h3>
              {event.contactEmail && (
                <a href={`mailto:${event.contactEmail}`} className="detail-contact-row">
                  <Mail size={16} />
                  <span>{event.contactEmail}</span>
                </a>
              )}
              {event.contactPhone && (
                <a href={`tel:${event.contactPhone}`} className="detail-contact-row">
                  <Phone size={16} />
                  <span>{event.contactPhone}</span>
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="detail-card" id="event-stats-card">
              <h3 className="detail-card-title">Event Stats</h3>
              <div className="detail-stats-grid">
                <div className="detail-stat">
                  <Eye size={16} />
                  <span>{event.viewCount.toLocaleString()} views</span>
                </div>
                <div className="detail-stat">
                  <Users size={16} />
                  <span>{event.rsvpCount} RSVPs</span>
                </div>
                <div className="detail-stat">
                  <Bookmark size={16} />
                  <span>{event.saveCount ?? 0} saves</span>
                </div>
              </div>
            </div>

            {/* Report */}
            <button className="btn btn-ghost detail-report-btn" id="btn-report">
              <Flag size={14} />
              Report this event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
