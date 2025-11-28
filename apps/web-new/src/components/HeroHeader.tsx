"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export default function HeroHeader({ stats }: { stats?: any }) {
  const { session } = useAuthStore();
  const name = session?.user?.name ?? "User";
  const counts = {
    total: stats?.total ?? 0,
    open: stats?.open ?? 0,
    inProgress: stats?.in_progress ?? 0,
    resolved: stats?.resolved ?? 0,
  };

  return (
    <div className="card p-6 shadow rounded-lg mb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/70">Command center</div>
          <h1 className="text-3xl font-bold text-white mt-2">Hi, {name}</h1>
          <p className="text-white/70 mt-2">Monitor tickets, workload, and signals in one sleek view.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button aria-label="Notifications" className="p-2 rounded-md hover:bg-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C8.67 6.165 8 7.388 8 8.75v5.407c0 .538-.214 1.053-.595 1.437L6 17h9z" />
            </svg>
          </button>
          <Link href="/login" className="text-white/80 hover:text-white">Sign out</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="metric p-4 rounded-lg border border-white/10 bg-white/3">
          <div className="text-sm text-white/70">Open</div>
          <div className="text-2xl font-bold text-white mt-2">{counts.open}</div>
          <div className="text-xs text-white/70 mt-1">Active queue</div>
        </div>
        <div className="metric p-4 rounded-lg border border-white/10 bg-white/3">
          <div className="text-sm text-white/70">In progress</div>
          <div className="text-2xl font-bold text-white mt-2">{counts.inProgress}</div>
          <div className="text-xs text-white/70 mt-1">Being handled</div>
        </div>
        <div className="metric p-4 rounded-lg border border-white/10 bg-white/3">
          <div className="text-sm text-white/70">Resolved</div>
          <div className="text-2xl font-bold text-white mt-2">{counts.resolved}</div>
          <div className="text-xs text-white/70 mt-1">Closed</div>
        </div>
        <div className="metric p-4 rounded-lg border border-white/10 bg-white/3">
          <div className="text-sm text-white/70">Total</div>
          <div className="text-2xl font-bold text-white mt-2">{counts.total}</div>
          <div className="text-xs text-white/70 mt-1">Tracked</div>
        </div>
      </div>
    </div>
  );
}

