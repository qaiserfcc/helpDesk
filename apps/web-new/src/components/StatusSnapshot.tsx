"use client";

import Link from "next/link";

export default function StatusSnapshot({ counts }: { counts?: any }) {
  const data = {
    total: counts?.total ?? 0,
    open: counts?.open ?? 0,
    inProgress: counts?.in_progress ?? 0,
    resolved: counts?.resolved ?? 0,
  };
  return (
    <div className="card p-4 mb-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">Status snapshot</h3>
          <div className="text-sm text-white/70">Personal view</div>
        </div>
        <Link href="/reports" className="text-sm accent-link hover:text-white">Open reports</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="metric p-3 rounded-lg bg-white/3 border border-white/10 text-center">
          <div className="text-sm text-white/70">Total</div>
          <div className="text-xl font-bold text-white mt-2">{data.total}</div>
        </div>
        <div className="metric p-3 rounded-lg bg-white/3 border border-white/10 text-center">
          <div className="text-sm text-white/70">Open</div>
          <div className="text-xl font-bold text-white mt-2">{data.open}</div>
        </div>
        <div className="metric p-3 rounded-lg bg-white/3 border border-white/10 text-center">
          <div className="text-sm text-white/70">In progress</div>
          <div className="text-xl font-bold text-white mt-2">{data.inProgress}</div>
        </div>
        <div className="metric p-3 rounded-lg bg-white/3 border border-white/10 text-center">
          <div className="text-sm text-white/70">Resolved</div>
          <div className="text-xl font-bold text-white mt-2">{data.resolved}</div>
        </div>
      </div>
    </div>
  );
}
