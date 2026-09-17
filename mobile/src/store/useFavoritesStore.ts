import { create } from 'zustand';
import { FavoriteItem, Tone } from '../types';

interface FavoritesState {
  favorites: FavoriteItem[];
  selectedCategory: Tone | 'All';
  setSelectedCategory: (category: Tone | 'All') => void;
  addFavorite: (body: string, category: Tone) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (body: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [
    {
      id: 'fav-1',
      body: 'Bold of you to assume I’m free 😌 what did you have in mind?',
      category: 'Flirty',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fav-2',
      body: 'That sounds suspiciously like a good idea. Count me in.',
      category: 'Funny',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fav-3',
      body: 'Careful, you’re starting to sound like trouble 😏',
      category: 'Spicy',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fav-4',
      body: 'Sounds solid. Let’s align on next steps tomorrow morning.',
      category: 'Professional',
      createdAt: new Date().toISOString(),
    },
  ],
  selectedCategory: 'All',

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  addFavorite: (body, category) => {
    const existing = get().favorites.find((f) => f.body === body);
    if (!existing) {
      const newItem: FavoriteItem = {
        id: `fav-${Date.now()}`,
        body,
        category,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ favorites: [newItem, ...state.favorites] }));
    }
  },

  removeFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.id !== id),
    })),

  isFavorite: (body) => get().favorites.some((f) => f.body === body),
}));
