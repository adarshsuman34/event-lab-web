import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { isToday, isTomorrow, isThisWeek, isAfter } from 'date-fns';
import {
  Search, SlidersHorizontal, X, Sparkles, TrendingUp,
  Calendar, CalendarDays, Plus, Zap, ChevronRight
} from 'lucide-react';
import EventCard from '../components/EventCard';
import { CATEGORIES } from '../data/mockData';
import './HomePage.css';

export default function HomePage({ events }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Derived event lists
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => isAfter(new Date(e.dateStart), now) || isToday(new Date(e.dateStart)))
      .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
  }, [events]);

  const todayEvents = useMemo(() => {
    return upcomingEvents.filter(e => isToday(new Date(e.dateStart)));
  }, [upcomingEvents]);

  const trendingEvents = useMemo(() => {
    return [...upcomingEvents].sort((a, b) => b.rsvpCount - a.rsvpCount).slice(0, 4);
  }, [upcomingEvents]);

  // Filtering
  const filteredEvents = useMemo(() => {
    let result = [...upcomingEvents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    if (selectedDateFilter === 'today') {
      result = result.filter(e => isToday(new Date(e.dateStart)));
    } else if (selectedDateFilter === 'tomorrow') {
      result = result.filter(e => isTomorrow(new Date(e.dateStart)));
    } else if (selectedDateFilter === 'week') {
      result = result.filter(e => isThisWeek(new Date(e.dateStart), { weekStartsOn: 1 }));
    }

    return result;
  }, [upcomingEvents, searchQuery, selectedCategory, selectedDateFilter]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedDateFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDateFilter('all');
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-content">
          <div className="hero-badge animate-fade-in-up">
            <Sparkles size={14} />
            <span>India's Event Hub</span>
          </div>
          <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Discover What's
            <br />
            <span className="gradient-text">Happening Across India</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Find workshops, fests, hackathons, meetups and more — from every
            city in India, all in one place.
          </p>

          {/* Search Bar */}
          <div className="hero-search animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="hero-search-inner">
              <Search size={20} className="hero-search-icon" />
              <input
                type="text"
                placeholder="Search events, organisers, cities, topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="hero-search-input"
                aria-label="Search events"
                id="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="hero-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              className={`btn btn-secondary hero-filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              id="btn-filters"
            >
              <SlidersHorizontal size={18} />
              <span>Filters</span>
            </button>

            {/* Phones swap the inline filter bar for two shortcuts.
                CSS shows either the Filters button or this row, never both. */}
            <div className="hero-mobile-actions">
              <Link to="/events" className="btn btn-secondary" id="btn-hero-events">
                <CalendarDays size={18} />
                <span>Events</span>
              </Link>
              <Link to="/create" className="btn btn-primary" id="btn-hero-post">
                <Plus size={18} />
                <span>Post Event</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Filter Bar */}
      {showFilters && (
        <section className="filter-bar animate-fade-in" id="filter-bar">
          <div className="container">
            <div className="filter-bar-inner">
              <div className="filter-group">
                <span className="filter-label">Category</span>
                <div className="filter-chips">
                  <button
                    className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    All
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{ '--chip-color': cat.color }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">When</span>
                <div className="filter-chips">
                  {[
                    { id: 'all', label: 'Anytime' },
                    { id: 'today', label: 'Today' },
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'week', label: 'This Week' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      className={`filter-chip ${selectedDateFilter === opt.id ? 'active' : ''}`}
                      onClick={() => setSelectedDateFilter(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Happening Today / Soon */}
      {todayEvents.length > 0 && !hasActiveFilters && (
        <section className="section" id="today-section">
          <div className="container">
            <div className="section-header">
              <div className="section-header-left">
                <div className="section-icon section-icon-live">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="section-title">Happening Today</h2>
                  <p className="section-subtitle">
                    {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'} happening today
                  </p>
                </div>
              </div>
            </div>
            <div className="event-grid stagger-children">
              {todayEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending / Most Popular */}
      {!hasActiveFilters && trendingEvents.length > 0 && (
        <section className="section" id="trending-section">
          <div className="container">
            <div className="section-header">
              <div className="section-header-left">
                <div className="section-icon section-icon-trending">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="section-title">Trending Events</h2>
                  <p className="section-subtitle">Most popular events this season</p>
                </div>
              </div>
              <Link to="/calendar" className="section-link">
                <span>View Calendar</span>
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="event-grid stagger-children">
              {trendingEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Upcoming / Filtered Results */}
      <section className="section" id="upcoming-section">
        <div className="container">
          <div className="section-header">
            <div className="section-header-left">
              <div className="section-icon">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="section-title">
                  {hasActiveFilters ? `Results (${filteredEvents.length})` : 'All Upcoming Events'}
                </h2>
                <p className="section-subtitle">
                  {hasActiveFilters
                    ? 'Filtered results based on your criteria'
                    : `${upcomingEvents.length} ${upcomingEvents.length === 1 ? 'event' : 'events'} coming up`
                  }
                </p>
              </div>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="event-grid stagger-children">
              {filteredEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state" id="no-results">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">No events found</h3>
              <p className="empty-state-text">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
