import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme/colors';
import { useVoiceStore } from '../store/useVoiceStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useStreakStore } from '../store/useStreakStore';
import { Tone, DeliveryStyle } from '../types';

const tones: Tone[] = [
  'Natural',
  'Funny',
  'Flirty',
  'Spicy',
  'Professional',
  'Romantic',
  'Sarcastic',
];

const deliveries: DeliveryStyle[] = [
  'Casual & Direct',
  'Witty & Teasing',
  'Warm & Engaging',
  'Unfiltered & Real',
];

export const HomeScreen: React.FC<{ onOpenReport: () => void }> = ({ onOpenReport }) => {
  const {
    tone,
    setTone,
    delivery,
    setDelivery,
    provider,
    setProvider,
    intensity,
    setIntensity,
    candidates,
    isLoading,
    improveCandidate,
  } = useVoiceStore();

  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { currentStreak } = useStreakStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo library access to upload chat screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      Alert.alert('Screenshot Uploaded', 'Analyzing bubbles with Claude 3.5 Sonnet Vision...');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header Bar */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>AI CHAT INTELLIGENCE</Text>
          <Text style={styles.brandTitle}>VOICE</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{currentStreak} DAYS</Text>
        </View>
      </View>

      {/* Screenshot Dropzone Card */}
      <TouchableOpacity style={styles.uploadCard} onPress={handlePickScreenshot} activeOpacity={0.8}>
        <Text style={styles.uploadTitle}>📸 TAP TO IMPORT SCREENSHOT</Text>
        <Text style={styles.uploadSubtitle}>Extracts speaker turns and chat context automatically</Text>
      </TouchableOpacity>

      {/* AI Engine Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>00 / AI ENGINE</Text>
        <View style={styles.wrapChips}>
          {(['claude', 'chatgpt', 'gemini'] as const).map((p) => {
            const label = p === 'claude' ? 'Claude 3.5' : p === 'chatgpt' ? 'ChatGPT-4o' : 'Gemini 1.5';
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, provider === p && styles.chipActive]}
                onPress={() => setProvider(p)}
              >
                <Text style={[styles.chipText, provider === p && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tone Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>01 / TONE FILTER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
          {tones.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tone === t && styles.chipActive]}
              onPress={() => setTone(t)}
            >
              <Text style={[styles.chipText, tone === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Delivery Style */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>02 / HUMAN DELIVERY</Text>
        <View style={styles.wrapChips}>
          {deliveries.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, delivery === d && styles.chipActive]}
              onPress={() => setDelivery(d)}
            >
              <Text style={[styles.chipText, delivery === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Candidates Header */}
      <View style={styles.candidatesHeader}>
        <View>
          <Text style={styles.sectionLabel}>SMART CANDIDATES (1–2 SENTENCES MAX)</Text>
          <Text style={styles.candidateMeta}>{tone.toUpperCase()} · {delivery.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.reportLink} onPress={onOpenReport}>
          <Text style={styles.reportLinkText}>VIEW REPORT ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Candidate Reply Cards */}
      {isLoading ? (
        <ActivityIndicator color={theme.colors.rustBright} size="large" style={{ marginVertical: 30 }} />
      ) : (
        <View style={styles.candidateList}>
          {candidates.map((candidate, idx) => {
            const isFav = isFavorite(candidate.body);
            const isCopied = copiedId === candidate.id;

            return (
              <View key={candidate.id} style={styles.replyCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.styleBadge}>{candidate.style.toUpperCase()}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.iconButton, isFav && styles.iconButtonActive]}
                      onPress={() => (isFav ? removeFavorite(candidate.id) : addFavorite(candidate.body, tone))}
                    >
                      <Text style={[styles.iconText, isFav && styles.iconTextActive]}>
                        {isFav ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, isCopied && styles.iconButtonCopied]}
                      onPress={() => handleCopy(candidate.id, candidate.body)}
                    >
                      <Text style={[styles.iconText, isCopied && styles.iconTextCopied]}>
                        {isCopied ? 'COPIED' : 'COPY'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.replyBody}>{candidate.body}</Text>

                <TouchableOpacity
                  style={styles.improveButton}
                  onPress={() =>
                    improveCandidate(idx, 'Honestly, I’m interested. What did you have in mind? 😌', 'warmer')
                  }
                >
                  <Text style={styles.improveButtonText}>✦ MAKE THIS BETTER</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    fontFamily: theme.typography.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  brandTitle: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#18110c',
    borderWidth: 1,
    borderColor: '#3c2a21',
  },
  streakIcon: {
    marginRight: 6,
  },
  streakText: {
    color: theme.colors.rustBright,
    fontSize: 11,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
  },
  uploadCard: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#3a332d',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  uploadTitle: {
    color: theme.colors.rustBright,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  uploadSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    color: '#756e67',
    fontSize: 10,
    fontFamily: theme.typography.mono,
    letterSpacing: 1.2,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  horizontalChips: {
    flexDirection: 'row',
    marginTop: 4,
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#342f2a',
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: {
    borderColor: theme.colors.rustBright,
    backgroundColor: 'rgba(196, 92, 48, 0.12)',
  },
  chipText: {
    color: '#aaa29a',
    fontSize: 11,
    fontFamily: theme.typography.mono,
    textTransform: 'uppercase',
  },
  chipTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  candidatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing.md,
  },
  candidateMeta: {
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '600',
  },
  reportLink: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rustBright,
    paddingBottom: 2,
  },
  reportLinkText: {
    color: theme.colors.rustBright,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  candidateList: {
    gap: 10,
  },
  replyCard: {
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
  styleBadge: {
    color: theme.colors.rustBright,
    fontSize: 9,
    fontFamily: theme.typography.mono,
    letterSpacing: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    borderWidth: 1,
    borderColor: '#39332e',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  iconButtonActive: {
    borderColor: theme.colors.rustBright,
  },
  iconButtonCopied: {
    borderColor: theme.colors.green,
  },
  iconText: {
    color: '#9e968d',
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  iconTextActive: {
    color: theme.colors.rustBright,
  },
  iconTextCopied: {
    color: theme.colors.green,
  },
  replyBody: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 4,
  },
  improveButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  improveButtonText: {
    color: '#7e7770',
    fontSize: 10,
    fontFamily: theme.typography.mono,
    letterSpacing: 0.8,
  },
});
