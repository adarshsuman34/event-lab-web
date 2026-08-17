import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, List } from 'lucide-react';
import { getCategoryById } from '../data/mockData';
import './CalendarPage.css';

export default function CalendarPage({ events }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'list'

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calStart.getTime(), calEnd.getTime()]);

  // Events by date
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const key = format(new Date(event.dateStart), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate]);

  // All upcoming events for list view
  const upcomingList = useMemo(() => {
    return events
      .filter(e => isAfter(new Date(e.dateStart), new Date()) || isToday(new Date(e.dateStart)))
      .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
  }, [events]);

  // Group events by date for list view
  const groupedByDate = useMemo(() => {
    const groups = {};
    upcomingList.forEach(event => {
      const key = format(new Date(event.dateStart), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = { date: new Date(event.dateStart), events: [] };
      groups[key].events.push(event);
    });
    return Object.values(groups);
  }, [upcomingList]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-page">
      <div className="container">
        {/* Header */}
        <div className="calendar-header animate-fade-in-up" id="calendar-header">
          <div className="calendar-header-left">
            <h1 className="calendar-title">Event Calendar</h1>
            <p className="calendar-subtitle">Browse events by date</p>
          </div>

          <div className="calendar-header-right">
            <div className="calendar-view-toggle">
              <button
                className={`calendar-view-btn ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
              >
                <CalIcon size={16} />
                Month
              </button>
              <button
                className={`calendar-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
                List
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="calendar-layout animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {/* Calendar Grid */}
            <div className="calendar-grid-wrapper">
              {/* Month Navigation */}
              <div className="calendar-nav">
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  id="btn-prev-month"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="calendar-month-label">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  id="btn-next-month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="calendar-weekdays">
                {weekDays.map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="calendar-days">
                {calendarDays.map((day, i) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate[key] || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                      onClick={() => setSelectedDate(day)}
                      aria-pressed={!!isSelected}
                      aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${
                        dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ', no events'
                      }`}
                    >
                      <span className="calendar-day-number">{format(day, 'd')}</span>
                      {dayEvents.length > 0 && (
                        <div className="calendar-day-dots">
                          {dayEvents.slice(0, 3).map(ev => {
                            const cat = getCategoryById(ev.category);
                            return (
                              <span
                                key={ev.id}
                                className="calendar-day-dot"
                                style={{ background: cat.color }}
                              />
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="calendar-day-more">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Panel */}
            <div className="calendar-panel">
              {selectedDate ? (
                <>
                  <h3 className="calendar-panel-title">
                    {isToday(selectedDate)
                      ? 'Today'
                      : format(selectedDate, 'EEEE, MMM d')
                    }
                  </h3>
                  {selectedDateEvents.length > 0 ? (
                    <div className="calendar-panel-events">
                      {selectedDateEvents.map(event => {
                        const cat = getCategoryById(event.category);
                        return (
                          <Link
                            to={`/event/${event.id}`}
                            key={event.id}
                            className="calendar-event-item"
                            style={{ '--ev-color': cat.color }}
                          >
                            <div className="calendar-event-time">
                              {format(new Date(event.dateStart), 'h:mm a')}
                            </div>
                            <div className="calendar-event-info">
                              <p className="calendar-event-title">{event.title}</p>
                              <p className="calendar-event-meta">
                                <span>{cat.icon} {cat.label}</span>
                                <span>•</span>
                                <span>{event.location}</span>
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="calendar-panel-empty">
                      <p>No events on this date</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="calendar-panel-empty">
                  <CalIcon size={32} />
                  <p>Select a date to see events</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="calendar-list animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {groupedByDate.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No Upcoming Events</h3>
                <p className="empty-state-text">
                  There's nothing scheduled right now. Check back soon.
                </p>
              </div>
            )}
            {groupedByDate.map(group => (
              <div key={format(group.date, 'yyyy-MM-dd')} className="calendar-list-group">
                <div className="calendar-list-date">
                  <div className={`calendar-list-date-badge ${isToday(group.date) ? 'today' : ''}`}>
                    <span className="calendar-list-day">{format(group.date, 'd')}</span>
                    <span className="calendar-list-weekday">{format(group.date, 'EEE')}</span>
                  </div>
                  <span className="calendar-list-date-full">
                    {isToday(group.date) ? 'Today' : format(group.date, 'EEEE, MMMM d')}
                  </span>
                </div>
                <div className="calendar-list-events">
                  {group.events.map(event => {
                    const cat = getCategoryById(event.category);
                    return (
                      <Link
                        to={`/event/${event.id}`}
                        key={event.id}
                        className="calendar-list-item"
                        style={{ '--ev-color': cat.color }}
                      >
                        <img src={event.coverImage} alt={event.title} className="calendar-list-img" />
                        <div className="calendar-list-info">
                          <span className="calendar-list-time">
                            {format(new Date(event.dateStart), 'h:mm a')}
                          </span>
                          <h4 className="calendar-list-title">{event.title}</h4>
                          <p className="calendar-list-meta">
                            {cat.icon} {cat.label} • {event.location}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
