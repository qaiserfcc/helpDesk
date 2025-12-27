"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchTicketSLAStatus } from "@/services/slas";

interface SLATimerProps {
  ticketId: string;
}

export function SLATimer({ ticketId }: SLATimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: slaStatus, isLoading } = useQuery({
    queryKey: ["sla-status", ticketId],
    queryFn: () => fetchTicketSLAStatus(ticketId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update current time every second for countdown
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
    if (minutes === null) return "N/A";
    
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
    if (isBreached) return "text-red-400";
    if (remaining !== null && remaining < 60) return "text-yellow-400";
    return "text-green-400";
  };

  const getStatusBg = (isBreached: boolean, remaining: number | null) => {
    if (isBreached) return "bg-red-500/10 border-red-500/20";
    if (remaining !== null && remaining < 60) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-green-500/10 border-green-500/20";
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">SLA Status</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              slaStatus.isResponseBreached || slaStatus.isResolutionBreached
                ? "bg-red-500 animate-pulse"
                : "bg-green-500"
            }`}
          />
          <span className="text-xs text-white/60">
            {slaStatus.isResponseBreached || slaStatus.isResolutionBreached
              ? "Breached"
              : "On Track"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Response Time */}
        <div
          className={`p-4 rounded-lg border ${getStatusBg(
            slaStatus.isResponseBreached,
            slaStatus.responseTimeRemaining
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">First Response</span>
            {slaStatus.isResponseBreached && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                BREACHED
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${getStatusColor(
                slaStatus.isResponseBreached,
                slaStatus.responseTimeRemaining
              )}`}
            >
              {slaStatus.responseTimeRemaining !== null && slaStatus.responseTimeRemaining > 0
                ? formatTime(slaStatus.responseTimeRemaining)
                : slaStatus.isResponseBreached
                ? `+${formatTime(Math.abs(slaStatus.responseTimeRemaining || 0))}`
                : "Completed"}
            </span>
            <span className="text-sm text-white/50">
              {slaStatus.responseTimeRemaining !== null && slaStatus.responseTimeRemaining > 0
                ? "remaining"
                : slaStatus.isResponseBreached
                ? "overdue"
                : ""}
            </span>
          </div>

          {slaStatus.responseTimeDue && (
            <p className="text-xs text-white/40 mt-2">
              Due: {new Date(slaStatus.responseTimeDue).toLocaleString()}
            </p>
          )}
        </div>

        {/* Resolution Time */}
        <div
          className={`p-4 rounded-lg border ${getStatusBg(
            slaStatus.isResolutionBreached,
            slaStatus.resolutionTimeRemaining
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">Resolution</span>
            {slaStatus.isResolutionBreached && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                BREACHED
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${getStatusColor(
                slaStatus.isResolutionBreached,
                slaStatus.resolutionTimeRemaining
              )}`}
            >
              {slaStatus.resolutionTimeRemaining !== null && slaStatus.resolutionTimeRemaining > 0
                ? formatTime(slaStatus.resolutionTimeRemaining)
                : slaStatus.isResolutionBreached
                ? `+${formatTime(Math.abs(slaStatus.resolutionTimeRemaining || 0))}`
                : "Completed"}
            </span>
            <span className="text-sm text-white/50">
              {slaStatus.resolutionTimeRemaining !== null && slaStatus.resolutionTimeRemaining > 0
                ? "remaining"
                : slaStatus.isResolutionBreached
                ? "overdue"
                : ""}
            </span>
          </div>

          {slaStatus.resolutionTimeDue && (
            <p className="text-xs text-white/40 mt-2">
              Due: {new Date(slaStatus.resolutionTimeDue).toLocaleString()}
            </p>
          )}
        </div>

        {/* Warning Message */}
        {!slaStatus.isResponseBreached &&
          !slaStatus.isResolutionBreached &&
          slaStatus.resolutionTimeRemaining !== null &&
          slaStatus.resolutionTimeRemaining < 120 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              ⚠️ Resolution SLA approaching - Less than 2 hours remaining
            </div>
          )}
      </div>
    </div>
  );
}
