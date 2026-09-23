import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/colors';
import { Tone } from '../types';

interface HistoryItem {
  id: string;
  title: string;
  tone: Tone;
  preview: string;
  date: string;
}

const mockHistory: HistoryItem[] = [
  {
    id: 'h-1',
    title: 'Friday Night Plans with Sarah',
    tone: 'Flirty',
    preview: '“Bold of you to assume I’m free 😌 what did you have in mind?”',
    date: 'Today, 4:15 PM',
  },
  {
    id: 'h-2',
    title: 'Group Chat Weekend Trip',
    tone: 'Funny',
    preview: '“That sounds suspiciously like a trap, but I’m in.”',
    date: 'Yesterday, 8:20 PM',
  },
  {
    id: 'h-3',
    title: 'Client Project Scope Review',
    tone: 'Professional',
    preview: '“Sounds solid. Let’s align on next steps tomorrow morning.”',
    date: 'Sep 15, 11:30 AM',
  },
  {
    id: 'h-4',
    title: 'Late Night Texts with Alex',
    tone: 'Spicy',
    preview: '“Careful. You’re starting to sound like trouble 😏”',
    date: 'Sep 14, 10:45 PM',
  },
];

const tones: Array<Tone | 'All'> = ['All', 'Flirty', 'Funny', 'Spicy', 'Natural', 'Professional', 'Romantic', 'Sarcastic'];

export const HistoryScreen: React.FC = () => {
  const [selectedTone, setSelectedTone] = useState<Tone | 'All'>('All');

  const filtered = selectedTone === 'All'
    ? mockHistory
    : mockHistory.filter((item) => item.tone === selectedTone);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CONVERSATION LOG</Text>
      <Text style={styles.title}>HISTORY</Text>

      {/* Tone Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {tones.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, selectedTone === t && styles.filterChipActive]}
            onPress={() => setSelectedTone(t)}
          >
            <Text style={[styles.filterText, selectedTone === t && styles.filterTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* History Items */}
      <View style={styles.list}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.cardTop}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemTone}>{item.tone.toUpperCase()}</Text>
            </View>
            <Text style={styles.itemPreview}>{item.preview}</Text>
            <Text style={styles.itemDate}>{item.date}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    fontFamily: theme.typography.mono,
    letterSpacing: 1.5,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#342f2a',
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: theme.colors.rustBright,
    backgroundColor: 'rgba(196, 92, 48, 0.12)',
  },
  filterText: {
    color: '#aaa29a',
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  filterTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: '#2f2a26',
    padding: theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  itemTone: {
    color: theme.colors.rustBright,
    fontSize: 9,
    fontFamily: theme.typography.mono,
  },
  itemPreview: {
    color: '#bdb5ac',
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  itemDate: {
    color: '#756e67',
    fontSize: 9,
    fontFamily: theme.typography.mono,
    marginTop: 4,
  },
});
