import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from './src/theme/colors';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

type Tab = 'home' | 'report' | 'favorites' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.bg} />

      {/* Screen Render */}
      <View style={styles.screenArea}>
        {activeTab === 'home' && (
          <HomeScreen onOpenReport={() => setActiveTab('report')} />
        )}
        {activeTab === 'report' && (
          <ReportScreen onBack={() => setActiveTab('home')} />
        )}
        {activeTab === 'favorites' && <FavoritesScreen />}
        {activeTab === 'history' && <HistoryScreen />}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>VOICE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'report' && styles.tabItemActive]}
          onPress={() => setActiveTab('report')}
        >
          <Text style={[styles.tabIcon, activeTab === 'report' && styles.tabIconActive]}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'report' && styles.tabLabelActive]}>REPORT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'favorites' && styles.tabItemActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabIcon, activeTab === 'favorites' && styles.tabIconActive]}>★</Text>
          <Text style={[styles.tabLabel, activeTab === 'favorites' && styles.tabLabelActive]}>FAVORITES</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabIcon, activeTab === 'history' && styles.tabIconActive]}>⏳</Text>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>HISTORY</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  screenArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0c0a09',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingVertical: 10,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tabItemActive: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rustBright,
  },
  tabIcon: {
    color: '#756e67',
    fontSize: 16,
    marginBottom: 2,
  },
  tabIconActive: {
    color: theme.colors.rustBright,
  },
  tabLabel: {
    color: '#756e67',
    fontSize: 9,
    fontFamily: theme.typography.mono,
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
