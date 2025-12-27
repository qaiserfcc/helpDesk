"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchTickets } from "@/services/tickets";

export function WorkflowOverviewCard() {
  const { data: allTickets = [] } = useQuery({
    queryKey: ["tickets-workflow-overview"],
    queryFn: () => fetchTickets({ limit: 1000 }),
  });

  // Calculate workflow statistics
  const ticketsWithWorkflow = allTickets.filter((t: any) => t.workflowId);
  const totalWithWorkflow = ticketsWithWorkflow.length;
  
  // Count tickets by workflow status
  const inProgress = ticketsWithWorkflow.filter((t: any) => 
    t.currentStep && t.status !== "resolved"
  ).length;
  
  const completed = ticketsWithWorkflow.filter((t: any) => 
    t.status === "resolved"
  ).length;
  
  const pending = totalWithWorkflow - inProgress - completed;

  return (
    <div className="card overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-medium">🔄</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-white/80 truncate">
                Workflow Status
              </dt>
              <dd className="text-lg font-medium text-white">{totalWithWorkflow}</dd>
              <dd className="text-sm mt-1 text-white/70">
                In Progress: {inProgress} • Completed: {completed} • Pending: {pending}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="card-footer px-5 py-3">
        <div className="text-sm">
          <Link href="/workflow-management" className="font-medium accent-link hover:text-white">
            Manage workflows
          </Link>
        </div>
      </div>
    </div>
  );
}
