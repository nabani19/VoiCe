import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  isSyncing: boolean;
  // Local check-in (optimistic, offline-safe)
  checkIn: () => boolean;
  // Supabase sync — call on app boot or auth state change
  syncStreak: () => Promise<void>;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  currentStreak: 5,
  longestStreak: 12,
  lastCheckinDate: null,
  isSyncing: false,

  /**
   * Local idempotent check-in.
   * Updates Zustand immediately (optimistic), syncs to Supabase via syncStreak().
   * Returns true if streak incremented, false if already checked in today.
   */
  checkIn: () => {
    const today = new Date().toISOString().split('T')[0];
    const { lastCheckinDate, currentStreak, longestStreak } = get();

    if (lastCheckinDate === today) {
      return false; // Already checked in today
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = lastCheckinDate === yesterday ? currentStreak + 1 : 1;

    set({
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
      lastCheckinDate: today,
    });

    return true;
  },

  /**
   * Sync streak to Supabase via the IDOR-hardened `checkin_streak()` stored procedure.
   * Call on app boot, auth state change, or after checkIn().
   * If unauthenticated, silently no-ops (local-only streak).
   */
  syncStreak: async () => {
    set({ isSyncing: true });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        // Not authenticated — local streak only, still run local checkIn
        const { checkIn } = get();
        checkIn();
        set({ isSyncing: false });
        return;
      }

      // Call the server-side IDOR-hardened stored proc
      const { data, error } = await supabase.rpc('checkin_streak');

      if (error) {
        console.warn('[StreakStore] Supabase checkin_streak RPC failed:', error.message);
        // Fall back to local check-in to maintain streak display
        get().checkIn();
        set({ isSyncing: false });
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        set({
          currentStreak: result.current_streak,
          longestStreak: result.longest_streak,
          lastCheckinDate: new Date().toISOString().split('T')[0],
          isSyncing: false,
        });
      } else {
        // Unexpected empty result — fall back to local
        get().checkIn();
        set({ isSyncing: false });
      }
    } catch (err) {
      console.warn('[StreakStore] syncStreak error:', err);
      get().checkIn();
      set({ isSyncing: false });
    }
  },
}));
