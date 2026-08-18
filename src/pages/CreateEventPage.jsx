import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Upload, X, Eye, CheckCircle
} from 'lucide-react';
import EventCard from '../components/EventCard';
import { CATEGORIES } from '../data/mockData';
import * as api from '../lib/api';
import { useAuth } from '../App';
import { useToast } from '../App';
import './CreateEventPage.css';

// input[type=date] and [type=time] need local-time strings, not ISO/UTC.
const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop';

const INITIAL_FORM = {
  title: '',
  description: '',
  category: '',
  dateStart: '',
  timeStart: '',
  dateEnd: '',
  timeEnd: '',
  location: '',
  isOnline: false,
  onlineLink: '',
  coverImage: '',
  organizer: '',
  contactEmail: '',
  contactPhone: '',
  registrationLink: '',
  rsvpEnabled: false,
  capacity: '',
  tags: '',
};

export default function CreateEventPage({ onSubmit, onUpdate, findEvent }) {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const { user, openAuth } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    organizer: user?.club || user?.name || '',
    contactEmail: user?.email || '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(Boolean(editId));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!editId) return;
    let active = true;

    (async () => {
      try {
        const ev = await findEvent(editId);
        if (!active) return;
        if (!ev) { setLoadError('That event could not be found.'); return; }

        const start = new Date(ev.dateStart);
        const end = ev.dateEnd ? new Date(ev.dateEnd) : null;
        setForm({
          title: ev.title || '',
          description: ev.description || '',
          category: ev.category || '',
          dateStart: toDateInput(start),
          timeStart: toTimeInput(start),
          dateEnd: end ? toDateInput(end) : '',
          timeEnd: end ? toTimeInput(end) : '',
          location: ev.location || '',
          isOnline: ev.isOnline || false,
          onlineLink: ev.onlineLink || '',
          coverImage: ev.coverImage || '',
          organizer: ev.organizer || '',
          contactEmail: ev.contactEmail || '',
          contactPhone: ev.contactPhone || '',
          registrationLink: ev.registrationLink || '',
          rsvpEnabled: ev.rsvpEnabled || false,
          capacity: ev.capacity != null ? String(ev.capacity) : '',
          tags: (ev.tags || []).join(', '),
        });
        setCoverPreview(ev.coverImage || '');
      } catch (err) {
        if (active) setLoadError(err.message);
      } finally {
        if (active) setLoadingEvent(false);
      }
    })();

    return () => { active = false; };
  }, [editId, findEvent]);

  if (loadingEvent) {
    return (
      <div className="create-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">⏳</div>
            <h3 className="empty-state-title">Loading event…</h3>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="create-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">😢</div>
            <h3 className="empty-state-title">Could not load event</h3>
            <p className="empty-state-text">{loadError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="create-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '160px' }}>
            <div className="empty-state-icon">🔒</div>
            <h3 className="empty-state-title">Sign in to Post an Event</h3>
            <p className="empty-state-text">
              Anyone with an account can submit an event. An admin reviews it before it goes live.
            </p>
            <button className="btn btn-primary" onClick={() => openAuth('login')}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please choose an image file (JPG or PNG).', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      addToast('That image is larger than 5MB. Please pick a smaller one.', 'error');
      e.target.value = '';
      return;
    }

    // Show a local preview immediately, then upload in the background.
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.onerror = () => addToast('Could not read that image.', 'error');
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const publicUrl = await api.uploadCover(file, user.id);
      updateField('coverImage', publicUrl);
      addToast('Poster uploaded.');
    } catch (err) {
      setCoverPreview('');
      e.target.value = '';
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.category) errs.category = 'Select a category';
    if (!form.dateStart) errs.dateStart = 'Start date is required';
    if (!form.timeStart) errs.timeStart = 'Start time is required';
    if (!form.location.trim() && !form.isOnline) errs.location = 'Location is required';
    if (form.isOnline && !form.onlineLink.trim()) errs.onlineLink = 'Online link is required';
    if (!form.organizer.trim()) errs.organizer = 'Organizer name is required';

    if (form.dateStart && form.timeStart) {
      const start = new Date(`${form.dateStart}T${form.timeStart}`);
      if (Number.isNaN(start.getTime())) {
        errs.dateStart = 'Enter a valid start date and time';
      } else if (!isEdit && start < new Date()) {
        errs.dateStart = 'Start date and time must be in the future';
      }

      // An end date is optional, but a partial one silently disappeared before.
      if (form.dateEnd || form.timeEnd) {
        if (!form.dateEnd) {
          errs.dateEnd = 'Add an end date to go with the end time';
        } else if (!form.timeEnd) {
          errs.timeEnd = 'Add an end time to go with the end date';
        } else {
          const end = new Date(`${form.dateEnd}T${form.timeEnd}`);
          if (Number.isNaN(end.getTime())) {
            errs.dateEnd = 'Enter a valid end date and time';
          } else if (end <= start) {
            errs.dateEnd = 'End must be after the start';
          }
        }
      }
    }

    if (form.capacity) {
      const capacity = Number(form.capacity);
      if (!Number.isInteger(capacity) || capacity < 1) {
        errs.capacity = 'Capacity must be a whole number of 1 or more';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Shape the in-progress form into something EventCard can render.
  const previewStart = form.dateStart && form.timeStart
    ? new Date(`${form.dateStart}T${form.timeStart}`)
    : new Date();

  const previewEvent = {
    id: 'preview',
    title: form.title.trim() || 'Your event title',
    category: form.category || 'other',
    dateStart: Number.isNaN(previewStart.getTime()) ? new Date() : previewStart,
    location: form.isOnline
      ? (form.location.trim() || 'Online')
      : (form.location.trim() || 'Location to be announced'),
    isOnline: form.isOnline,
    coverImage: coverPreview || FALLBACK_COVER,
    organizer: form.organizer.trim() || user.name,
    organizerAvatar: user.avatar,
    rsvpEnabled: form.rsvpEnabled,
    capacity: form.capacity ? parseInt(form.capacity, 10) : null,
    rsvpCount: 0,
    isVerified: user.isVerified || false,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) {
      addToast('Please fix the errors before submitting.', 'error');
      return;
    }
    if (uploading) {
      addToast('Please wait for the poster to finish uploading.', 'info');
      return;
    }

    const eventData = {
      ...form,
      dateStart: new Date(`${form.dateStart}T${form.timeStart}`),
      dateEnd: form.dateEnd && form.timeEnd
        ? new Date(`${form.dateEnd}T${form.timeEnd}`)
        : null,
      coverImage: form.coverImage || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      // An external registration link takes over from the built-in RSVP, so
      // never ship both.
      rsvpEnabled: form.registrationLink.trim() ? false : form.rsvpEnabled,
      organizer: form.organizer.trim(),
      isVerified: user?.isVerified || false,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await onUpdate(editId, eventData);
      } else {
        await onSubmit(eventData);
      }
      navigate('/dashboard');
    } catch (err) {
      addToast(`Could not save: ${err.message}`, 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="create-page">
      <div className="container container-narrow">
        {/* Header */}
        <div className="create-header animate-fade-in-up">
          <button className="btn btn-ghost" onClick={() => navigate(-1)} id="btn-back-create">
            <ArrowLeft size={18} />
            Back
          </button>
          <div>
            <h1 className="create-title">{isEdit ? 'Edit Event' : 'Post a New Event'}</h1>
            <p className="create-subtitle">
              {isEdit
                ? 'Update the details below. Changes go live immediately.'
                : 'Fill in the details to publish your event to people across India.'}
            </p>
          </div>
        </div>

        <form className="create-form" onSubmit={handleSubmit} id="event-form">
          {/* Section: Basic Info */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="create-section-title">Basic Information</h2>

            <div className="form-group">
              <label className="form-label">
                Event Title <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="e.g. HackIndia 2027 — 36-Hour Hackathon"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                id="input-title"
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Description <span className="required">*</span>
              </label>
              <textarea
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                placeholder="Tell people what to expect at your event..."
                rows={6}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                id="input-description"
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
              <span className="form-hint">Supports plain text. Use ** for bold, - for bullet points.</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <div className="create-category-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`create-category-btn ${form.category === cat.id ? 'active' : ''}`}
                    onClick={() => updateField('category', cat.id)}
                    style={{ '--cat-color': cat.color }}
                  >
                    <span className="create-cat-icon">{cat.icon}</span>
                    <span className="create-cat-label">{cat.label}</span>
                  </button>
                ))}
              </div>
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>
          </div>

          {/* Section: Date & Location */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h2 className="create-section-title">Date, Time & Location</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Start Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${errors.dateStart ? 'input-error' : ''}`}
                  value={form.dateStart}
                  onChange={e => updateField('dateStart', e.target.value)}
                  id="input-date-start"
                />
                {errors.dateStart && <span className="form-error">{errors.dateStart}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Start Time <span className="required">*</span>
                </label>
                <input
                  type="time"
                  className={`form-input ${errors.timeStart ? 'input-error' : ''}`}
                  value={form.timeStart}
                  onChange={e => updateField('timeStart', e.target.value)}
                  id="input-time-start"
                />
                {errors.timeStart && <span className="form-error">{errors.timeStart}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className={`form-input ${errors.dateEnd ? 'input-error' : ''}`}
                  value={form.dateEnd}
                  onChange={e => updateField('dateEnd', e.target.value)}
                  id="input-date-end"
                />
                {errors.dateEnd && <span className="form-error">{errors.dateEnd}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className={`form-input ${errors.timeEnd ? 'input-error' : ''}`}
                  value={form.timeEnd}
                  onChange={e => updateField('timeEnd', e.target.value)}
                  id="input-time-end"
                />
                {errors.timeEnd && <span className="form-error">{errors.timeEnd}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Location {!form.isOnline && <span className="required">*</span>}
              </label>
              <input
                type="text"
                className={`form-input ${errors.location ? 'input-error' : ''}`}
                placeholder="e.g. Nehru Centre, Worli, Mumbai"
                value={form.location}
                onChange={e => updateField('location', e.target.value)}
                id="input-location"
              />
              {errors.location && <span className="form-error">{errors.location}</span>}
            </div>

            <div
              className="toggle-wrapper"
              onClick={() => updateField('isOnline', !form.isOnline)}
            >
              <div className={`toggle ${form.isOnline ? 'active' : ''}`} />
              <div>
                <span className="form-label" style={{ margin: 0 }}>This event is online / hybrid</span>
                <p className="form-hint" style={{ margin: 0 }}>Enable to add a virtual meeting link</p>
              </div>
            </div>

            {form.isOnline && (
              <div className="form-group animate-fade-in">
                <label className="form-label">
                  Online Meeting Link <span className="required">*</span>
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.onlineLink ? 'input-error' : ''}`}
                  placeholder="https://zoom.us/j/..."
                  value={form.onlineLink}
                  onChange={e => updateField('onlineLink', e.target.value)}
                  id="input-online-link"
                />
                {errors.onlineLink && <span className="form-error">{errors.onlineLink}</span>}
              </div>
            )}
          </div>

          {/* Section: Cover Image */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h2 className="create-section-title">Cover Image</h2>

            <div className="create-image-upload" id="image-upload">
              {coverPreview ? (
                <div className="create-image-preview">
                  <img src={coverPreview} alt="Cover preview" />
                  <button
                    type="button"
                    className="create-image-remove"
                    onClick={() => { setCoverPreview(''); updateField('coverImage', ''); }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="create-image-dropzone">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="create-image-input"
                  />
                  <Upload size={32} />
                  <p className="create-image-label">Drop your poster here or click to browse</p>
                  <p className="form-hint">Recommended: 800×400px, JPG or PNG, max 5MB</p>
                </label>
              )}
            </div>
          </div>

          {/* Section: Organizer */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <h2 className="create-section-title">Organizer & Contact</h2>

            <div className="form-group">
              <label className="form-label">
                Organizer / Club Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.organizer ? 'input-error' : ''}`}
                placeholder="e.g. Tech Collective, Bengaluru"
                value={form.organizer}
                onChange={e => updateField('organizer', e.target.value)}
                id="input-organizer"
              />
              {errors.organizer && <span className="form-error">{errors.organizer}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="contact@yourorg.in"
                  value={form.contactEmail}
                  onChange={e => updateField('contactEmail', e.target.value)}
                  id="input-contact-email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={form.contactPhone}
                  onChange={e => updateField('contactPhone', e.target.value)}
                  id="input-contact-phone"
                />
              </div>
            </div>
          </div>

          {/* Section: Registration */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <h2 className="create-section-title">Registration & Capacity</h2>

            <div className="form-group">
              <label className="form-label">External Registration Link</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://forms.google.com/..."
                value={form.registrationLink}
                onChange={e => updateField('registrationLink', e.target.value)}
                id="input-reg-link"
              />
              <span className="form-hint">Leave blank to use built-in RSVP</span>
            </div>

            {!form.registrationLink && (
              <div
                className="toggle-wrapper"
                onClick={() => updateField('rsvpEnabled', !form.rsvpEnabled)}
              >
                <div className={`toggle ${form.rsvpEnabled ? 'active' : ''}`} />
                <div>
                  <span className="form-label" style={{ margin: 0 }}>Enable RSVP on this portal</span>
                  <p className="form-hint" style={{ margin: 0 }}>Let people mark "I'm interested"</p>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input
                type="number"
                min="1"
                step="1"
                className={`form-input ${errors.capacity ? 'input-error' : ''}`}
                placeholder="e.g. 200"
                value={form.capacity}
                onChange={e => updateField('capacity', e.target.value)}
                id="input-capacity"
              />
              {errors.capacity && <span className="form-error">{errors.capacity}</span>}
              <span className="form-hint">Leave blank for unlimited</span>
            </div>
          </div>

          {/* Section: Tags */}
          <div className="create-section animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <h2 className="create-section-title">Tags & Keywords</h2>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input
                type="text"
                className="form-input"
                placeholder="coding, hackathon, prizes (comma-separated)"
                value={form.tags}
                onChange={e => updateField('tags', e.target.value)}
                id="input-tags"
              />
              <span className="form-hint">Help people discover your event through search</span>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="create-section animate-fade-in" id="create-preview">
              <h2 className="create-section-title">Preview</h2>
              <p className="form-hint" style={{ marginBottom: 'var(--space-md)' }}>
                This is how your event will appear in listings.
              </p>
              <div className="create-preview-card">
                <EventCard event={previewEvent} />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="create-submit animate-fade-in-up" style={{ animationDelay: '700ms' }}>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => setShowPreview(!showPreview)}
              id="btn-preview"
            >
              <Eye size={18} />
              Preview
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting || uploading}
              id="btn-submit-event"
            >
              <CheckCircle size={18} />
              {submitting
                ? 'Saving…'
                : uploading
                  ? 'Uploading poster…'
                  : isEdit ? 'Save Changes' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
