import { supabase } from './supabase';

const COVER_BUCKET = 'event-covers';

export const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop';

const avatarFor = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    (seed || '?').slice(0, 2)
  )}&backgroundColor=6C5CE7`;

// The database uses snake_case; the components were written against camelCase.
// Translate once here so no page has to care.
export function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    dateStart: row.date_start ? new Date(row.date_start) : null,
    dateEnd: row.date_end ? new Date(row.date_end) : null,
    location: row.location || '',
    isOnline: row.is_online,
    onlineLink: row.online_link || '',
    coverImage: row.cover_image || FALLBACK_COVER,
    organizerId: row.organizer_id,
    organizer: row.organizer,
    organizerAvatar: row.profiles?.avatar_url || avatarFor(row.organizer),
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    registrationLink: row.registration_link || '',
    rsvpEnabled: row.rsvp_enabled,
    capacity: row.capacity,
    rsvpCount: row.rsvp_count ?? 0,
    tags: row.tags || [],
    status: row.status,
    isVerified: row.is_verified,
    viewCount: row.view_count ?? 0,
    commentCount: 0,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

const EVENT_SELECT = '*, profiles(avatar_url)';

// ---------- Profiles ----------
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name || data.email?.split('@')[0] || 'User',
    email: data.email,
    role: data.role,
    avatar: data.avatar_url || avatarFor(data.name || data.email),
    club: data.club || '',
    isVerified: data.is_verified,
  };
}

// ---------- Admin: member directory ----------
export async function fetchAllUsers() {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data || []).map(u => ({
    id: u.id,
    name: u.name || u.email?.split('@')[0] || 'User',
    email: u.email,
    role: u.role,
    avatar: u.avatar_url || avatarFor(u.name || u.email),
    club: u.club || '',
    isVerified: u.is_verified,
    joinedAt: u.created_at ? new Date(u.created_at) : null,
    eventCount: Number(u.event_count ?? 0),
    rsvpCount: Number(u.rsvp_count ?? 0),
  }));
}

export async function setUserRole(userId, role) {
  const { error } = await supabase.rpc('admin_set_role', {
    target_id: userId,
    new_role: role,
  });
  if (error) throw error;
}

// ---------- Events ----------
export async function fetchApprovedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'approved')
    .order('date_start', { ascending: true });
  if (error) throw error;
  return data.map(mapEvent);
}

export async function fetchPendingEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapEvent);
}

export async function createEvent(form, user) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      date_start: form.dateStart.toISOString(),
      date_end: form.dateEnd ? form.dateEnd.toISOString() : null,
      location: form.location?.trim() || null,
      is_online: form.isOnline,
      online_link: form.onlineLink?.trim() || null,
      cover_image: form.coverImage || null,
      organizer_id: user.id,
      organizer: form.organizer.trim(),
      contact_email: form.contactEmail?.trim() || null,
      contact_phone: form.contactPhone?.trim() || null,
      registration_link: form.registrationLink?.trim() || null,
      rsvp_enabled: form.rsvpEnabled,
      capacity: form.capacity,
      tags: form.tags,
      status: 'pending', // RLS requires this; admins approve separately
    })
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  return mapEvent(data);
}

export async function fetchEventById(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle();
  if (error) {
    // A malformed id is a "not found", not a database error to show the user.
    if (error.code === '22P02') return null;
    throw error;
  }
  return mapEvent(data);
}

export async function updateEvent(eventId, form) {
  // `status` is deliberately never sent: guard_event_status() rejects status
  // changes from non-admins, and editing details should not re-open review.
  const { data, error } = await supabase
    .from('events')
    .update({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      date_start: form.dateStart.toISOString(),
      date_end: form.dateEnd ? form.dateEnd.toISOString() : null,
      location: form.location?.trim() || null,
      is_online: form.isOnline,
      online_link: form.onlineLink?.trim() || null,
      cover_image: form.coverImage || null,
      organizer: form.organizer.trim(),
      contact_email: form.contactEmail?.trim() || null,
      contact_phone: form.contactPhone?.trim() || null,
      registration_link: form.registrationLink?.trim() || null,
      rsvp_enabled: form.rsvpEnabled,
      capacity: form.capacity,
      tags: form.tags,
    })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  return mapEvent(data);
}

export async function deleteEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function setEventStatus(eventId, status) {
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  return mapEvent(data);
}

// ---------- RSVPs ----------
export async function fetchMyRsvpIds(userId) {
  const { data, error } = await supabase
    .from('rsvps')
    .select('event_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map(r => r.event_id);
}

export async function addRsvp(eventId, userId) {
  const { error } = await supabase
    .from('rsvps')
    .insert({ event_id: eventId, user_id: userId });
  // The database trigger raises when the event is full; surface it as-is.
  if (error) throw error;
}

export async function removeRsvp(eventId, userId) {
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ---------- Storage ----------
export async function uploadCover(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error(
        `Storage bucket "${COVER_BUCKET}" not found. Create it in Supabase ` +
        `(Storage → New bucket → public) and run 0003_storage.sql.`
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Auth ----------
export async function signUp({ email, password, name, club }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, club, avatar_url: avatarFor(name || email) } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
