"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@heroui/react";

type Mode = "hour" | "minute";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];

function polarToXY(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function xyToAngle(cx: number, cy: number, x: number, y: number): number {
  const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
  return (angle + 360) % 360;
}

export default function DialTimePicker({
  hour,
  minute,
  period,
  onChange,
}: {
  hour: number; // 1-12
  minute: number; // 0-59
  period: "AM" | "PM";
  onChange: (hour: number, minute: number, period: "AM" | "PM") => void;
}) {
  const [mode, setMode] = useState<Mode>("hour");
  const dialRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const SIZE = 220;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const RADIUS = 85;
  const NUM_RADIUS = 70;

  const handAngle =
    mode === "hour" ? (hour % 12) * 30 : minute * 6;

  const handEnd = polarToXY(CX, CY, NUM_RADIUS, handAngle);

  const resolveFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = dialRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const angle = xyToAngle(CX, CY, x, y);

      if (mode === "hour") {
        let h = Math.round(angle / 30);
        if (h === 0) h = 12;
        onChange(h, minute, period);
      } else {
        let m = Math.round(angle / 6);
        if (m === 60) m = 0;
        // Snap to nearest 15
        m = Math.round(m / 15) * 15;
        if (m === 60) m = 0;
        onChange(hour, m, period);
      }
    },
    [mode, hour, minute, period, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    resolveFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    resolveFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (mode === "hour") {
      setMode("minute");
    }
  };

  const numbers = mode === "hour" ? HOURS : MINUTES;
  const activeValue = mode === "hour" ? hour : minute;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Time display */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("hour")}
          className={`rounded-lg px-2.5 py-1 text-2xl font-semibold tabular-nums transition-colors ${
            mode === "hour"
              ? "bg-primary/15 text-primary"
              : "text-default-500 hover:bg-default-100"
          }`}
        >
          {String(hour).padStart(2, "0")}
        </button>
        <span className="text-default-400 text-2xl font-semibold">:</span>
        <button
          type="button"
          onClick={() => setMode("minute")}
          className={`rounded-lg px-2.5 py-1 text-2xl font-semibold tabular-nums transition-colors ${
            mode === "minute"
              ? "bg-primary/15 text-primary"
              : "text-default-500 hover:bg-default-100"
          }`}
        >
          {String(minute).padStart(2, "0")}
        </button>
        <div className="ml-2 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onChange(hour, minute, "AM")}
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors ${
              period === "AM"
                ? "bg-primary text-primary-foreground"
                : "text-default-400 hover:bg-default-100"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => onChange(hour, minute, "PM")}
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors ${
              period === "PM"
                ? "bg-primary text-primary-foreground"
                : "text-default-400 hover:bg-default-100"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Dial */}
      <svg
        ref={dialRef}
        width={SIZE}
        height={SIZE}
        className="cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background circle */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS + 10}
          className="fill-default-100 dark:fill-default-50"
        />

        {/* Hand line */}
        <line
          x1={CX}
          y1={CY}
          x2={handEnd.x}
          y2={handEnd.y}
          className="stroke-primary"
          strokeWidth={2}
        />

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={4} className="fill-primary" />

        {/* Active dot on hand end */}
        <circle cx={handEnd.x} cy={handEnd.y} r={18} className="fill-primary/20" />

        {/* Numbers */}
        {numbers.map((n) => {
          const angle = mode === "hour" ? n * 30 : n * 6;
          const { x, y } = polarToXY(CX, CY, NUM_RADIUS, angle);
          const isActive =
            mode === "hour" ? n === activeValue : n === activeValue;
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`text-xs font-medium ${
                isActive
                  ? "fill-primary"
                  : "fill-default-600 dark:fill-default-400"
              }`}
              style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}
            >
              {mode === "minute" ? String(n).padStart(2, "0") : n}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
