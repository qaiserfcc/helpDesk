"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { assignTicket, requestAssignment } from "@/services/tickets";

export function TableRowMenu({ ticketId, canEdit, canAssign, canRequestAssignment }: { ticketId: string; canEdit: boolean; canAssign: boolean; canRequestAssignment: boolean; }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);

  const handleRequestAssignment = async () => {
    setLoading(true);
    try {
      await requestAssignment(ticketId);
    } catch (error) {
      // swallow errors, the UI will show toasts; remainative.
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative table-row-menu inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        className="px-2 py-1 rounded hover:bg-white/8"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 card border border-white/10 rounded shadow-lg p-2 table-row-menu">
          <Link href={`/ticket/${ticketId}`} className="block px-3 py-2 text-white rounded hover:bg-white/6">View</Link>
          {canEdit && <Link href={`/ticket/${ticketId}/edit`} className="block px-3 py-2 rounded hover:bg-white/6">Edit</Link>}
          {canRequestAssignment && (
            <button onClick={handleRequestAssignment} disabled={loading} className="block w-full text-left px-3 py-2 text-white rounded hover:bg-white/6">
              {loading ? 'Requesting…' : 'Request Assignment'}
            </button>
          )}
          {canAssign && <button className="block px-3 py-2 text-white rounded hover:bg-white/6">Assign</button>}
        </div>
      )}
    </div>
  );
}
