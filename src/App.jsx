import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/CreateEventPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { supabase } from './lib/supabase';
import * as api from './lib/api';

// Auth Context
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Toast Context
export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let toastId = 0;

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [rsvpedIds, setRsvpedIds] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ---------- Session ----------
  useEffect(() => {
    let active = true;

    const loadProfile = async (session) => {
      if (!session?.user) {
        if (active) { setUser(null); setRsvpedIds([]); }
        return;
      }
      try {
        const profile = await api.fetchProfile(session.user.id);
        if (active) setUser(profile);
      } catch (err) {
        if (active) addToast(`Could not load your profile: ${err.message}`, 'error');
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session);
      if (active) setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [addToast]);

  // ---------- Events ----------
  const loadEvents = useCallback(async () => {
    try {
      setEvents(await api.fetchApprovedEvents());
    } catch (err) {
      addToast(`Could not load events: ${err.message}`, 'error');
    }
  }, [addToast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Pending queue and RSVPs are per-user, so they reload when the user changes.
  useEffect(() => {
    if (!user) { setPendingEvents([]); setRsvpedIds([]); return; }

    let active = true;
    (async () => {
      try {
        const ids = await api.fetchMyRsvpIds(user.id);
        if (active) setRsvpedIds(ids);
      } catch { /* RSVPs are non-critical for first paint */ }

      // Every signed-in user can submit, so everyone needs their pending
      // queue. RLS narrows it: an admin sees all pending events, everyone
      // else sees only their own.
      try {
        const pending = await api.fetchPendingEvents();
        if (active) setPendingEvents(pending);
      } catch { /* RLS may legitimately return nothing */ }
    })();
    return () => { active = false; };
  }, [user]);

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const login = () => {
    setShowAuthModal(false);
    addToast('Welcome back! You\'re now signed in.');
  };

  const logout = async () => {
    try {
      await api.signOut();
      addToast('Signed out successfully.', 'info');
    } catch (err) {
      addToast(`Sign out failed: ${err.message}`, 'error');
    }
  };

  const addEvent = async (form) => {
    const created = await api.createEvent(form, user);
    setPendingEvents(prev => [created, ...prev]);
    addToast('Event submitted! It will be reviewed by an admin.');
  };

  const editEvent = async (eventId, form) => {
    const updated = await api.updateEvent(eventId, form);
    const swap = (list) => list.map(e => (e.id === eventId ? updated : e));
    setEvents(swap);
    setPendingEvents(swap);
    addToast('Event updated.');
  };

  const removeEvent = async (eventId) => {
    await api.deleteEvent(eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setPendingEvents(prev => prev.filter(e => e.id !== eventId));
    setRsvpedIds(prev => prev.filter(id => id !== eventId));
    addToast('Event deleted.', 'info');
  };

  // Edit page may be opened directly by URL, so fall back to a fetch when the
  // event is not already in memory.
  const findEvent = useCallback(async (eventId) => {
    const local = [...events, ...pendingEvents].find(e => e.id === eventId);
    return local || await api.fetchEventById(eventId);
  }, [events, pendingEvents]);

  const approveEvent = async (eventId) => {
    try {
      const approved = await api.setEventStatus(eventId, 'approved');
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
      setEvents(prev => [approved, ...prev]);
      addToast('Event approved and published!');
    } catch (err) {
      addToast(`Could not approve: ${err.message}`, 'error');
    }
  };

  const rejectEvent = async (eventId) => {
    try {
      await api.setEventStatus(eventId, 'rejected');
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
      addToast('Event rejected.', 'error');
    } catch (err) {
      addToast(`Could not reject: ${err.message}`, 'error');
    }
  };

  const toggleRsvp = async (eventId) => {
    if (!user) {
      openAuth('login');
      addToast('Sign in to RSVP for events.', 'info');
      return;
    }

    const going = rsvpedIds.includes(eventId);
    const delta = going ? -1 : 1;

    // Optimistic update, rolled back if the database refuses.
    setRsvpedIds(prev => going ? prev.filter(id => id !== eventId) : [...prev, eventId]);
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, rsvpCount: Math.max(0, e.rsvpCount + delta) } : e
    ));

    try {
      if (going) await api.removeRsvp(eventId, user.id);
      else await api.addRsvp(eventId, user.id);
      addToast(going ? 'RSVP removed.' : 'RSVP confirmed! 🎉', going ? 'info' : 'success');
    } catch (err) {
      setRsvpedIds(prev => going ? [...prev, eventId] : prev.filter(id => id !== eventId));
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, rsvpCount: Math.max(0, e.rsvpCount - delta) } : e
      ));
      const full = /full/i.test(err.message);
      addToast(full ? 'This event is full — no spots left.' : `RSVP failed: ${err.message}`, 'error');
    }
  };

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout, openAuth }}>
      <ToastContext.Provider value={{ addToast }}>
        <div className="app">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage events={events} />} />
              <Route
                path="/event/:id"
                element={<EventDetailPage events={events} onRsvp={toggleRsvp} rsvpedIds={rsvpedIds} />}
              />
              <Route
                path="/create"
                element={<CreateEventPage onSubmit={addEvent} />}
              />
              <Route
                path="/edit/:id"
                element={<CreateEventPage onUpdate={editEvent} findEvent={findEvent} />}
              />
              <Route path="/calendar" element={<CalendarPage events={events} />} />
              <Route
                path="/dashboard"
                element={
                  <DashboardPage
                    events={events}
                    pendingEvents={pendingEvents}
                    onDelete={removeEvent}
                  />
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminPage
                    pendingEvents={pendingEvents}
                    approvedEvents={events}
                    onApprove={approveEvent}
                    onReject={rejectEvent}
                    onDelete={removeEvent}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <div className="container" style={{ paddingTop: '160px' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🧭</div>
                      <h3 className="empty-state-title">Page Not Found</h3>
                      <p className="empty-state-text">
                        That page doesn't exist. Let's get you back on track.
                      </p>
                      <Link to="/" className="btn btn-primary">Back to Events</Link>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>

          {showAuthModal && (
            <AuthModal
              mode={authMode}
              onClose={() => setShowAuthModal(false)}
              onLogin={login}
              onSwitchMode={(mode) => setAuthMode(mode)}
            />
          )}

          <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
