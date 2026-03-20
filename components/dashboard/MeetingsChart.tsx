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
              ? "bg-[#6B21A8] text-white border-[#6B21A8]"
              : "bg-white text-[#64748B] border-[#E2E8F0]"
          }`}
        >
          Bar
        </button>
        <button
          onClick={() => setChartType("line")}
          className={`text-xs px-3 py-1 rounded-md border ${
            chartType === "line"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
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
            <Bar dataKey="count" fill="#6B21A8" radius={[4, 4, 0, 0]} />
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
              stroke="#7C3AED"
              strokeWidth={2}
              dot={{ fill: "#7C3AED" }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
