"use client";

import React from "react";
import Link from "next/link";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  link?: {
    href: string;
    label: string;
  };
  gradientFrom?: string;
  gradientTo?: string;
  iconBgColor?: string;
}

export function AnalyticsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  link,
  gradientFrom = "from-purple-600",
  gradientTo = "to-cyan-600",
  iconBgColor = "bg-gradient-to-br from-purple-500 to-cyan-500",
}: AnalyticsCardProps) {
  return (
    <div className={`card overflow-hidden shadow-lg rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} bg-opacity-10`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80 mb-2">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{value}</p>
              {trend && (
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    trend.direction === "up"
                      ? "text-green-400"
                      : trend.direction === "down"
                      ? "text-red-400"
                      : "text-white/60"
                  }`}
                >
                  {trend.direction === "up" && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {trend.direction === "down" && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {trend.value}% {trend.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-white/70 mt-2">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
              {icon}
            </div>
          )}
        </div>
      </div>
      {link && (
        <div className="card-footer px-6 py-3 bg-white/5 border-t border-white/10">
          <Link
            href={link.href}
            className="text-sm font-medium text-white hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            {link.label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

interface MiniChartCardProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  type?: "bar" | "pie";
}

export function MiniChartCard({ title, data, type = "bar" }: MiniChartCardProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="card shadow-lg rounded-lg p-6">
      <h3 className="text-sm font-medium text-white/80 mb-4">{title}</h3>
      
      {type === "bar" && (
        <div className="space-y-3">
          {data.map((item, idx) => {
            const percentage = (item.value / maxValue) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/90 capitalize">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      item.color || "bg-gradient-to-r from-purple-500 to-cyan-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {type === "pie" && (
        <div className="flex items-center justify-center">
          <div className="space-y-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color || "bg-purple-500"}`} />
                <span className="text-sm text-white/90">{item.label}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
