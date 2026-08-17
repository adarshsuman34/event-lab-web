// Event categories. These mirror the `categories` table seeded by
// supabase/migrations/0001_init.sql — kept here as a static list so every
// card render does not need a round trip.
export const CATEGORIES = [
  { id: 'workshop', label: 'Workshop', color: '#6C5CE7', icon: '🔧' },
  { id: 'fest', label: 'Fest', color: '#FD79A8', icon: '🎉' },
  { id: 'seminar', label: 'Seminar', color: '#00CEC9', icon: '🎤' },
  { id: 'sports', label: 'Sports', color: '#FDCB6E', icon: '⚽' },
  { id: 'cultural', label: 'Cultural', color: '#E17055', icon: '🎭' },
  { id: 'hackathon', label: 'Hackathon', color: '#00B894', icon: '💻' },
  { id: 'club-meet', label: 'Club Meet', color: '#A29BFE', icon: '🤝' },
  { id: 'other', label: 'Other', color: '#636E72', icon: '📌' },
];

export const getCategoryById = (id) =>
  CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
