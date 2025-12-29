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
            in_progress: userReport?.statusCounts?.in_progress ?? 0,
            resolved: userReport?.statusCounts?.resolved ?? 0,
          }} />
          <StatusSnapshot counts={{
            total: (userReport?.statusCounts ? Object.values(userReport.statusCounts).reduce((s: number, n: number) => s + n, 0) : 0),
            open: userReport?.statusCounts?.open ?? 0,
            in_progress: userReport?.statusCounts?.in_progress ?? 0,
            resolved: userReport?.statusCounts?.resolved ?? 0,
          }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Dashboard */}
            <div className="card overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">T</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">
                        My Tickets
                      </dt>
                      <dd className="text-lg font-medium text-white">{Object.values(userReport?.statusCounts ?? {}).reduce((s, n) => s + n, 0)}</dd>
                      <dd className="text-sm mt-1 text-white/70">Open: {userReport?.statusCounts?.open ?? 0} • In progress: {userReport?.statusCounts?.in_progress ?? 0} • Resolved: {userReport?.statusCounts?.resolved ?? 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="card-footer px-5 py-3">
                <div className="text-sm muted">
                  <Link
                    href="/tickets"
                    className="font-medium accent-link hover:text-white"
                  >
                    View all
                  </Link>
                </div>
              </div>
            </div>

            <RoleRestrictedView permission="tickets:assign">
              <div className="card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/80 truncate">
                          Assigned Tickets
                        </dt>
                        <dd className="text-lg font-medium text-white">{Object.values(agentReport?.statusCounts ?? {}).reduce((s, n) => s + n, 0)}</dd>
                        <dd className="text-sm mt-1 text-white/70">Pending requests: {agentReport?.pendingRequests?.length ?? 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="card-footer px-5 py-3">
                  <div className="text-sm">
                    <Link href="/tickets" className="font-medium text-white hover:text-white">
                      Manage tickets
                    </Link>
                  </div>
                </div>
              </div>
            </RoleRestrictedView>

            {/* Priority breakdown cards */}
            <div className="card overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-sky-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">By Priority</dt>
                      <dd className="text-lg font-medium text-white">{allTickets ? allTickets.length : (userReport ? Object.values(userReport.statusCounts).reduce((s, n) => s + n, 0) : 0)}</dd>
                      <dd className="text-sm mt-1 text-white/70">Low: {(allTickets ?? []).filter(t => t.priority === 'low').length} • Medium: {(allTickets ?? []).filter(t => t.priority === 'medium').length} • High: {(allTickets ?? []).filter(t => t.priority === 'high').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Type breakdown */}
            <div className="card overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">I</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-white/80 truncate">By Issue Type</dt>
                      <dd className="text-lg font-medium text-white">{allTickets ? allTickets.length : (userReport ? Object.values(userReport.statusCounts).reduce((s, n) => s + n, 0) : 0)}</dd>
                      <dd className="text-sm mt-1 text-white/70">{['hardware','software','network','access','other'].map((it) => `${it[0].toUpperCase()+it.slice(1)}: ${(allTickets ?? []).filter(t => t.issueType === it).length}`).join(' • ')}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Dashboard */}
            <RoleRestrictedView permission="admin:manage_users">
              <div className="card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">U</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/80 truncate">
                          Total Users
                        </dt>
                        <dd className="text-lg font-medium text-white">{usersList ? usersList.length : 0}</dd>
                        <dd className="text-sm mt-1 text-white/70">Agents: {adminReport?.assignmentLoad?.length ?? 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="card-footer px-5 py-3">
                  <div className="text-sm">
                    <Link href="/user-management" className="font-medium text-white hover:text-white">
                      Manage users
                    </Link>
                  </div>
                </div>
              </div>
            </RoleRestrictedView>

            <RoleRestrictedView permission="reports:view">
              <div className="card overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/80 truncate">
                          Allocation Dashboard
                        </dt>
                        <dd className="text-lg font-medium text-white">Live Workload</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="card-footer px-5 py-3">
                  <div className="text-sm">
                    <Link href="/allocation-dashboard" className="font-medium text-white hover:text-white">
                      Manage workload
                    </Link>
                  </div>
                </div>
              </div>
            </RoleRestrictedView>
          </div>

          {/* Recent activity */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">Recent activity</h2>
            <div className="card p-4">
              {recentActivity?.length ? (
                <ul className="space-y-2">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-white text-sm">{a.actor?.name?.[0] ?? "U"}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white/90">
                          <strong className="font-medium">{a.actor.name}</strong> — {a.type.replaceAll("_", " ")}
                        </div>
                        <div className="text-sm text-white/70">{new Date(a.createdAt).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/80">No recent activity</p>
              )}
            </div>
          </div>
        </div>

          {/* Charts area (admin/agent) */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">Charts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {session.user.role === 'admin' && (
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-white mb-2">Resolution trend (14 days)</h3>
                  <div className="flex items-end gap-2 h-24">
                    {(productivityReport?.resolutionTrend ?? []).map((row) => {
                      const max = Math.max(...(productivityReport?.resolutionTrend?.map(r => r.count)||[1]));
                      const pct = Math.max(6, Math.round((row.count / (max||1)) * 100));
                      const heightMap = ["h-2","h-3","h-4","h-6","h-8","h-10","h-12"];
                      const idx = Math.min(heightMap.length - 1, Math.max(0, Math.ceil((pct / 100) * (heightMap.length - 1))));
                      const heightClass = heightMap[idx];
                      return (
                        <div key={row.date} className="flex-1 flex items-end">
                          <div className={`${heightClass} w-full bg-blue-500`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Agent workload by priority chart */}
              {session.user.role !== 'user' && (
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-white mb-2">Assigned priorities</h3>
                  <div className="space-y-2">
                    {['low','medium','high'].map((p) => {
                      const count = (agentReport?.assigned ?? []).filter(t => t.priority === p).length;
                      const total = (agentReport?.assigned ?? []).length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={p} className="text-sm">
                          <div className="flex justify-between text-white/80">
                            <span className="capitalize">{p}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                            <div className="w-full bg-white/6 rounded h-2 mt-1">
                              {(() => {
                                const idx = Math.min(12, Math.max(0, Math.ceil((pct / 100) * 12)));
                                const wclass = idx === 12 ? "w-full" : idx === 0 ? "w-0" : `w-${idx}/12`;
                                return <div className={`${wclass} bg-blue-500 h-2 rounded`} />;
                              })()}
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>
    </div>
  );
}