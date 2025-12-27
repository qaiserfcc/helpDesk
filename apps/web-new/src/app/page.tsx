"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleRestrictedView } from "@/components/RoleRestrictedView";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/services/users";
import {
  fetchUserTicketReport,
  fetchAgentWorkloadReport,
  fetchAdminOverviewReport,
  fetchRecentTicketActivity,
  fetchTicketStatusSummary,
  fetchAdminProductivityReport,
  fetchTickets,
} from "@/services/tickets";
import { fetchTicketsBreachingSLA } from "@/services/slas";
import { WorkflowOverviewCard } from "@/components/WorkflowOverviewCard";
import { AgentPerformanceCard } from "@/components/AgentPerformanceCard";
import HeroHeader from "@/components/HeroHeader";
import StatusSnapshot from "@/components/StatusSnapshot";
import { AnalyticsCard, MiniChartCard } from "@/components/AnalyticsCard";

export default function Dashboard() {
  const { session } = useAuthStore();

  const { data: userReport } = useQuery({
    queryKey: ["user-ticket-report"],
    queryFn: () => fetchUserTicketReport(),
    enabled: !!session && session.user.role === "user",
  });

  const { data: agentReport } = useQuery({
    queryKey: ["agent-workload-report"],
    queryFn: () => fetchAgentWorkloadReport(),
    enabled: !!session && session.user.role === "agent",
  });

  const { data: adminReport } = useQuery({
    queryKey: ["admin-overview-report"],
    queryFn: () => fetchAdminOverviewReport(),
    enabled: !!session && session.user.role === "admin",
  });
  const { data: usersList } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetchUsers({}),
    enabled: !!session && session.user.role === "admin",
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-ticket-activity"],
    queryFn: () => fetchRecentTicketActivity(6),
    enabled: !!session,
  });

  const { data: statusSummary } = useQuery({
    queryKey: ["ticket-status-summary"],
    queryFn: () => fetchTicketStatusSummary(),
    enabled: !!session,
  });

  const { data: allTickets } = useQuery({
    queryKey: ["tickets-list-all"],
    queryFn: () => fetchTickets({ limit: 1000 }),
    enabled: !!session && session.user.role !== "user",
  });

  const { data: productivityReport } = useQuery({
    queryKey: ["admin-productivity"],
    queryFn: () => fetchAdminProductivityReport(14),
    enabled: !!session && session.user.role === "admin",
  });

  const { data: slaBreaches } = useQuery({
    queryKey: ["sla-breaches"],
    queryFn: () => fetchTicketsBreachingSLA(),
    enabled: !!session && (session.user.role === "admin" || session.user.role === "agent"),
    refetchInterval: 60000, // Refresh every minute
  });

  if (!session) {
    return null;
  }

  const canCreate = session.user.role === "user" || session.user.role === "admin";

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <HeroHeader stats={{
            total: (userReport?.statusCounts ? Object.values(userReport.statusCounts).reduce((s: number, n: number) => s + n, 0) : 0),
            open: userReport?.statusCounts?.open ?? 0,
            in_progress: userReport?.statusCounts?.in_progress ?? 0,
            resolved: userReport?.statusCounts?.resolved ?? 0,
          }} />
          <StatusSnapshot counts={{
            total: (userReport?.statusCounts ? Object.values(userReport.statusCounts).reduce((s: number, n: number) => s + n, 0) : 0),
            open: userReport?.statusCounts?.open ?? 0,
            in_progress: userReport?.statusCounts?.in_progress ?? 0,
            resolved: userReport?.statusCounts?.resolved ?? 0,
          }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* User Dashboard - Enhanced Analytics Cards */}
            <AnalyticsCard
              title="My Tickets"
              value={Object.values(userReport?.statusCounts ?? {}).reduce((s, n) => s + n, 0)}
              subtitle={`Open: ${userReport?.statusCounts?.open ?? 0} • In Progress: ${userReport?.statusCounts?.in_progress ?? 0} • Resolved: ${userReport?.statusCounts?.resolved ?? 0}`}
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              link={{ href: "/tickets", label: "View all tickets" }}
              gradientFrom="from-blue-600"
              gradientTo="to-purple-600"
            />

            <RoleRestrictedView permission="tickets:assign">
              <AnalyticsCard
                title="Assigned to Me"
                value={Object.values(agentReport?.statusCounts ?? {}).reduce((s, n) => s + n, 0)}
                subtitle={`Pending requests: ${agentReport?.pendingRequests?.length ?? 0}`}
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                link={{ href: "/tickets", label: "Manage tickets" }}
                gradientFrom="from-green-600"
                gradientTo="to-teal-600"
              />
            </RoleRestrictedView>

            {/* Priority Breakdown */}
            <AnalyticsCard
              title="By Priority"
              value={allTickets ? allTickets.length : (userReport ? Object.values(userReport.statusCounts).reduce((s, n) => s + n, 0) : 0)}
              subtitle={`Low: ${(allTickets ?? []).filter(t => t.priority === 'low').length} • Medium: ${(allTickets ?? []).filter(t => t.priority === 'medium').length} • High: ${(allTickets ?? []).filter(t => t.priority === 'high').length}`}
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              gradientFrom="from-orange-600"
              gradientTo="to-red-600"
            />

            {/* Issue Type Breakdown */}
            <AnalyticsCard
              title="By Issue Type"
              value={allTickets ? allTickets.length : (userReport ? Object.values(userReport.statusCounts).reduce((s, n) => s + n, 0) : 0)}
              subtitle={['hardware','software','network'].map((it) => `${it[0].toUpperCase()+it.slice(1)}: ${(allTickets ?? []).filter(t => t.issueType === it).length}`).join(' • ')}
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              gradientFrom="from-indigo-600"
              gradientTo="to-purple-600"
            />

            {/* Admin Dashboard - Enhanced */}
            <RoleRestrictedView permission="admin:manage_users">
              <AnalyticsCard
                title="Total Users"
                value={usersList ? usersList.length : 0}
                subtitle={`Agents: ${adminReport?.assignmentLoad?.length ?? 0}`}
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                link={{ href: "/user-management", label: "Manage users" }}
                gradientFrom="from-purple-600"
                gradientTo="to-pink-600"
              />
            </RoleRestrictedView>

            <RoleRestrictedView permission="reports:view">
              <AnalyticsCard
                title="Allocation Dashboard"
                value="Live"
                subtitle="Real-time workload monitoring"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                link={{ href: "/allocation-dashboard", label: "View workload" }}
                gradientFrom="from-cyan-600"
                gradientTo="to-blue-600"
              />
            </RoleRestrictedView>

            {/* SLA Breaches Card - Enhanced */}
            <RoleRestrictedView permission="tickets:assign">
              <AnalyticsCard
                title="SLA Breaches"
                value={slaBreaches?.length ?? 0}
                subtitle={`Response: ${slaBreaches?.filter(t => t.slaResponseBreached).length ?? 0} • Resolution: ${slaBreaches?.filter(t => t.slaResolutionBreached).length ?? 0}`}
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
                link={{ href: "/tickets?filter=sla-breach", label: "View breached tickets" }}
                gradientFrom="from-red-600"
                gradientTo="to-orange-600"
                trend={slaBreaches && slaBreaches.length > 0 ? { value: 15, direction: "down", label: "vs last week" } : undefined}
              />
            </RoleRestrictedView>

            {/* Workflow Overview Card */}
            <RoleRestrictedView permission="tickets:assign">
              <WorkflowOverviewCard />
            </RoleRestrictedView>

            {/* Agent Performance Card */}
            <RoleRestrictedView permission="admin:manage_users">
              <AgentPerformanceCard />
            </RoleRestrictedView>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {canCreate && (
                <Link href="/ticket/new" className="primary-btn px-4 py-2 rounded-md text-sm font-medium text-center">
                  Create Ticket
                </Link>
              )}
              <RoleRestrictedView permission="reports:view">
                <Link href="/status-summary" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium text-center">
                  View Reports
                </Link>
                <Link href="/reports" className="ml-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium text-center">
                  View Reports (Table)
                </Link>
              </RoleRestrictedView>
              <RoleRestrictedView permission="admin:manage_users">
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Settings
                </button>
              </RoleRestrictedView>
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium">
                Help
              </button>
            </div>
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

          {/* Charts area (admin/agent) - Enhanced with Mini Charts */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">Analytics & Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {session.user.role === 'admin' && productivityReport && (
                <MiniChartCard
                  title="Resolution Trend (14 days)"
                  data={(productivityReport?.resolutionTrend ?? []).map((row) => ({
                    label: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: row.count,
                    color: "bg-gradient-to-r from-blue-500 to-cyan-500"
                  }))}
                  type="bar"
                />
              )}

              {/* Agent workload by priority chart */}
              {session.user.role !== 'user' && agentReport && (
                <MiniChartCard
                  title="My Tickets by Priority"
                  data={['low','medium','high'].map((p) => ({
                    label: p,
                    value: (agentReport?.assigned ?? []).filter(t => t.priority === p).length,
                    color: p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }))}
                  type="bar"
                />
              )}

              {/* Ticket status distribution */}
              {statusSummary && statusSummary.statuses && (
                <MiniChartCard
                  title="Tickets by Status"
                  data={statusSummary.statuses.map(s => ({
                    label: s.status.replace('_', ' '),
                    value: s.count,
                    color: s.status === 'open' ? 'bg-blue-500' : s.status === 'in_progress' ? 'bg-yellow-500' : 'bg-green-500'
                  }))}
                  type="bar"
                />
              )}

              {/* Issue type distribution */}
              {allTickets && allTickets.length > 0 && (
                <MiniChartCard
                  title="Tickets by Issue Type"
                  data={['hardware','software','network','access','other'].map((it) => ({
                    label: it,
                    value: allTickets.filter(t => t.issueType === it).length,
                  }))}
                  type="bar"
                />
              )}
            </div>
          </div>
      </main>
    </div>
  );
}