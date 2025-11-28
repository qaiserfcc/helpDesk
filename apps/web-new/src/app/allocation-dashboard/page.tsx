"use client";

import { useMemo, useReducer } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchAdminOverviewReport,
  fetchAdminProductivityReport,
  fetchAdminEscalationReport,
  fetchAgentWorkloadReport,
  fetchUserTicketReport,
  type ReportTicket,
  type StatusCounts,
} from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import {
  buildStatusBuckets,
  deriveTrendSummary,
  deriveWorkloadStats,
  insightViewReducer,
  INSIGHT_TABS,
  DEFAULT_STATUS_COUNTS,
} from "./helpers";

const formatStatus = formatTicketStatus;

export default function AllocationDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const [insightView, dispatchInsightView] = useReducer(
    insightViewReducer,
    "agents",
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching: overviewRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["reports", "allocation", "overview"],
    queryFn: fetchAdminOverviewReport,
    enabled: user?.role === "admin",
  });

  const { data: agentOverview } = useQuery({
    queryKey: ["reports", "allocation", "agent"],
    queryFn: fetchAgentWorkloadReport,
    enabled: user?.role === "agent",
  });

  const { data: userOverview } = useQuery({
    queryKey: ["reports", "allocation", "user"],
    queryFn: fetchUserTicketReport,
    enabled: user?.role === "user",
  });

  const {
    data: productivity,
    isLoading: productivityLoading,
    isRefetching: productivityRefetching,
    refetch: refetchProductivity,
  } = useQuery({
    queryKey: ["reports", "allocation", "productivity"],
    queryFn: () => fetchAdminProductivityReport(14),
    enabled: user?.role === "admin",
  });

  const {
    data: escalations,
    isLoading: escalationsLoading,
    isRefetching: escalationsRefetching,
    refetch: refetchEscalations,
  } = useQuery({
    queryKey: ["reports", "allocation", "escalations"],
    queryFn: fetchAdminEscalationReport,
    enabled: user?.role === "admin",
  });

  const refreshing =
    overviewRefetching || productivityRefetching || escalationsRefetching;

  const statusCounts: StatusCounts =
    overview?.statusCounts ?? DEFAULT_STATUS_COUNTS;
  const assignments = useMemo(
    () => overview?.assignmentLoad ?? [],
    [overview?.assignmentLoad],
  );
  const oldestOpen = overview?.oldestOpen ?? [];
  const resolutionTrend = useMemo(
    () => productivity?.resolutionTrend ?? [],
    [productivity?.resolutionTrend],
  );
  const highPriority = escalations?.highPriority ?? [];
  const staleTickets = escalations?.staleTickets ?? [];

  const statusBuckets = buildStatusBuckets(statusCounts);

  const totalTickets = statusBuckets.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );

  const workloadStats = useMemo(
    () => deriveWorkloadStats(assignments),
    [assignments],
  );

  const trendSummary = useMemo(
    () => deriveTrendSummary(resolutionTrend),
    [resolutionTrend],
  );

  const onRefresh = () => {
    refetchOverview();
    refetchProductivity();
    refetchEscalations();
  };

  // Allow all role access; adapt content below based on role.

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
              <h1 className="text-3xl font-bold text-white">{user?.role === 'admin' ? 'Allocation Dashboard' : user?.role === 'agent' ? 'My Allocation' : 'Allocation Overview'}</h1>
                <p className="text-white/90 mt-2">Live workload + reporting</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Status Highlights */}
        {user?.role === "admin" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statusBuckets.map((bucket) => (
            <div key={bucket.status} className="card rounded-lg shadow p-6">
              <p className="text-sm text-white/80 uppercase">
                {formatStatus(bucket.status)}
              </p>
              <p className="text-3xl font-bold text-white mt-2">{bucket.count}</p>
              <p className="text-sm text-white/80 mt-1">
                {totalTickets
                  ? `${Math.round((bucket.count / totalTickets) * 100)}%`
                  : "0%"}{" "}
                of tracked
              </p>
            </div>
          ))}
          </div>
        ) : user?.role === 'agent' && agentOverview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {buildStatusBuckets(agentOverview?.statusCounts).map((bucket) => (
              <div key={bucket.status} className="card rounded-lg shadow p-6">
                <p className="text-sm text-white/80 uppercase">{formatStatus(bucket.status)}</p>
                <p className="text-3xl font-bold text-white mt-2">{bucket.count}</p>
              </div>
            ))}
          </div>
        ) : user?.role === 'user' && userOverview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {buildStatusBuckets(userOverview?.statusCounts).map((bucket) => (
              <div key={bucket.status} className="card rounded-lg shadow p-6">
                <p className="text-sm text-white/80 uppercase">{formatStatus(bucket.status)}</p>
                <p className="text-3xl font-bold text-white mt-2">{bucket.count}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Allocation Snapshot */}
        {user?.role === 'admin' ? (
          <div className="card rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Allocation Snapshot</h2>
          <p className="text-white/90 mb-6">
            {workloadStats.totalAgents} active agent{workloadStats.totalAgents === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/80">Avg load</p>
              <p className="text-2xl font-bold text-white mt-1">
                {workloadStats.averageLoad}
              </p>
              <p className="text-sm text-white/80 mt-1">tickets / agent</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/80">Total assigned</p>
              <p className="text-2xl font-bold text-white mt-1">
                {workloadStats.totalAssignments}
              </p>
              <p className="text-sm text-white/80 mt-1">tickets</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/80">Busiest agent</p>
              <p className="text-2xl font-bold text-white mt-1 truncate">
                {workloadStats.busiestAgent?.agent?.name ?? "—"}
              </p>
              <p className="text-sm text-white/80 mt-1">
                {workloadStats.busiestAgent
                  ? `${workloadStats.busiestAgent.count} tickets`
                  : "No load"}
              </p>
            </div>
          </div>
          </div>
        ) : user?.role === 'agent' && agentOverview ? (
          <div className="card rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">My Snapshot</h2>
            <p className="text-white/90 mb-6">Assignment summary for you</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-4">
                <p className="text-sm text-white/80">Assigned</p>
                <p className="text-2xl font-bold text-white mt-1">{agentOverview?.assigned?.length ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-white/80">Open</p>
                <p className="text-2xl font-bold text-white mt-1">{agentOverview?.statusCounts?.open ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-white/80">In progress</p>
                <p className="text-2xl font-bold text-white mt-1">{agentOverview?.statusCounts?.in_progress ?? 0}</p>
              </div>
            </div>
          </div>
        ) : user?.role === 'user' && userOverview ? (
          <div className="card rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">My Tickets Snapshot</h2>
            <p className="text-white/90 mb-6">Summary of your tickets</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-4">
                <p className="text-sm text-white/80">My tickets</p>
                <p className="text-2xl font-bold text-white mt-1">{Object.values(userOverview?.statusCounts ?? {}).reduce((s, n) => s + n, 0)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-white/80">Open</p>
                <p className="text-2xl font-bold text-white mt-1">{userOverview?.statusCounts?.open ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-white/80">In progress</p>
                <p className="text-2xl font-bold text-white mt-1">{userOverview?.statusCounts?.in_progress ?? 0}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Live Backlog */}
        <div className="card rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Live Backlog</h2>
              <p className="text-white/90 mt-1">
                {insightView === "agents"
                  ? "Assignments per agent"
                  : "Oldest unresolved tickets"}
              </p>
            </div>
            <div className="flex space-x-2">
              {INSIGHT_TABS.map((tab) => {
                const active = insightView === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() =>
                      dispatchInsightView({ type: "select", view: tab.value })
                    }
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {insightView === "agents" ? (
            overviewLoading && assignments.length === 0 ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((assignment) => (
                    <div key={assignment.agentId} className="flex justify-between items-center py-3 border-b border-white/6">
                      <div>
                        <p className="font-medium text-white">
                          {assignment.agent?.name ?? "Unknown agent"}
                        </p>
                        <p className="text-sm text-white/80">
                          {assignment.agent?.email ?? "N/A"}
                        </p>
                      </div>
                      <div className="bg-white/5 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {assignment.count} Tickets
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/80">No agent workload data yet.</p>
            )
          ) : overviewLoading && oldestOpen.length === 0 ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : oldestOpen.length > 0 ? (
            <div className="space-y-4">
              {oldestOpen.map((ticket: ReportTicket) => (
                  <div key={ticket.id} className="flex justify-between items-center py-3 border-b border-white/6">
                  <div className="flex-1">
                    <p className="font-medium text-white">{ticket.description}</p>
                    <p className="text-sm text-white/80 mt-1">
                      Opened {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.creator.name}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-white/80">
                    {formatStatus(ticket.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/80">No aging backlog entries.</p>
          )}
        </div>

        {/* Resolution Trend */}
        <div className="card rounded-lg shadow p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Resolution Trend</h2>
            <p className="text-white/80 mt-1">
              Last {trendSummary.window} days • {trendSummary.total} tickets
            </p>
          </div>

          {productivityLoading && resolutionTrend.length === 0 ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : resolutionTrend.length > 0 ? (
            <div className="space-y-4">
              {resolutionTrend.map((entry) => (
                <div key={entry.date} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            {(() => {
                              const pct = Math.min(entry.count * 8, 100);
                              const idx = Math.min(12, Math.max(1, Math.ceil((pct / 100) * 12)));
                              const widthClass = `w-${idx}/12`;
                              return (
                                <div className={`${widthClass} bg-blue-600 h-2 rounded-full transition-all duration-300`} />
                              );
                            })()}
                          </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600 ml-4">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/80">No resolution data captured yet.</p>
          )}
        </div>

        {/* Escalation Alerts */}
        <div className="card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Escalation Alerts</h2>
          <p className="text-white/80 mb-6">High priority + stale</p>

          {escalationsLoading &&
          highPriority.length === 0 &&
          staleTickets.length === 0 ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : highPriority.length === 0 && staleTickets.length === 0 ? (
            <p className="text-white/80">No escalations detected.</p>
          ) : (
            <div className="space-y-4">
              {highPriority.slice(0, 3).map((ticket) => (
                  <Link
                    key={`high-${ticket.id}`}
                    href={`/ticket/${ticket.id}`}
                    className="flex justify-between items-center p-4 border border-red-600 bg-red-700/10 rounded-lg hover:bg-red-700/20 transition-colors"
                  >
                  <div className="flex-1">
                    <p className="font-medium text-white">{ticket.description}</p>
                    <p className="text-sm text-white/80 mt-1">
                      {formatStatus(ticket.status)} • HIGH PRIORITY
                    </p>
                  </div>
                  <span className="text-red-600 text-xl">🔥</span>
                </Link>
              ))}
              {staleTickets.slice(0, 3).map((ticket) => (
                  <Link
                    key={`stale-${ticket.id}`}
                    href={`/ticket/${ticket.id}`}
                    className="flex justify-between items-center p-4 border border-yellow-600 bg-yellow-700/10 rounded-lg hover:bg-yellow-700/20 transition-colors"
                  >
                  <div className="flex-1">
                    <p className="font-medium text-white">{ticket.description}</p>
                    <p className="text-sm text-white/80 mt-1">
                      Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-yellow-600 text-xl">⏳</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}