"use client";

import React, { useEffect, useState } from "react";

interface SLATimerProps {
  createdAt: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  resolvedAt?: string | null;
  ticketStatus: string;
}

interface TimeRemaining {
  responseSeconds: number;
  resolutionSeconds: number;
  responseBreached: boolean;
  resolutionBreached: boolean;
}

const calculateTimeRemaining = (
  createdAt: string,
  responseHours: number,
  resolutionHours: number,
  resolvedAt?: string | null,
): TimeRemaining => {
  const created = new Date(createdAt).getTime();
  const now = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  
  const elapsedSeconds = (now - created) / 1000;
  const responseSeconds = responseHours * 3600 - elapsedSeconds;
  const resolutionSeconds = resolutionHours * 3600 - elapsedSeconds;
  
  return {
    responseSeconds: Math.max(0, responseSeconds),
    resolutionSeconds: Math.max(0, resolutionSeconds),
    responseBreached: responseSeconds < 0,
    resolutionBreached: resolutionSeconds < 0,
  };
};

const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Exceeded";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const getSeverityColor = (seconds: number, breached: boolean): string => {
  if (breached) return "bg-red-500/20 border-red-500/50 text-red-400";
  
  const hours = seconds / 3600;
  if (hours <= 0.5) return "bg-orange-500/20 border-orange-500/50 text-orange-400"; // Critical: <30min
  if (hours <= 2) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"; // Warning: <2hrs
  return "bg-green-500/20 border-green-500/50 text-green-400"; // OK: >2hrs
};

const getSeverityBg = (seconds: number, breached: boolean): string => {
  if (breached) return "bg-red-600";
  const hours = seconds / 3600;
  if (hours <= 0.5) return "bg-orange-600";
  if (hours <= 2) return "bg-yellow-600";
  return "bg-green-600";
};

const getProgressPercentage = (
  current: number,
  max: number,
): number => {
  const percentage = (current / max) * 100;
  return Math.min(100, Math.max(0, percentage));
};

export default function SLATimer({
  createdAt,
  responseTimeHours,
  resolutionTimeHours,
  resolvedAt,
  ticketStatus,
}: SLATimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    responseSeconds: 0,
    resolutionSeconds: 0,
    responseBreached: false,
    resolutionBreached: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const time = calculateTimeRemaining(
        createdAt,
        responseTimeHours,
        resolutionTimeHours,
        resolvedAt,
      );
      setTimeRemaining(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt, responseTimeHours, resolutionTimeHours, resolvedAt]);

  if (!mounted) return null;

  const isResolved = ticketStatus === "resolved";
  const responsePercent = getProgressPercentage(
    timeRemaining.responseSeconds,
    responseTimeHours * 3600,
  );
  const resolutionPercent = getProgressPercentage(
    timeRemaining.resolutionSeconds,
    resolutionTimeHours * 3600,
  );

  const responseSeverityColor = getSeverityColor(
    timeRemaining.responseSeconds,
    timeRemaining.responseBreached,
  );
  const resolutionSeverityColor = getSeverityColor(
    timeRemaining.resolutionSeconds,
    timeRemaining.resolutionBreached,
  );

  return (
    <div className="space-y-4">
      {/* Response SLA */}
      <div className={`border rounded-lg p-4 ${responseSeverityColor}`}>
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold">Response Time SLA</p>
          <p className="text-sm">
            {isResolved
              ? "Resolved"
              : formatTimeRemaining(timeRemaining.responseSeconds)}
          </p>
        </div>
        <p className="text-xs mb-2 opacity-80">
          {responseTimeHours} hours target
        </p>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getSeverityBg(
              timeRemaining.responseSeconds,
              timeRemaining.responseBreached,
            )} transition-all duration-1000`}
            style={{ width: `${responsePercent}%` }}
          />
        </div>
      </div>

      {/* Resolution SLA */}
      <div className={`border rounded-lg p-4 ${resolutionSeverityColor}`}>
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold">Resolution Time SLA</p>
          <p className="text-sm">
            {isResolved
              ? "Resolved"
              : formatTimeRemaining(timeRemaining.resolutionSeconds)}
          </p>
        </div>
        <p className="text-xs mb-2 opacity-80">
          {resolutionTimeHours} hours target
        </p>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getSeverityBg(
              timeRemaining.resolutionSeconds,
              timeRemaining.resolutionBreached,
            )} transition-all duration-1000`}
            style={{ width: `${resolutionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
