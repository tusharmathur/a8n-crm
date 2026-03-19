"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  month: string;
  count: number;
}

interface MeetingsChartProps {
  data: ChartDataPoint[];
}

/** Bar/Line toggle chart for meetings per month. */
export function MeetingsChart({ data }: MeetingsChartProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  if (data.length === 0) {
    return (
      <p className="text-[#94A3B8] text-sm text-center py-8">
        No meetings logged yet for this account.
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3 gap-2">
        <button
          onClick={() => setChartType("bar")}
          className={`text-xs px-3 py-1 rounded-md border ${
            chartType === "bar"
              ? "bg-[#F97316] text-white border-[#F97316]"
              : "bg-white text-[#64748B] border-[#E2E8F0]"
          }`}
        >
          Bar
        </button>
        <button
          onClick={() => setChartType("line")}
          className={`text-xs px-3 py-1 rounded-md border ${
            chartType === "line"
              ? "bg-[#0EA5E9] text-white border-[#0EA5E9]"
              : "bg-white text-[#64748B] border-[#E2E8F0]"
          }`}
        >
          Line
        </button>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#0EA5E9"
              strokeWidth={2}
              dot={{ fill: "#0EA5E9" }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
