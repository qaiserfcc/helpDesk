import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchTicketSLAStatus } from '@/services/slas';

interface SLATimerProps {
  ticketId: string;
}

export function SLATimer({ ticketId }: SLATimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: slaStatus, isLoading } = useQuery({
    queryKey: ['sla-status', ticketId],
    queryFn: () => fetchTicketSLAStatus(ticketId),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading || !slaStatus || !slaStatus.slaId) {
    return null;
  }

  const formatTime = (minutes: number | null): string => {
    if (minutes === null) return 'N/A';

    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.floor(absMinutes % 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }

    return `${mins}m`;
  };

  const getStatusColor = (isBreached: boolean, remaining: number | null) => {
    if (isBreached) return '#ef4444';
    if (remaining !== null && remaining < 60) return '#fbbf24';
    return '#22c55e';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SLA Status</Text>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  slaStatus.isResponseBreached || slaStatus.isResolutionBreached
                    ? '#ef4444'
                    : '#22c55e',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {slaStatus.isResponseBreached || slaStatus.isResolutionBreached
              ? 'Breached'
              : 'On Track'}
          </Text>
        </View>
      </View>

      {/* Response Time */}
      <View
        style={[
          styles.metricCard,
          {
            borderColor: getStatusColor(
              slaStatus.isResponseBreached,
              slaStatus.responseTimeRemaining
            ),
          },
        ]}
      >
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>First Response</Text>
          {slaStatus.isResponseBreached && <Text style={styles.breachedBadge}>BREACHED</Text>}
        </View>

        <Text
          style={[
            styles.metricValue,
            {
              color: getStatusColor(
                slaStatus.isResponseBreached,
                slaStatus.responseTimeRemaining
              ),
            },
          ]}
        >
          {slaStatus.responseTimeRemaining !== null && slaStatus.responseTimeRemaining > 0
            ? formatTime(slaStatus.responseTimeRemaining)
            : slaStatus.isResponseBreached
            ? `+${formatTime(Math.abs(slaStatus.responseTimeRemaining || 0))}`
            : 'Completed'}
        </Text>
        <Text style={styles.metricSubtext}>
          {slaStatus.responseTimeRemaining !== null && slaStatus.responseTimeRemaining > 0
            ? 'remaining'
            : slaStatus.isResponseBreached
            ? 'overdue'
            : ''}
        </Text>

        {slaStatus.responseTimeDue && (
          <Text style={styles.dueText}>
            Due: {new Date(slaStatus.responseTimeDue).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Resolution Time */}
      <View
        style={[
          styles.metricCard,
          {
            borderColor: getStatusColor(
              slaStatus.isResolutionBreached,
              slaStatus.resolutionTimeRemaining
            ),
          },
        ]}
      >
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>Resolution</Text>
          {slaStatus.isResolutionBreached && <Text style={styles.breachedBadge}>BREACHED</Text>}
        </View>

        <Text
          style={[
            styles.metricValue,
            {
              color: getStatusColor(
                slaStatus.isResolutionBreached,
                slaStatus.resolutionTimeRemaining
              ),
            },
          ]}
        >
          {slaStatus.resolutionTimeRemaining !== null && slaStatus.resolutionTimeRemaining > 0
            ? formatTime(slaStatus.resolutionTimeRemaining)
            : slaStatus.isResolutionBreached
            ? `+${formatTime(Math.abs(slaStatus.resolutionTimeRemaining || 0))}`
            : 'Completed'}
        </Text>
        <Text style={styles.metricSubtext}>
          {slaStatus.resolutionTimeRemaining !== null && slaStatus.resolutionTimeRemaining > 0
            ? 'remaining'
            : slaStatus.isResolutionBreached
            ? 'overdue'
            : ''}
        </Text>

        {slaStatus.resolutionTimeDue && (
          <Text style={styles.dueText}>
            Due: {new Date(slaStatus.resolutionTimeDue).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Warning */}
      {!slaStatus.isResponseBreached &&
        !slaStatus.isResolutionBreached &&
        slaStatus.resolutionTimeRemaining !== null &&
        slaStatus.resolutionTimeRemaining < 120 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Resolution SLA approaching - Less than 2 hours remaining
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  metricCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  breachedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dueText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
  warningBox: {
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 12,
  },
});
