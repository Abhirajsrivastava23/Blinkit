'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, FileText, RefreshCw } from 'lucide-react';

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activity');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 text-xs text-left">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Compliance & Sourcing Activity Logs</h3>
        <p className="text-xs text-zinc-500 font-medium">Verify historical database records of price shifts, stock replenishments and catalog edits.</p>
      </div>

      <div className="bg-white border border-zinc-200/20 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none">
              <th className="p-3.5">Admin Operator</th>
              <th className="p-3.5">Action Type</th>
              <th className="p-3.5">Target Product</th>
              <th className="p-3.5">Activity Parameters / Modifications</th>
              <th className="p-3.5 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y text-zinc-650">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-zinc-400 font-medium">
                  <RefreshCw className="h-4 w-4 animate-spin inline-block mr-1.5" /> Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-zinc-400 font-medium">
                  No activity logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/30 transition-colors">
                  <td className="p-3.5 font-bold text-zinc-800 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-400" /> {log.adminUser}
                  </td>
                  <td className="p-3.5 font-bold uppercase text-[9px] text-zinc-500">
                    {log.action}
                  </td>
                  <td className="p-3.5 text-zinc-700 font-medium">
                    {log.product}
                  </td>
                  <td className="p-3.5 text-zinc-550 leading-relaxed max-w-sm">
                    {log.previousValue !== 'N/A' ? (
                      <span className="font-mono text-[10px] break-words">{log.previousValue}</span>
                    ) : (
                      <span className="text-zinc-400 font-bold italic">{log.newValue}</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-mono text-zinc-450 text-[10px]">
                    {new Date(log.dateTime).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
