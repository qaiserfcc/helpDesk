"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleRestrictedView } from "@/components/RoleRestrictedView";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardMetrics,
  fetchRecentTicketActivity,
} from "@/services/tickets";

export default function Dashboard() {
  const { session } = useAuthStore();

  const { data: dashboardMetrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchDashboardMetrics(),
    enabled: !!session,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-ticket-activity"],
    queryFn: () => fetchRecentTicketActivity(6),
    enabled: !!session,
  });

  if (!session) {
    return null;
  }

  const metrics = dashboardMetrics;

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/70 mt-2">
              Welcome back, {session.user.name}
            </p>
          </div>

          {/* Critical Alerts Section */}
          {metrics && metrics.criticalAlerts.count > 0 && (
            <div className="mb-6 card shadow rounded-lg p-6 border-2 border-red-500/50 bg-red-500/10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xl font-bold">!</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-red-400">Critical Alerts</h2>
                  <p className="text-white/80">
                    {metrics.criticalAlerts.count} high priority {metrics.criticalAlerts.count === 1 ? 'ticket has' : 'tickets have'} breached SLA
                  </p>
                </div>
                <Link
                  href="/tickets"
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  View Critical
                </Link>
              </div>
              {metrics.criticalAlerts.tickets.length > 0 && (
                <div className="mt-4 space-y-2">
                  {metrics.criticalAlerts.tickets.slice(0, 3).map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/ticket/${ticket.id}`}
                      className="block p-3 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    >
                      <p className="text-white font-medium truncate">{ticket.description}</p>
                      <p className="text-sm text-white/60">
                        {ticket.slaName} • {ticket.status}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Breached SLA Card */}
            <div className="card overflow-hidden shadow rounded-lg border border-orange-500/30">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg font-bold">⚠</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">
                        Breached SLA
                      </dt>
                      <dd className="text-2xl font-bold text-orange-400">
                        {metrics?.breachedSLA.count ?? 0}
                      </dd>
                      <dd className="text-xs text-white/60 mt-1">
                        Tickets past deadline
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="card-footer px-5 py-3">
                <Link
                  href="/tickets"
                  className="text-sm font-medium text-orange-400 hover:text-orange-300"
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* High Priority Card */}
            <div className="card overflow-hidden shadow rounded-lg border border-red-500/30">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg font-bold">↑</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">
                        High Priority
                      </dt>
                      <dd className="text-2xl font-bold text-red-400">
                        {metrics?.highPriority.count ?? 0}
                      </dd>
                      <dd className="text-xs text-white/60 mt-1">
                        Urgent tickets open
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="card-footer px-5 py-3">
                <Link
                  href="/tickets"
                  className="text-sm font-medium text-red-400 hover:text-red-300"
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* Total Tickets Card */}
            <div className="card overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg font-bold">#</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">
                        Total Tickets
                      </dt>
                      <dd className="text-2xl font-bold text-white">
                        {metrics?.totalTickets ?? 0}
                      </dd>
                      <dd className="text-xs text-white/60 mt-1">
                        All time
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="card-footer px-5 py-3">
                <Link
                  href="/tickets"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="card overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg font-bold">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">
                        Last 7 Days
                      </dt>
                      <dd className="text-2xl font-bold text-white">
                        {metrics?.recentActivity.last7Days ?? 0}
                      </dd>
                      <dd className="text-xs text-white/60 mt-1">
                        New tickets
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Priority Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Status Breakdown */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Status Breakdown</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Open</span>
                    <span className="font-medium">{metrics?.statusCounts.open ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.statusCounts.open / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>In Progress</span>
                    <span className="font-medium">{metrics?.statusCounts.in_progress ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.statusCounts.in_progress / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Resolved</span>
                    <span className="font-medium">{metrics?.statusCounts.resolved ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.statusCounts.resolved / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Priority Breakdown</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Low</span>
                    <span className="font-medium">{metrics?.priorityCounts.low ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.priorityCounts.low / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Medium</span>
                    <span className="font-medium">{metrics?.priorityCounts.medium ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.priorityCounts.medium / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>High</span>
                    <span className="font-medium">{metrics?.priorityCounts.high ?? 0}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: metrics
                          ? `${(metrics.priorityCounts.high / Math.max(metrics.totalTickets, 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breached SLA Tickets List */}
          {metrics && metrics.breachedSLA.count > 0 && (
            <div className="mb-8 card shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">
                SLA Breached Tickets ({metrics.breachedSLA.count})
              </h2>
              <div className="space-y-3">
                {metrics.breachedSLA.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/ticket/${ticket.id}`}
                    className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-orange-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{ticket.description}</p>
                        <p className="text-sm text-white/60 mt-1">
                          {ticket.slaName} • {ticket.status} •{' '}
                          <span className="text-orange-400 font-medium">
                            {ticket.hoursElapsed}h elapsed
                          </span>
                        </p>
                      </div>
                      <span className={`
                        px-2 py-1 text-xs rounded-full font-medium
                        ${ticket.priority === 'high' ? 'bg-red-500/20 text-red-400' : ''}
                        ${ticket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                        ${ticket.priority === 'low' ? 'bg-gray-500/20 text-gray-400' : ''}
                      `}>
                        {ticket.priority}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {metrics.breachedSLA.count > 10 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/tickets"
                    className="text-sm font-medium text-orange-400 hover:text-orange-300"
                  >
                    View all {metrics.breachedSLA.count} breached tickets →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* High Priority Tickets */}
          {metrics && metrics.highPriority.count > 0 && (
            <div className="mb-8 card shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">
                High Priority Tickets ({metrics.highPriority.count})
              </h2>
              <div className="space-y-3">
                {metrics.highPriority.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/ticket/${ticket.id}`}
                    className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-red-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{ticket.description}</p>
                        <p className="text-sm text-white/60 mt-1">
                          {ticket.status}
                          {ticket.assignee && ` • Assigned to ${ticket.assignee.name}`}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-500/20 text-red-400">
                        HIGH
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {metrics.highPriority.count > 10 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/tickets"
                    className="text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    View all {metrics.highPriority.count} high priority tickets →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="card shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
            {recentActivity?.length ? (
              <ul className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {a.actor?.name?.[0] ?? "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/90">
                        <strong className="font-medium">{a.actor.name}</strong> —{" "}
                        {a.type.replaceAll("_", " ")}
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60">No recent activity</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/ticket/new"
              className="card shadow rounded-lg p-6 hover:bg-white/5 transition-colors text-center"
            >
              <div className="text-4xl mb-2">+</div>
              <p className="text-white font-medium">Create New Ticket</p>
            </Link>
            <Link
              href="/tickets"
              className="card shadow rounded-lg p-6 hover:bg-white/5 transition-colors text-center"
            >
              <div className="text-4xl mb-2">📋</div>
              <p className="text-white font-medium">View All Tickets</p>
            </Link>
            <RoleRestrictedView permission="reports:view">
              <Link
                href="/reports"
                className="card shadow rounded-lg p-6 hover:bg-white/5 transition-colors text-center"
              >
                <div className="text-4xl mb-2">📊</div>
                <p className="text-white font-medium">View Reports</p>
              </Link>
            </RoleRestrictedView>
          </div>
        </div>
      </main>
    </div>
  );
}
