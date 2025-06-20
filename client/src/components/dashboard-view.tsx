"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { API } from "@/utils/const"
import { BarChart3 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User2 } from 'lucide-react';

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
    uniqueNumbersCalled: string[];
    callDetails: Array<{
      to: string;
      status: string;
      duration: number;
      startTime: string;
      sid: string;
    }>;
  }>;
  twilioNumbers?: string[];
}

export default function DashboardView() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [twilioNumbers, setTwilioNumbers] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('');

  const fetchTwilioNumbers = async () => {
    try {
      const res = await fetch(API.GET_NUMBERS, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
      });
      const data = await res.json();
      let numbers: string[] = [];
      if (Array.isArray(data)) {
        if (typeof data[0] === 'string') {
          numbers = data;
        } else if (data[0]?.phoneNumber) {
          numbers = data.map((n: any) => n.phoneNumber);
        }
      } else if (data.numbers) {
        if (typeof data.numbers[0] === 'string') {
          numbers = data.numbers;
        } else if (data.numbers[0]?.phoneNumber) {
          numbers = data.numbers.map((n: any) => n.phoneNumber);
        }
      }
      setTwilioNumbers(numbers);
      if (!selectedNumber && numbers.length > 0) {
        setSelectedNumber(numbers[0]);
      }
    } catch (e) {
      setTwilioNumbers([]);
    }
  };

  const fetchStats = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    const fromDate = format(dateRange.from, "yyyy-MM-dd");
    const toDate = format(dateRange.to, "yyyy-MM-dd");
    console.log("[Dashboard][Frontend] Fetching stats for:", { fromDate, toDate });

    const res = await fetch(`${API.DASHBOARD_STATS}?fromDate=${fromDate}&toDate=${toDate}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
    });
    const data = await res.json();
    console.log("[Dashboard][Frontend] Stats API response:", data);

    if (data.success) {
      setStats({
        from: fromDate,
        to: toDate,
        stats: data.data,
        twilioNumbers: data.twilioNumbers
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTwilioNumbers();
  }, []);

  useEffect(() => {
    if (selectedNumber) {
      fetchStats();
    }
  }, [dateRange, selectedNumber]);

  const summary = stats?.stats ? Object.values(stats.stats).reduce((acc, s) => {
    acc.total += s.total;
    acc.completed += s.completed;
    acc.busy += s.busy;
    acc.failed += s.failed;
    acc.no_answer += s.no_answer;
    acc.in_progress += s.in_progress;
    acc.totalDuration += s.totalDuration;
    return acc;
  }, { total: 0, completed: 0, busy: 0, failed: 0, no_answer: 0, in_progress: 0, totalDuration: 0 }) : null;

  const numberStats = selectedNumber && stats?.stats?.[selectedNumber] ? stats.stats[selectedNumber] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
            <div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                className="rounded border shadow"
              />
            </div>
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-full md:w-72">
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">Select Twilio Number (Employee)</label>
                  <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                    <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                      {twilioNumbers.map(num => (
                        <SelectItem key={num} value={num}>
                          <User2 className="inline-block w-4 h-4 mr-2 text-blue-500" />
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchStats} disabled={loading} className="h-10">Refresh</Button>
              </div>

              {numberStats ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                  <div className="bg-gray-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{numberStats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Calls</div>
                  </div>
                  <div className="bg-green-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-300">{numberStats.completed}</div>
                    <div className="text-xs text-green-300">Completed</div>
                  </div>
                  <div className="bg-yellow-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">{numberStats.busy}</div>
                    <div className="text-xs text-yellow-300">Busy</div>
                  </div>
                  <div className="bg-red-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-300">{numberStats.failed}</div>
                    <div className="text-xs text-red-300">Failed</div>
                  </div>
                  <div className="bg-orange-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-300">{numberStats.no_answer}</div>
                    <div className="text-xs text-orange-300">No Answer</div>
                  </div>
                  <div className="bg-blue-900/80 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-300">{(numberStats.totalDuration / 60).toFixed(1)} min</div>
                    <div className="text-xs text-blue-300">Total Talk Time</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No call data for this number in this date range.
                </div>
              )}

              {numberStats && (
                <div className="mb-6">
                  <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Unique Numbers Called:</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {numberStats.uniqueNumbersCalled.length > 0 ? numberStats.uniqueNumbersCalled.map(num => (
                      <span key={num} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-mono">{num}</span>
                    )) : <span className="text-muted-foreground">None</span>}
                  </div>
                  <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="p-2 border">To</th>
                          <th className="p-2 border">Status</th>
                          <th className="p-2 border">Duration</th>
                          <th className="p-2 border">Start Time</th>
                          <th className="p-2 border">SID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {numberStats.callDetails.map((call, idx) => (
                          <tr key={call.sid + idx} className="hover:bg-blue-50 dark:hover:bg-blue-900 transition">
                            <td className="p-2 border font-mono">{call.to}</td>
                            <td className="p-2 border">
                              <span className={
                                call.status === 'completed' ? 'text-green-600' :
                                  call.status === 'failed' ? 'text-red-600' :
                                    call.status === 'busy' ? 'text-yellow-600' :
                                      call.status === 'no-answer' ? 'text-orange-600' :
                                        'text-blue-600'
                              }>
                                {call.status}
                              </span>
                            </td>
                            <td className="p-2 border">{call.duration ? `${call.duration}s` : '-'}</td>
                            <td className="p-2 border">{call.startTime ? new Date(call.startTime).toLocaleString() : '-'}</td>
                            <td className="p-2 border font-mono text-xs">{call.sid}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
