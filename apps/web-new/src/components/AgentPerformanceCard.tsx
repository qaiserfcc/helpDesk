"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTickets } from "@/services/tickets";
import { fetchUsers } from "@/services/users";

export function AgentPerformanceCard() {
  const { data: allTickets = [] } = useQuery({
    queryKey: ["tickets-all"],
    queryFn: () => fetchTickets({ limit: 1000 }),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => fetchUsers({ role: "agent" }),
  });

  // Calculate agent performance metrics
  const agentStats = agents.map((agent: any) => {
    const assignedTickets = allTickets.filter((t: any) => t.assignee?.id === agent.id);
    const resolvedTickets = assignedTickets.filter((t: any) => t.status === "resolved");
    const inProgressTickets = assignedTickets.filter((t: any) => t.status === "in_progress");
    
    return {
      agent,
      total: assignedTickets.length,
      resolved: resolvedTickets.length,
      inProgress: inProgressTickets.length,
      resolutionRate: assignedTickets.length > 0 
        ? Math.round((resolvedTickets.length / assignedTickets.length) * 100)
        : 0,
    };
  });

  // Sort by resolution rate
  const topAgents = agentStats
    .sort((a, b) => b.resolutionRate - a.resolutionRate)
    .slice(0, 3);

  const avgResolutionRate = agentStats.length > 0
    ? Math.round(
        agentStats.reduce((sum, a) => sum + a.resolutionRate, 0) / agentStats.length
      )
    : 0;

  return (
    <div className="card overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-medium">⭐</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-white/80 truncate">
                Agent Performance
              </dt>
              <dd className="text-lg font-medium text-white">{avgResolutionRate}%</dd>
              <dd className="text-sm mt-1 text-white/70">
                Avg. Resolution Rate
              </dd>
            </dl>
          </div>
        </div>

        {/* Top Performers */}
        {topAgents.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-white/60 uppercase">Top Performers</p>
            {topAgents.map((stat, index) => (
              <div key={stat.agent.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">{index + 1}.</span>
                  <span className="text-white/80">{stat.agent.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/60">{stat.resolved}/{stat.total}</span>
                  <span className={`font-semibold ${
                    stat.resolutionRate >= 80 ? "text-green-400" :
                    stat.resolutionRate >= 60 ? "text-yellow-400" :
                    "text-orange-400"
                  }`}>
                    {stat.resolutionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card-footer px-5 py-3">
        <div className="text-sm text-white/70">
          Active Agents: {agents.length}
        </div>
      </div>
    </div>
  );
}
