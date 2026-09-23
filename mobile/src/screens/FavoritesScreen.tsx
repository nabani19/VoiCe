import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme/colors';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { Tone } from '../types';

const categories: Array<Tone | 'All'> = [
  'All',
  'Flirty',
  'Funny',
  'Spicy',
  'Natural',
  'Professional',
  'Romantic',
  'Sarcastic',
];

export const FavoritesScreen: React.FC = () => {
  const { favorites, selectedCategory, setSelectedCategory, removeFavorite } = useFavoritesStore();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const filtered = selectedCategory === 'All'
    ? favorites
    : favorites.filter((f) => f.category === selectedCategory);

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ORGANIZED VAULT</Text>
      <Text style={styles.title}>FAVORITES</Text>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tabChip, selectedCategory === cat && styles.tabChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
              {cat.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Favorites List */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved lines in this category yet.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <View key={item.id} style={styles.favCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.catBadge}>{item.category.toUpperCase()}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.btn, isCopied && styles.btnCopied]}
                      onPress={() => handleCopy(item.id, item.body)}
                    >
                      <Text style={[styles.btnText, isCopied && styles.btnTextCopied]}>
                        {isCopied ? 'COPIED' : 'COPY'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btn} onPress={() => removeFavorite(item.id)}>
                      <Text style={styles.btnText}>REMOVE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.favBody}>{item.body}</Text>
              </View>
            );
          })
        )}
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
  tabScroll: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  tabChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#342f2a',
    marginRight: 6,
  },
  tabChipActive: {
    borderColor: theme.colors.rustBright,
    backgroundColor: 'rgba(196, 92, 48, 0.12)',
  },
  tabText: {
    color: '#aaa29a',
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  tabTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  favCard: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: '#2f2a26',
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    color: theme.colors.rustBright,
    fontSize: 9,
    fontFamily: theme.typography.mono,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    borderWidth: 1,
    borderColor: '#39332e',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnCopied: {
    borderColor: theme.colors.green,
  },
  btnText: {
    color: '#9e968d',
    fontSize: 9,
    fontFamily: theme.typography.mono,
  },
  btnTextCopied: {
    color: theme.colors.green,
  },
  favBody: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    padding: 30,
    borderWidth: 1,
    borderColor: '#342f2a',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
});
