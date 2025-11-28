"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchAdminEscalationReport,
  fetchAdminOverviewReport,
  fetchRecentTicketActivity,
  type ReportTicket,
  type TicketActivityEntry,
} from "@/services/tickets";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";

const formatStatus = formatTicketStatus;

// Helper functions
type StatusBucket = {
  status: "open" | "in_progress" | "resolved";
  count: number;
};

type HighlightCounts = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
};

const STATUS_ORDER: ("open" | "in_progress" | "resolved")[] = ["open", "in_progress", "resolved"];

function buildStatusBuckets(
  statusCounts?: Partial<Record<string, number>>,
): StatusBucket[] {
  const source = statusCounts ?? { open: 0, in_progress: 0, resolved: 0 };
  return STATUS_ORDER.map((status) => ({
    status,
    count: source[status] ?? 0,
  }));
}

function getTotalTickets(buckets: StatusBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

function getHighlightCounts(buckets: StatusBucket[]): HighlightCounts {
  const totals: HighlightCounts = {
    total: getTotalTickets(buckets),
    open: 0,
    inProgress: 0,
    resolved: 0,
  };

  buckets.forEach((bucket) => {
    if (bucket.status === "open") {
      totals.open = bucket.count;
    }
    if (bucket.status === "in_progress") {
      totals.inProgress = bucket.count;
    }
    if (bucket.status === "resolved") {
      totals.resolved = bucket.count;
    }
  });

  return totals;
}

function rankAssignments(
  assignments?: Array<{
    agentId: string;
    count: number;
    agent: { id: string; name: string; email: string } | null;
  }>,
) {
  if (!assignments || assignments.length === 0) {
    return [];
  }
  return [...assignments].sort((a, b) => b.count - a.count);
}

function getStatusShare(count: number, total: number): number {
  if (!total) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

export default function StatusSummaryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["reports", "admin-overview"],
    queryFn: fetchAdminOverviewReport,
    enabled: user?.role === "admin",
  });

  const {
    data: escalations,
    isLoading: escalationsLoading,
    refetch: refetchEscalations,
  } = useQuery({
    queryKey: ["reports", "admin-escalations"],
    queryFn: fetchAdminEscalationReport,
    enabled: user?.role === "admin",
  });

  const {
    data: recentActivity = [],
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => fetchRecentTicketActivity(25),
    enabled: user?.role === "admin",
  });

  const statusBuckets = buildStatusBuckets(overview?.statusCounts);
  const highlights = getHighlightCounts(statusBuckets);
  const topAgents = useMemo(() => {
    const assignments = overview?.assignmentLoad ?? [];
    return rankAssignments(assignments);
  }, [overview?.assignmentLoad]);

  const oldestOpen = overview?.oldestOpen ?? [];
  const highPriority = escalations?.highPriority ?? [];
  const staleTickets = escalations?.staleTickets ?? [];
  const totalTickets = highlights.total;
  const refreshing = overviewLoading || escalationsLoading || activityLoading;

  const onRefresh = () => {
    refetchOverview();
    refetchEscalations();
    refetchActivity();
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/90 mb-6">You need admin access to see the organization-wide status summary.</p>
          <button
            onClick={() => router.back()}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Back
          </button>
          <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-white">Organization Report</h1>
                  <p className="text-white/90 mt-2">Live ticket overview</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Summary Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card rounded-lg shadow p-6">
            <p className="text-sm text-white/80">Total tickets</p>
            <p className="text-3xl font-bold text-white">{highlights.total}</p>
          </div>
          <div className="card rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-3xl font-bold text-white">{highlights.open}</p>
          </div>
            <div className="card rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">In progress</p>
            <p className="text-3xl font-bold text-white">{highlights.inProgress}</p>
          </div>
            <div className="card rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-3xl font-bold text-white">{highlights.resolved}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Distribution */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Status Distribution</h2>
            {overviewLoading && !overview ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : statusBuckets.length > 0 ? (
              <div className="space-y-4">
                {statusBuckets.map((bucket) => {
                  const share = getStatusShare(bucket.count, totalTickets);
                  return (
                    <div key={bucket.status} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {formatStatus(bucket.status)}
                        </p>
                        <p className="text-sm text-white/80">{share}% of total</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold text-white">{bucket.count}</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`bg-white/10 h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.max(share, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No summary data yet.</p>
            )}
          </div>

          {/* Assignment Load */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Assignment Load</h2>
            {overviewLoading && !overview ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : topAgents.length > 0 ? (
              <div className="space-y-3">
                {topAgents.map((assignment) => (
                  <div key={assignment.agentId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.agent?.name ?? "Unknown agent"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {assignment.agent?.email ?? "N/A"}
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {assignment.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active assignments.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Oldest Open Tickets */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Oldest Open Tickets</h2>
            <p className="text-sm text-gray-500 mb-4">Longest waiting issues</p>
            {overviewLoading && oldestOpen.length === 0 ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : oldestOpen.length > 0 ? (
              <div className="space-y-3">
                {oldestOpen.map((ticket: ReportTicket) => (
                  <Link
                    key={ticket.id}
                    href={`/ticket/${ticket.id}`}
                    className="block p-3 border border-white/10 rounded-lg hover:bg-white/6 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{ticket.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Opened {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.creator.name}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending open tickets.</p>
            )}
          </div>

          {/* High Priority Alerts */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-2">High Priority Alerts</h2>
            <p className="text-sm text-gray-500 mb-4">Requires immediate action</p>
            {escalationsLoading && highPriority.length === 0 ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : highPriority.length > 0 ? (
              <div className="space-y-3">
                {highPriority.map((ticket: ReportTicket) => (
                  <Link
                    key={ticket.id}
                    href={`/ticket/${ticket.id}`}
                    className="block p-3 border border-red-600 bg-red-700/10 rounded-lg hover:bg-red-700/20 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{ticket.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatStatus(ticket.status)} •{" "}
                      <span className="font-semibold text-red-600">
                        {ticket.priority.toUpperCase()} PRIORITY
                      </span>
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No high priority tickets.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Stale Tickets */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Stale Tickets</h2>
            <p className="text-sm text-gray-500 mb-4">No updates in 3+ days</p>
            {escalationsLoading && staleTickets.length === 0 ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : staleTickets.length > 0 ? (
              <div className="space-y-3">
                {staleTickets.map((ticket: ReportTicket) => (
                  <Link
                    key={ticket.id}
                    href={`/ticket/${ticket.id}`}
                    className="block p-3 border border-yellow-600 bg-yellow-700/10 rounded-lg hover:bg-yellow-700/20 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{ticket.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Updated {new Date(ticket.updatedAt).toLocaleDateString()} • Assigned to{" "}
                      {ticket.assignee?.name ?? "unassigned"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No stale tickets detected.</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            {activityLoading && recentActivity.length === 0 ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((entry: TicketActivityEntry) => (
                  <div key={entry.id} className="flex justify-between items-start border-b border-gray-200 pb-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{entry.actor.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {describeTicketActivity(entry)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 ml-4">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}