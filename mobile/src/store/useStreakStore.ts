import { create } from 'zustand';

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  checkIn: () => boolean; // Returns true if streak incremented, false if already checked in today
}

export const useStreakStore = create<StreakState>((set, get) => ({
  currentStreak: 5,
  longestStreak: 12,
  lastCheckinDate: null,

  checkIn: () => {
    const today = new Date().toISOString().split('T')[0];
    const { lastCheckinDate, currentStreak, longestStreak } = get();

    if (lastCheckinDate === today) {
      return false; // Already checked in today
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;

    if (lastCheckinDate === yesterday) {
      newStreak = currentStreak + 1;
    }

    set({
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
      lastCheckinDate: today,
    });

    return true;
  },
}));
