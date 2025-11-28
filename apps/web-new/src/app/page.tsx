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
import HeroHeader from "@/components/HeroHeader";
import StatusSnapshot from "@/components/StatusSnapshot";

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