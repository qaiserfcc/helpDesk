import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

export function DashboardScreen() {
  const { signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help Desk</Text>
        <Text style={styles.subtitle}>Tickets overview</Text>
      </View>

      <View style={styles.cardsRow}>
        {[
          { label: 'Open', count: 0 },
          { label: 'In Progress', count: 0 },
          { label: 'Resolved', count: 0 }
        ].map((card) => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardValue}>{card.count}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.primaryCta} onPress={() => {}}>
        <Text style={styles.primaryText}>Create Ticket</Text>
      </Pressable>

      <Pressable style={styles.secondaryCta} onPress={signOut}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#020617'
  },
  header: {
    marginTop: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    color: '#CBD5F5'
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0F172A'
  },
  cardLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  cardValue: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  primaryCta: {
    marginTop: 36,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#22D3EE'
  },
  primaryText: {
    fontWeight: '700',
    color: '#020617'
  },
  secondaryCta: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  secondaryText: {
    color: '#E2E8F0'
  }
});
