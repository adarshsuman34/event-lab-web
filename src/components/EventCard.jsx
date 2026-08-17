import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { MapPin, Clock, Users, CheckCircle, Globe } from 'lucide-react';
import { getCategoryById } from '../data/mockData';
import './EventCard.css';

export default function EventCard({ event, index = 0, variant = 'default' }) {
  const category = getCategoryById(event.category);
  const now = new Date();
  const start = new Date(event.dateStart);
  const end = event.dateEnd ? new Date(event.dateEnd) : null;

  const hoursUntil = differenceInHours(start, now);
  const isLive = start <= now && (end ? end >= now : false);
  const isSoon = isLive || (hoursUntil >= 0 && hoursUntil <= 24);
  const capacityPercent = event.capacity
    ? Math.round((event.rsvpCount / event.capacity) * 100)
    : 0;

  const getDateLabel = () => {
    if (isToday(start)) return 'Today';
    if (isTomorrow(start)) return 'Tomorrow';
    return format(start, 'EEE, MMM d');
  };

  return (
    <Link
      to={`/event/${event.id}`}
      className={`event-card ${variant} ${isSoon ? 'event-card-soon' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
      id={`event-card-${event.id}`}
    >
      {/* Cover Image */}
      <div className="event-card-image">
        <img src={event.coverImage} alt={event.title} loading="lazy" />
        <div className="event-card-image-overlay" />
        
        {/* Category Badge */}
        <span
          className="event-card-category"
          style={{ '--cat-color': category.color }}
        >
          <span>{category.icon}</span>
          <span>{category.label}</span>
        </span>

        {/* Soon Badge */}
        {isSoon && (
          <span className="event-card-soon-badge">
            {isLive
              ? '🔴 Happening Now'
              : hoursUntil < 1
                ? '⏰ Starting soon'
                : `⏰ ${hoursUntil}h away`}
          </span>
        )}

        {/* Online Badge */}
        {event.isOnline && (
          <span className="event-card-online-badge">
            <Globe size={12} />
            Online
          </span>
        )}
      </div>

      {/* Content */}
      <div className="event-card-content">
        <div className="event-card-date-row">
          <span className={`event-card-date ${isSoon ? 'soon' : ''}`}>
            <Clock size={14} />
            {getDateLabel()} • {format(start, 'h:mm a')}
          </span>
        </div>

        <h3 className="event-card-title">{event.title}</h3>

        <div className="event-card-meta">
          <span className="event-card-location">
            <MapPin size={14} />
            <span>{event.location}</span>
          </span>
        </div>

        <div className="event-card-footer">
          <div className="event-card-organizer">
            <img src={event.organizerAvatar} alt={event.organizer} className="event-card-org-avatar" />
            <span className="event-card-org-name">
              {event.organizer}
              {event.isVerified && <CheckCircle size={12} className="verified-icon" />}
            </span>
          </div>

          {event.rsvpEnabled && event.capacity && (
            <div className="event-card-rsvp">
              <Users size={14} />
              <span>{event.rsvpCount}</span>
              <div className="event-card-capacity-bar">
                <div
                  className="event-card-capacity-fill"
                  style={{
                    width: `${Math.min(capacityPercent, 100)}%`,
                    background: capacityPercent > 80 ? 'var(--color-warning)' : 'var(--color-primary-light)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
