"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { API } from "@/utils/const"
import { BarChart3 } from "lucide-react"

interface DashboardStats {
  from: string;
  to: string;
  stats: Record<string, {
    total: number;
    completed: number;
    busy: number;
    failed: number;
    no_answer: number;
    in_progress: number;
    totalDuration: number;
  }>;
}

export default function DashboardView() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    setLoading(true)
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd")
    const res = await fetch(`${API.DASHBOARD_STATS}?fromDate=${fromDate}&toDate=${toDate}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
    })
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line
  }, [dateRange])

  // Calculate summary stats
  const summary = stats ? Object.values(stats.stats).reduce((acc, s) => {
    acc.total += s.total;
    acc.completed += s.completed;
    acc.busy += s.busy;
    acc.failed += s.failed;
    acc.no_answer += s.no_answer;
    acc.in_progress += s.in_progress;
    acc.totalDuration += s.totalDuration;
    return acc;
  }, { total: 0, completed: 0, busy: 0, failed: 0, no_answer: 0, in_progress: 0, totalDuration: 0 }) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                className="rounded border shadow"
              />
            </div>
            <div className="flex-1">
              <Button onClick={fetchStats} disabled={loading} className="mb-2">Refresh</Button>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                  <div className="bg-gray-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{summary.total}</div>
                    <div className="text-xs text-muted-foreground">Total Calls</div>
                  </div>
                  <div className="bg-green-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-300">{summary.completed}</div>
                    <div className="text-xs text-green-300">Completed</div>
                  </div>
                  <div className="bg-yellow-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">{summary.busy}</div>
                    <div className="text-xs text-yellow-300">Busy</div>
                  </div>
                  <div className="bg-red-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-300">{summary.failed}</div>
                    <div className="text-xs text-red-300">Failed</div>
                  </div>
                  <div className="bg-orange-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-300">{summary.no_answer}</div>
                    <div className="text-xs text-orange-300">No Answer</div>
                  </div>
                  <div className="bg-blue-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-300">{(summary.totalDuration/60).toFixed(1)} min</div>
                    <div className="text-xs text-blue-300">Total Talk Time</div>
                  </div>
                </div>
              )}
              {stats && Object.keys(stats.stats).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="p-2 border">Number</th>
                        <th className="p-2 border">Total</th>
                        <th className="p-2 border">Completed</th>
                        <th className="p-2 border">Busy</th>
                        <th className="p-2 border">Failed</th>
                        <th className="p-2 border">No Answer</th>
                        <th className="p-2 border">In Progress</th>
                        <th className="p-2 border">Total Talk Time (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.stats).map(([num, s]) => (
                        <tr key={num}>
                          <td className="p-2 border font-mono">{num}</td>
                          <td className="p-2 border">{s.total}</td>
                          <td className="p-2 border text-green-600">{s.completed}</td>
                          <td className="p-2 border text-yellow-600">{s.busy}</td>
                          <td className="p-2 border text-red-600">{s.failed}</td>
                          <td className="p-2 border text-orange-600">{s.no_answer}</td>
                          <td className="p-2 border text-blue-600">{s.in_progress}</td>
                          <td className="p-2 border">{(s.totalDuration/60).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !loading && (
                <div className="text-center text-muted-foreground py-8">No call data for this date range.</div>
              )}
              {loading && <div className="text-center py-4">Loading...</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
