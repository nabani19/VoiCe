import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme/colors';
import { useVoiceStore } from '../store/useVoiceStore';

export const ReportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { report, isLoading } = useVoiceStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Back Nav */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← BACK TO VOICE</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>CONVERSATION DIAGNOSTIC REPORT</Text>
      <Text style={styles.title}>THREAD ANALYSIS</Text>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.rustBright} size="large" />
          <Text style={styles.loadingText}>Generating report with AI…</Text>
        </View>
      ) : report ? (
        <>
          {/* Score Card — from live report data */}
          <View style={styles.scoreCard}>
            <View>
              <Text style={styles.scoreLabel}>CONVERSATIONAL MOMENTUM</Text>
              <Text style={styles.scoreNumber}>{report.score.toFixed(1)}</Text>
            </View>
            <View style={styles.tagWrap}>
              {report.observable_cues.slice(0, 3).map((cue, i) => (
                <Text key={i} style={styles.tag}>{cue.toUpperCase()}</Text>
              ))}
            </View>
          </View>

          {/* Flow Arc */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKey}>FLOW ARC</Text>
            <Text style={styles.sectionValue}>{report.flow_arc}</Text>
          </View>

          {/* Strong Signals */}
          {report.strong_signals.map((sig, i) => (
            <View key={i} style={styles.sectionCard}>
              <Text style={styles.sectionKey}>STRONG POSITIVE SIGNAL</Text>
              <Text style={styles.signalTitle}>{sig.signal}</Text>
              <Text style={styles.sectionValue}>{sig.meaning}</Text>
              {sig.evidence ? (
                <View style={styles.evidenceBadge}>
                  <Text style={styles.evidenceText}>EVIDENCE: "{sig.evidence}"</Text>
                </View>
              ) : null}
            </View>
          ))}

          {/* Red Flags */}
          {report.red_flags.map((flag, i) => (
            <View key={i} style={styles.sectionCard}>
              <Text style={styles.sectionKey}>WATCH OUT / HESITATION</Text>
              <Text style={styles.flagTitle}>{flag.flag}</Text>
              <Text style={styles.sectionValue}>{flag.risk}</Text>
              <View style={[styles.evidenceBadge, styles.warningBadge]}>
                <Text style={styles.warningText}>CONFIDENCE: {flag.confidence.toUpperCase()} · {flag.evidence}</Text>
              </View>
            </View>
          ))}

          {/* How to Impress */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKey}>HOW TO IMPRESS THEM</Text>
            <Text style={styles.sectionValue}>{report.how_to_impress.advice}</Text>
            <View style={[styles.evidenceBadge, styles.tipBadge]}>
              <Text style={styles.tipText}>KEY INTEREST: {report.how_to_impress.key_interest.toUpperCase()}</Text>
            </View>
          </View>

          {/* Pro Tips */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKey}>PRO TIPS FOR NEXT MOVES</Text>
            {report.pro_tips.map((tip, i) => (
              <Text key={i} style={styles.bulletItem}>• {tip}</Text>
            ))}
          </View>

          {/* Suggested Next Moves */}
          {report.suggested_next_moves?.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKey}>SUGGESTED NEXT MOVES</Text>
              {report.suggested_next_moves.map((move, i) => (
                <Text key={i} style={styles.bulletItem}>→ {move}</Text>
              ))}
            </View>
          )}
        </>
      ) : (
        /* Empty State — shown before first analysis */
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>NO REPORT YET</Text>
          <Text style={styles.emptyBody}>
            Import a screenshot or paste a chat thread on the VOICE tab to generate your full conversation diagnostic report.
          </Text>
          <TouchableOpacity style={styles.emptyAction} onPress={onBack}>
            <Text style={styles.emptyActionText}>→ GO TO VOICE ENGINE</Text>
          </TouchableOpacity>
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
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.mono,
    fontSize: 11,
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
  signalTitle: {
    color: theme.colors.rustBright,
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    marginBottom: 4,
  },
  flagTitle: {
    color: '#caa99f',
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    marginBottom: 4,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    borderWidth: 1,
    borderColor: '#2b2723',
    borderStyle: 'dashed',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyBody: {
    color: '#756e67',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAction: {
    borderWidth: 1,
    borderColor: theme.colors.rustBright,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyActionText: {
    color: theme.colors.rustBright,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
