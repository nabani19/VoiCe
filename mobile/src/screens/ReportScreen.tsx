import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/colors';

export const ReportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Back Nav */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← BACK TO VOICE</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>CONVERSATION DIAGNOSTIC REPORT</Text>
      <Text style={styles.title}>THREAD ANALYSIS</Text>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View>
          <Text style={styles.scoreLabel}>CONVERSATIONAL MOMENTUM</Text>
          <Text style={styles.scoreNumber}>8.4</Text>
        </View>
        <View style={styles.tagWrap}>
          <Text style={styles.tag}>OPEN LOOP</Text>
          <Text style={styles.tag}>RECIPROCAL</Text>
          <Text style={styles.tag}>UNPROMPTED</Text>
        </View>
      </View>

      {/* Flow Arc */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionKey}>FLOW ARC</Text>
        <Text style={styles.sectionValue}>
          Opener → Playful banter → Mutual teasing → Open schedule inquiry
        </Text>
      </View>

      {/* Strong Signals */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionKey}>STRONG POSITIVE SIGNALS</Text>
        <Text style={styles.sectionValue}>
          They initiated a follow-up question after your last joke instead of allowing the topic to fade.
        </Text>
        <View style={styles.evidenceBadge}>
          <Text style={styles.evidenceText}>EVIDENCE: “What about that Italian spot you mentioned?”</Text>
        </View>
      </View>

      {/* Red Flags / Hesitations */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionKey}>WATCH OUT / HESITATION</Text>
        <Text style={styles.sectionValue}>
          They have not committed to a specific day yet. Avoid double-texting with multiple options.
        </Text>
        <View style={[styles.evidenceBadge, styles.warningBadge]}>
          <Text style={styles.warningText}>CONFIDENCE: MEDIUM · AMBIGUOUS COMMITMENT</Text>
        </View>
      </View>

      {/* How to Impress */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionKey}>HOW TO IMPRESS THEM</Text>
        <Text style={styles.sectionValue}>
          Offer one specific day and time with confidence (e.g. "Friday at 7:30") rather than an open-ended "whenever works for you." Decisiveness matches their teasing tone.
        </Text>
        <View style={[styles.evidenceBadge, styles.tipBadge]}>
          <Text style={styles.tipText}>PRO STRATEGY · ACTIVE LISTENING</Text>
        </View>
      </View>

      {/* Pro Tips */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionKey}>PRO TIPS FOR NEXT MOVES</Text>
        <Text style={styles.bulletItem}>• Keep replies under 15 words to maintain reciprocal conversational balance.</Text>
        <Text style={styles.bulletItem}>• Acknowledge the food banter before locking in the time.</Text>
        <Text style={styles.bulletItem}>• Never send two questions in consecutive texts.</Text>
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
  backButton: {
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
  },
  backText: {
    color: theme.colors.rustBright,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    fontWeight: '700',
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
    marginBottom: theme.spacing.lg,
  },
  scoreCard: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#756e67',
    fontSize: 9,
    fontFamily: theme.typography.mono,
    letterSpacing: 1,
  },
  scoreNumber: {
    color: theme.colors.rustBright,
    fontSize: 48,
    fontWeight: '800',
  },
  tagWrap: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  tag: {
    color: '#bdb6ad',
    borderWidth: 1,
    borderColor: '#39332f',
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 8,
    fontFamily: theme.typography.mono,
  },
  sectionCard: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionKey: {
    color: '#756e67',
    fontSize: 9,
    fontFamily: theme.typography.mono,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceBadge: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#314535',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  evidenceText: {
    color: '#a4c9a8',
    fontSize: 9,
    fontFamily: theme.typography.mono,
  },
  warningBadge: {
    borderColor: '#4a372e',
  },
  warningText: {
    color: '#caa99f',
    fontSize: 9,
    fontFamily: theme.typography.mono,
  },
  tipBadge: {
    borderColor: '#35304f',
  },
  tipText: {
    color: '#a9a0f0',
    fontSize: 9,
    fontFamily: theme.typography.mono,
  },
  bulletItem: {
    color: '#bdb5ac',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
