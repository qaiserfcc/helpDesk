"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTicketExportDataset, type ReportTicket, type TicketExportScope } from "@/services/tickets";

const statusFilters: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export default function ReportsPage() {
  const user = useAuthStore((state) => state.session?.user);
  const role = user?.role ?? "user";
  const datasetScope = (role === "admin" ? "admin" : role === "agent" ? "agent" : "user") as TicketExportScope;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminAllView, setAdminAllView] = useState<"user" | "agent">("user");
  type AdminAggregateRow = { id: string; label: string; total: number; open: number; in_progress: number; resolved: number };
  type AdminAggregates = { user: AdminAggregateRow[]; agent: AdminAggregateRow[] };

  const { data: dataset, isLoading, refetch } = useQuery({
    queryKey: ["reports", "table", datasetScope],
    queryFn: () => fetchTicketExportDataset({ scope: datasetScope, format: "json" }),
    enabled: !!user,
  });

  const exportMutation = useMutation({
    mutationFn: () => fetchTicketExportDataset({ scope: datasetScope, format: "json" }),
    onSuccess: (payload) => {
      // For web: create a JSON file and download
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${payload.scope}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const filteredTickets = useMemo(() => {
    const tickets: ReportTicket[] = dataset?.tickets ?? [];
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [dataset, statusFilter]);

  const adminAggregates = useMemo(() => {
    if (role !== "admin") return { user: [], agent: [] } as AdminAggregates;
    const tickets: ReportTicket[] = dataset?.tickets ?? [];
    const build = (keyFn: (t: ReportTicket) => string, labelFn: (t: ReportTicket) => string) => {
      const map = new Map<string, AdminAggregateRow>();
      tickets.forEach((ticket) => {
        const key = keyFn(ticket);
        const label = labelFn(ticket);
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, { id: key, label, total: 0, open: 0, in_progress: 0, resolved: 0 });
        }
        const row = map.get(key)!;
        row[ticket.status] += 1;
        row.total += 1;
      });
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    };
    return {
      user: build((t) => t.creator.id, (t) => t.creator.name ?? t.creator.email ?? t.creator.id),
      agent: build((t) => t.assignee?.id ?? "unassigned", (t) => t.assignee?.name ?? "Unassigned"),
    };
  }, [dataset, role]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Please sign in.</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Reporting</h1>
            <p className="text-white/80">Status snapshots for {role === "admin" ? "the organization" : role === "agent" ? "your queue" : "your tickets"}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => refetch()} className="bg-blue-600 text-white px-3 py-2 rounded-lg">Refresh</button>
            <button onClick={() => exportMutation.mutate()} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg">Export</button>
          </div>
        </div>

        <div className="card p-6 rounded-lg shadow">
          <div className="flex flex-wrap gap-2 mb-6">
            {statusFilters.map((filter) => (
              <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`px-3 py-1 rounded-full text-sm ${statusFilter === filter.value ? 'bg-white/10 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                {filter.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div>Loading…</div>
          ) : role === "admin" && statusFilter === "all" ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-2">
                  {(["user", "agent"] as const).map((key) => {
                    const active = adminAllView === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setAdminAllView(key)}
                        className={`px-3 py-1 rounded-full text-sm ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                      >
                        {key === 'user' ? 'User wise' : 'Agent wise'}
                      </button>
                    );
                  })}
                </div>
                <div className="text-sm text-white/80">
                  {adminAggregates[adminAllView].length} {adminAllView === 'user' ? 'users' : 'agents'} tracked
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/6">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Open</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">In Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/6">
                    {adminAggregates[adminAllView].map((row: AdminAggregateRow) => (
                      <tr key={row.id} className="hover:bg-white/8">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{row.label}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.open}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.in_progress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.resolved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-white/80">No data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/6">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-white/6">
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/8">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">#{t.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-white max-w-xs truncate">{t.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-white/6 text-white/80">{t.status}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white capitalize">{t.priority}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{new Date(t.updatedAt ?? t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
