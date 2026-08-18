import { useState, useMemo } from 'react';
import { isPast, isFuture, isToday } from 'date-fns';
import { Search, X, CalendarDays, SlidersHorizontal } from 'lucide-react';
import EventCard from '../components/EventCard';
import { CATEGORIES } from '../data/mockData';
import './EventsPage.css';

const TIME_FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

export default function EventsPage({ events }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');

  // An event counts as over only once its end time has passed; a day-long
  // event should not disappear the moment it starts.
  const endOf = (e) => new Date(e.dateEnd || e.dateStart);

  const counts = useMemo(() => ({
    upcoming: events.filter(e => !isPast(endOf(e))).length,
    past: events.filter(e => isPast(endOf(e))).length,
    all: events.length,
  }), [events]);

  const filtered = useMemo(() => {
    let result = [...events];

    if (timeFilter === 'upcoming') {
      result = result.filter(e => !isPast(endOf(e)));
      result.sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
    } else if (timeFilter === 'past') {
      result = result.filter(e => isPast(endOf(e)));
      result.sort((a, b) => new Date(b.dateStart) - new Date(a.dateStart));
    } else {
      result.sort((a, b) => new Date(b.dateStart) - new Date(a.dateStart));
    }

    if (category !== 'all') {
      result = result.filter(e => e.category === category);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [events, query, category, timeFilter]);

  const hasFilters = query.trim() || category !== 'all';

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <div className="events-page">
      <div className="container">
        <div className="events-header animate-fade-in-up">
          <div className="events-header-icon">
            <CalendarDays size={22} />
          </div>
          <div>
            <h1 className="events-title">All Events</h1>
            <p className="events-subtitle">
              Every event across India — browse, search, and filter.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="events-search animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <Search size={18} className="events-search-icon" />
          <input
            type="text"
            className="events-search-input"
            placeholder="Search by title, organiser, city, or tag…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search events"
            id="events-search"
          />
          {query && (
            <button
              type="button"
              className="events-search-clear"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Upcoming / Past / All */}
        <div className="events-tabs animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          {TIME_FILTERS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`events-tab ${timeFilter === t.id ? 'active' : ''}`}
              onClick={() => setTimeFilter(t.id)}
              aria-pressed={timeFilter === t.id}
            >
              {t.label}
              <span className="events-tab-count">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="events-filters animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <span className="events-filter-label">
            <SlidersHorizontal size={14} />
            Category
          </span>
          <div className="events-chips">
            <button
              type="button"
              className={`filter-chip ${category === 'all' ? 'active' : ''}`}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`filter-chip ${category === cat.id ? 'active' : ''}`}
                style={{ '--chip-color': cat.color }}
                onClick={() => setCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="events-results-bar">
          <span className="events-count">
            {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
          </span>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="event-grid stagger-children">
            {filtered.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state" id="events-empty">
            <div className="empty-state-icon">{hasFilters ? '🔍' : '📅'}</div>
            <h3 className="empty-state-title">
              {hasFilters ? 'No matching events' : 'No events here yet'}
            </h3>
            <p className="empty-state-text">
              {hasFilters
                ? 'Try a different search or category.'
                : timeFilter === 'past'
                  ? 'Once events finish, they will appear here.'
                  : 'Nothing has been posted yet. Check back soon.'}
            </p>
            {hasFilters && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
