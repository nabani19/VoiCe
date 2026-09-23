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
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme/colors';
import { useVoiceStore } from '../store/useVoiceStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useStreakStore } from '../store/useStreakStore';
import { Tone, DeliveryStyle } from '../types';
import { generateReplies, improveReply, analyzeChat } from '../services/api';

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

const IMPROVE_TRANSFORMS = [
  { label: 'Shorter', value: 'shorter' },
  { label: 'Funnier', value: 'funnier' },
  { label: 'Warmer', value: 'warmer' },
  { label: 'More Chill', value: 'more chill' },
  { label: 'Wittier', value: 'wittier' },
  { label: 'Less Aggressive', value: 'less aggressive' },
];

export const HomeScreen: React.FC<{ onOpenReport: () => void }> = ({ onOpenReport }) => {
  const {
    messages,
    setMessages,
    tone,
    setTone,
    delivery,
    setDelivery,
    provider,
    setProvider,
    intensity,
    candidates,
    setCandidates,
    isLoading,
    setLoading,
    setError,
    improveCandidate,
  } = useVoiceStore();

  const { addFavorite, removeFavorite, isFavorite, loadFavorites } = useFavoritesStore();
  const { currentStreak } = useStreakStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [improvingIdx, setImprovingIdx] = useState<number | null>(null);
  const [showImproveSheet, setShowImproveSheet] = useState<{ idx: number; candidateText: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleGenerateReplies = async (selectedTone: Tone = tone) => {
    setLoading(true);
    setError(null);
    try {
      const results = await generateReplies({
        messages,
        tone: selectedTone,
        delivery,
        intensity,
        intent: 'continue',
        provider,
      });
      setCandidates(results);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToneSelect = (t: Tone) => {
    setTone(t);
    handleGenerateReplies(t);
  };

  const handleImprove = async (idx: number, transformation: string) => {
    setShowImproveSheet(null);
    setImprovingIdx(idx);
    try {
      const candidateText = candidates[idx]?.body || '';
      const result = await improveReply(candidateText, transformation, provider);
      improveCandidate(idx, result.revised_text, transformation);
    } catch (err: any) {
      Alert.alert('Could not improve reply', err.message || 'Try again.');
    } finally {
      setImprovingIdx(null);
    }
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
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const imageBase64 = result.assets[0].base64 || '';
      const mediaType = (result.assets[0].mimeType as any) || 'image/jpeg';
      setIsAnalyzing(true);
      setError(null);
      try {
        const analysis = await analyzeChat({ imageBase64, provider });
        setMessages(analysis.messages);
        if (analysis.detected_tone) setTone(analysis.detected_tone);
        await handleGenerateReplies(analysis.detected_tone || tone);
      } catch (err: any) {
        Alert.alert('Analysis failed', err.message || 'Could not process screenshot.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pasteText.trim()) return;
    setIsAnalyzing(true);
    setShowPasteInput(false);
    try {
      const analysis = await analyzeChat({ text: pasteText, provider });
      setMessages(analysis.messages);
      if (analysis.detected_tone) setTone(analysis.detected_tone);
      await handleGenerateReplies(analysis.detected_tone || tone);
    } catch (err: any) {
      Alert.alert('Analysis failed', err.message || 'Could not analyze text.');
    } finally {
      setIsAnalyzing(false);
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
      <TouchableOpacity
        style={styles.uploadCard}
        onPress={handlePickScreenshot}
        activeOpacity={0.8}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <ActivityIndicator color={theme.colors.rustBright} />
            <Text style={styles.uploadSubtitle}>Analyzing with Claude Vision…</Text>
          </>
        ) : (
          <>
            <Text style={styles.uploadTitle}>📸 TAP TO IMPORT SCREENSHOT</Text>
            <Text style={styles.uploadSubtitle}>Extracts speaker turns and chat context automatically</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Paste Text Toggle */}
      <TouchableOpacity style={styles.pasteToggle} onPress={() => setShowPasteInput(!showPasteInput)}>
        <Text style={styles.pasteToggleText}>{showPasteInput ? '↑ HIDE PASTE INPUT' : '✎ PASTE CHAT TEXT INSTEAD'}</Text>
      </TouchableOpacity>

      {showPasteInput && (
        <View style={styles.pasteBlock}>
          <TextInput
            style={styles.pasteInput}
            placeholder="Paste chat thread here…"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={4}
            value={pasteText}
            onChangeText={setPasteText}
          />
          <TouchableOpacity
            style={[styles.analyzeBtn, !pasteText.trim() && styles.analyzeBtnDisabled]}
            onPress={handlePasteAnalyze}
            disabled={!pasteText.trim() || isAnalyzing}
          >
            <Text style={styles.analyzeBtnText}>ANALYZE ↗</Text>
          </TouchableOpacity>
        </View>
      )}

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
              onPress={() => handleToneSelect(t)}
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.regenerateBtn} onPress={() => handleGenerateReplies()} disabled={isLoading}>
            <Text style={styles.regenerateBtnText}>↺ REGEN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportLink} onPress={onOpenReport}>
            <Text style={styles.reportLinkText}>VIEW REPORT ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Candidate Reply Cards */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.rustBright} size="large" />
          <Text style={styles.loadingText}>Generating with {provider === 'claude' ? 'Claude 3.5' : provider === 'chatgpt' ? 'ChatGPT-4o' : 'Gemini 1.5'}…</Text>
        </View>
      ) : (
        <View style={styles.candidateList}>
          {candidates.map((candidate, idx) => {
            const isFav = isFavorite(candidate.id);
            const isCopied = copiedId === candidate.id;
            const isImprovingThis = improvingIdx === idx;

            return (
              <View key={candidate.id} style={styles.replyCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.styleBadge}>{candidate.style.toUpperCase()}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.iconButton, isFav && styles.iconButtonActive]}
                      onPress={() => (isFav ? removeFavorite(candidate.id) : void addFavorite(candidate.body, tone))}
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

                {isImprovingThis ? (
                  <ActivityIndicator color={theme.colors.rustBright} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <TouchableOpacity
                    style={styles.improveButton}
                    onPress={() => setShowImproveSheet({ idx, candidateText: candidate.body })}
                  >
                    <Text style={styles.improveButtonText}>✦ MAKE THIS BETTER</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Improve Bottom Sheet Modal */}
      <Modal
        visible={!!showImproveSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImproveSheet(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowImproveSheet(null)} activeOpacity={1}>
          <View style={styles.improveSheet}>
            <Text style={styles.improveSheetTitle}>MAKE IT BETTER</Text>
            <Text style={styles.improveSheetSubtitle}>Select transformation</Text>
            {IMPROVE_TRANSFORMS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={styles.transformOption}
                onPress={() => showImproveSheet && handleImprove(showImproveSheet.idx, t.value)}
              >
                <Text style={styles.transformOptionText}>{t.label.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: theme.spacing.sm,
    minHeight: 64,
    justifyContent: 'center',
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
  pasteToggle: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pasteToggleText: {
    color: '#756e67',
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pasteBlock: {
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  pasteInput: {
    backgroundColor: '#12100e',
    borderWidth: 1,
    borderColor: '#342f2a',
    color: theme.colors.text,
    padding: theme.spacing.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  analyzeBtn: {
    backgroundColor: theme.colors.rust,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.4,
  },
  analyzeBtnText: {
    color: '#fff',
    fontFamily: theme.typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  regenerateBtn: {
    borderWidth: 1,
    borderColor: '#342f2a',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  regenerateBtnText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 0.5,
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
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.mono,
    fontSize: 11,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  improveSheet: {
    backgroundColor: '#12100e',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    padding: theme.spacing.lg,
    gap: 8,
  },
  improveSheetTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  improveSheetSubtitle: {
    color: theme.colors.muted,
    fontSize: 11,
    marginBottom: 12,
  },
  transformOption: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#342f2a',
  },
  transformOptionText: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
});
