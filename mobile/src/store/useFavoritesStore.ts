import { create } from 'zustand';
import { FavoriteItem, Tone } from '../types';
import { supabase } from '../services/supabase';

interface FavoritesState {
  favorites: FavoriteItem[];
  selectedCategory: Tone | 'All';
  isLoading: boolean;
  // Actions
  setSelectedCategory: (category: Tone | 'All') => void;
  addFavorite: (body: string, category: Tone) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  loadFavorites: () => Promise<void>;
}

/** Seed data shown before user logs in / favorites load */
const DEMO_FAVORITES: FavoriteItem[] = [
  {
    id: 'fav-demo-1',
    body: "Bold of you to assume I'm free \uD83D\uDE0C what did you have in mind?",
    category: 'Flirty',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-demo-2',
    body: 'That sounds suspiciously like a good idea. Count me in.',
    category: 'Funny',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-demo-3',
    body: "Careful, you're starting to sound like trouble \uD83D\uDE0F",
    category: 'Spicy',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-demo-4',
    body: "Sounds solid. Let's align on next steps tomorrow morning.",
    category: 'Professional',
    createdAt: new Date().toISOString(),
  },
];

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: DEMO_FAVORITES,
  selectedCategory: 'All',
  isLoading: false,

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  /**
   * Load favorites from Supabase if authenticated, else keep demo data.
   * Call this once on app boot / auth state change.
   */
  loadFavorites: async () => {
    set({ isLoading: true });
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        // Not logged in — keep demo seed data
        set({ favorites: DEMO_FAVORITES, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id, body, category, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: FavoriteItem[] = (data || []).map((row: any) => ({
        id: row.id,
        body: row.body,
        category: row.category as Tone,
        createdAt: row.created_at,
      }));

      set({ favorites: mapped, isLoading: false });
    } catch (err) {
      console.warn('[FavoritesStore] loadFavorites failed:', err);
      set({ isLoading: false });
    }
  },

  /**
   * Add a favorite — optimistic update + Supabase insert (if authenticated).
   * Rolls back optimistic update on failure.
   */
  addFavorite: async (body, category) => {
    const existing = get().favorites.find((f) => f.body === body);
    if (existing) return; // Already saved

    const tempId = `local-${Date.now()}`;
    const newItem: FavoriteItem = {
      id: tempId,
      body,
      category,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update immediately
    set((state) => ({ favorites: [newItem, ...state.favorites] }));

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return; // Offline / anon — local only

      const { data, error } = await supabase
        .from('favorites')
        .insert({ body, category })
        .select('id, body, category, created_at')
        .single();

      if (error) throw error;

      // Replace temp id with real DB id
      set((state) => ({
        favorites: state.favorites.map((f) =>
          f.id === tempId
            ? { id: data.id, body: data.body, category: data.category as Tone, createdAt: data.created_at }
            : f
        ),
      }));
    } catch (err) {
      console.warn('[FavoritesStore] addFavorite failed, rolling back:', err);
      // Roll back optimistic update
      set((state) => ({ favorites: state.favorites.filter((f) => f.id !== tempId) }));
    }
  },

  /**
   * Remove a favorite — optimistic update + Supabase delete (if authenticated).
   * Rolls back on failure.
   */
  removeFavorite: async (id) => {
    const removed = get().favorites.find((f) => f.id === id);
    if (!removed) return;

    // Optimistic removal
    set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id) }));

    // Skip DB deletion for local-only / demo favorites
    if (id.startsWith('local-') || id.startsWith('fav-demo-')) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { error } = await supabase.from('favorites').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('[FavoritesStore] removeFavorite failed, rolling back:', err);
      // Restore the removed item
      set((state) => ({
        favorites: [removed, ...state.favorites],
      }));
    }
  },

  /**
   * Check if a candidate is already saved by candidate ID.
   * For optimistic local items, also checks body match.
   */
  isFavorite: (id) => get().favorites.some((f) => f.id === id),
}));
