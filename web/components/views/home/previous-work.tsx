"use client";

import Icon from "@/components/misc/icon";
import { Button } from "@heroui/react";
import { type Agent } from "@/components/views/home/fallback-agents";
import {
  getPortfolio,
  type Portfolio,
  type PortfolioCampaign,
  type PortfolioCode,
  type PortfolioDashboard,
  type PortfolioDoc,
  type PortfolioEmail,
  type PortfolioGeneric,
  type PortfolioImage,
  type PortfolioInvoice,
  type PortfolioOutreach,
  type PortfolioResearch,
  type PortfolioTicket,
  type PortfolioVideo,
} from "@/components/views/home/agent-portfolio";

// ── SVG mockup thumbnails ───────────────────────────────────────────────────

const mockColors = {
  amber: "#d97706",
  amberSoft: "#fef3c7",
  ink: "#1f2937",
  inkSoft: "#64748b",
  line: "#e5e7eb",
  paper: "#fdfcfa",
  bg: "#f4f4f5",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
};

function MuEmail() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill="#fff" />
      <rect width="200" height="26" fill={mockColors.bg} />
      <rect x="8" y="8" width="6" height="10" rx="1" fill={mockColors.inkSoft} />
      <rect x="20" y="10" width="80" height="3" rx="0.5" fill={mockColors.ink} />
      <rect x="20" y="15" width="50" height="2.5" rx="0.5" fill={mockColors.inkSoft} />
      <rect x="12" y="34" width="130" height="4" rx="1" fill={mockColors.ink} />
      <circle cx="18" cy="50" r="4" fill={mockColors.amber} />
      <rect x="26" y="47" width="40" height="2.5" rx="0.5" fill={mockColors.ink} />
      <rect x="26" y="52" width="60" height="2" rx="0.5" fill={mockColors.inkSoft} />
      {[62, 68, 74, 80, 90, 96, 102, 112, 118].map((y, i) => (
        <rect key={y} x="12" y={y} width={170 - ((i * 13) % 40)} height="2.5" rx="0.5" fill={mockColors.line} />
      ))}
      <rect x="12" y="126" width="60" height="12" rx="2" fill={mockColors.bg} stroke={mockColors.line} strokeWidth="0.5" />
      <rect x="16" y="129" width="6" height="6" rx="1" fill={mockColors.red} />
      <rect x="25" y="130" width="30" height="2" rx="0.5" fill={mockColors.ink} />
      <rect x="25" y="134" width="20" height="1.5" rx="0.5" fill={mockColors.inkSoft} />
      <rect x="150" y="128" width="36" height="10" rx="3" fill="#ecfdf5" />
      <circle cx="156" cy="133" r="1.5" fill={mockColors.green} />
      <text x="160" y="135" fontSize="5" fill={mockColors.green} fontWeight="600" fontFamily="system-ui">Sent</text>
    </svg>
  );
}

function MuSpreadsheet() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill="#fff" />
      <rect width="200" height="18" fill={mockColors.bg} />
      <rect x="6" y="6" width="6" height="6" rx="1" fill={mockColors.amber} />
      <rect x="16" y="7" width="30" height="4" rx="0.5" fill={mockColors.inkSoft} />
      <rect x="6" y="22" width="188" height="10" rx="1" fill="#fff" stroke={mockColors.line} strokeWidth="0.5" />
      <text x="10" y="29" fontSize="5" fontFamily="ui-monospace, monospace" fill={mockColors.amber}>=SUM(D2:D24)</text>
      <rect y="34" width="200" height="10" fill={mockColors.bg} />
      {["Customer", "Invoice", "Amount", "Status", "Date"].map((h, i) => (
        <text key={h} x={10 + i * 38} y="41" fontSize="5" fontWeight="600" fill={mockColors.ink} fontFamily="system-ui">{h}</text>
      ))}
      {[
        ["Cortex Labs", "#4421", "$4,200", "Paid", "02/14"],
        ["Hillview Roast", "#4388", "$1,850", "Paid", "02/12"],
        ["Orbit Partners", "#4402", "$12,400", "Overdue", "01/28"],
        ["Mercato LLC", "#4415", "$3,600", "Pending", "02/13"],
        ["Northline Cafés", "#4399", "$980", "Paid", "02/10"],
        ["Glasshouse Co", "#4410", "$5,220", "Paid", "02/11"],
        ["Atlas Dev Shop", "#4420", "$2,100", "Pending", "02/13"],
        ["Bellwether", "#4391", "$1,480", "Paid", "02/09"],
      ].map((row, i) => {
        const y = 50 + i * 11;
        const statusColor = row[3] === "Paid" ? mockColors.green : row[3] === "Overdue" ? mockColors.red : mockColors.amber;
        const bg = i % 2 === 0 ? "#fff" : "#fafafa";
        return (
          <g key={i}>
            <rect y={y - 7} width="200" height="11" fill={bg} />
            <text x="10" y={y} fontSize="5" fill={mockColors.ink} fontFamily="system-ui">{row[0]}</text>
            <text x="48" y={y} fontSize="5" fill={mockColors.inkSoft} fontFamily="ui-monospace, monospace">{row[1]}</text>
            <text x="86" y={y} fontSize="5" fontWeight="600" fill={mockColors.ink} fontFamily="ui-monospace, monospace">{row[2]}</text>
            <g transform={`translate(124, ${y - 4})`}>
              <rect width="22" height="5" rx="1" fill={statusColor} opacity="0.15" />
              <text x="2" y="4" fontSize="4" fill={statusColor} fontWeight="600" fontFamily="system-ui">{row[3]}</text>
            </g>
            <text x="162" y={y} fontSize="5" fill={mockColors.inkSoft} fontFamily="ui-monospace, monospace">{row[4]}</text>
          </g>
        );
      })}
      <rect y="138" width="200" height="12" fill={mockColors.amberSoft} />
      <text x="10" y="146" fontSize="5" fontWeight="600" fill={mockColors.ink} fontFamily="system-ui">Total</text>
      <text x="86" y="146" fontSize="5" fontWeight="700" fill={mockColors.amber} fontFamily="ui-monospace, monospace">$31,830</text>
    </svg>
  );
}

function MuPDF({ kind = "report" }: { kind?: "report" | "contract" }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect x="28" y="6" width="144" height="138" rx="3" fill={mockColors.paper} stroke={mockColors.line} strokeWidth="1" />
      <path d="M 158 6 L 172 6 L 172 20 Z" fill={mockColors.line} />
      <rect x="28" y="6" width="144" height="22" fill={mockColors.amber} />
      <rect x="36" y="14" width="60" height="4" rx="1" fill="#fff" opacity="0.9" />
      <rect x="36" y="21" width="36" height="2.5" rx="1" fill="#fff" opacity="0.6" />
      <rect x="36" y="36" width="90" height="5" rx="1" fill={mockColors.ink} />
      <rect x="36" y="45" width="60" height="3" rx="1" fill={mockColors.inkSoft} />
      {[60, 68, 76, 84].map((y) => (
        <g key={y}>
          <rect x="36" y={y} width="128" height="2" rx="1" fill={mockColors.line} />
          <rect x="36" y={y + 3} width={80 + (y % 20)} height="2" rx="1" fill={mockColors.line} />
        </g>
      ))}
      {kind === "report" && (
        <g>
          <rect x="36" y="98" width="60" height="38" rx="2" fill={mockColors.amberSoft} />
          <polyline points="40,130 48,118 56,124 64,110 72,116 80,104 88,108" fill="none" stroke={mockColors.amber} strokeWidth="1.5" />
          <rect x="104" y="98" width="60" height="38" rx="2" fill="#f3f4f6" />
          {[108, 120, 132, 144, 156].map((x, i) => (
            <rect key={x} x={x} y={130 - (6 + i * 5)} width="6" height={6 + i * 5} fill={mockColors.amber} opacity={0.5 + i * 0.1} />
          ))}
        </g>
      )}
      {kind === "contract" && (
        <g>
          {[98, 105, 112, 119, 126, 133].map((y) => (
            <rect key={y} x="36" y={y} width={128 - ((y * 7) % 40)} height="2" rx="1" fill={mockColors.line} />
          ))}
          <line x1="36" y1="140" x2="100" y2="140" stroke={mockColors.ink} strokeWidth="0.8" />
          <path d="M 40 138 Q 50 132, 60 138 T 80 137" fill="none" stroke={mockColors.amber} strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}

function MuLanding({ hue = 30 }: { hue?: number }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill="#fff" />
      <rect width="200" height="14" fill={mockColors.bg} />
      <circle cx="6" cy="7" r="1.5" fill="#ef4444" />
      <circle cx="11" cy="7" r="1.5" fill="#f59e0b" />
      <circle cx="16" cy="7" r="1.5" fill="#10b981" />
      <rect x="12" y="20" width="16" height="4" rx="1" fill={mockColors.ink} />
      <rect x="168" y="18" width="20" height="8" rx="2" fill={mockColors.amber} />
      <rect x="12" y="36" width="100" height="52" rx="2" fill={`hsl(${hue} 70% 94%)`} stroke={`hsl(${hue} 60% 80%)`} strokeWidth="0.5" />
      <rect x="20" y="44" width="70" height="5" rx="1" fill={mockColors.ink} />
      <rect x="20" y="52" width="54" height="5" rx="1" fill={mockColors.ink} />
      <rect x="20" y="63" width="80" height="2.5" rx="1" fill={mockColors.inkSoft} />
      <rect x="20" y="68" width="64" height="2.5" rx="1" fill={mockColors.inkSoft} />
      <rect x="20" y="76" width="28" height="8" rx="2" fill={mockColors.amber} />
      <rect x="52" y="76" width="24" height="8" rx="2" fill="none" stroke={mockColors.ink} strokeWidth="0.8" />
      <rect x="118" y="36" width="70" height="52" rx="2" fill={`hsl(${hue} 70% 72%)`} />
      <circle cx="168" cy="48" r="10" fill={`hsl(${(hue + 20) % 360} 80% 82%)`} opacity="0.8" />
      <circle cx="135" cy="72" r="8" fill={`hsl(${(hue + 40) % 360} 75% 88%)`} opacity="0.8" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${12 + i * 60}, 98)`}>
          <rect width="56" height="40" rx="2" fill={mockColors.paper} stroke={mockColors.line} strokeWidth="0.5" />
          <rect x="6" y="6" width="10" height="10" rx="2" fill={mockColors.amberSoft} />
          <circle cx="11" cy="11" r="3" fill={mockColors.amber} />
          <rect x="6" y="20" width="40" height="3" rx="1" fill={mockColors.ink} />
          <rect x="6" y="26" width="32" height="2" rx="1" fill={mockColors.inkSoft} />
          <rect x="6" y="30" width="36" height="2" rx="1" fill={mockColors.inkSoft} />
        </g>
      ))}
    </svg>
  );
}

function MuProduct({ hue = 30 }: { hue?: number }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`prg-${hue}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${hue} 40% 98%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 30% 90%)`} />
        </radialGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#prg-${hue})`} />
      <ellipse cx="100" cy="126" rx="70" ry="10" fill={`hsl(${hue} 30% 80%)`} opacity="0.6" />
      <path d="M 72 40 L 128 40 L 132 120 L 68 120 Z" fill={`hsl(${hue} 45% 30%)`} />
      <path d="M 72 40 L 128 40 L 128 46 L 72 46 Z" fill={`hsl(${hue} 45% 25%)`} />
      <rect x="82" y="58" width="36" height="48" rx="2" fill={`hsl(${hue} 40% 95%)`} />
      <rect x="86" y="62" width="28" height="3" rx="0.5" fill={`hsl(${hue} 60% 30%)`} />
      <rect x="86" y="68" width="20" height="2" rx="0.5" fill={`hsl(${hue} 40% 50%)`} />
      <circle cx="100" cy="82" r="8" fill="none" stroke={`hsl(${hue} 60% 30%)`} strokeWidth="1" />
      <path d="M 96 80 Q 100 76, 104 82 Q 100 84, 96 80" fill={`hsl(${hue} 60% 40%)`} />
    </svg>
  );
}

function MuSocialPost({ hue = 30 }: { hue?: number }) {
  return (
    <svg viewBox="0 0 112 200" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`sg-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 80% 85%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 70% 65%)`} />
        </linearGradient>
      </defs>
      <rect width="112" height="120" fill={`url(#sg-${hue})`} />
      <circle cx="56" cy="80" r="24" fill={`hsl(${hue} 60% 40%)`} />
      <circle cx="48" cy="74" r="3" fill="#fff" opacity="0.9" />
      <rect y="120" width="112" height="80" fill={`hsl(${hue} 40% 92%)`} />
      <rect x="8" y="134" width="96" height="54" rx="4" fill="#fff" opacity="0.95" />
      <rect x="14" y="140" width="80" height="4" rx="1" fill={mockColors.ink} />
      <rect x="14" y="148" width="64" height="4" rx="1" fill={mockColors.ink} />
      <rect x="14" y="158" width="84" height="2.5" rx="1" fill={mockColors.inkSoft} />
      <rect x="14" y="163" width="70" height="2.5" rx="1" fill={mockColors.inkSoft} />
      <rect x="14" y="174" width="30" height="8" rx="2" fill={mockColors.amber} />
      <rect x="6" y="6" width="30" height="2" rx="1" fill="#fff" opacity="0.9" />
      <circle cx="14" cy="18" r="5" fill="#fff" />
      <circle cx="14" cy="18" r="4" fill={`hsl(${hue} 60% 50%)`} />
      <rect x="22" y="15" width="20" height="2.5" rx="0.5" fill="#fff" />
    </svg>
  );
}

function MuAppScreen({ hue = 340 }: { hue?: number }) {
  return (
    <svg viewBox="0 0 112 200" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="112" height="200" fill={mockColors.bg} />
      <rect x="14" y="8" width="84" height="184" rx="12" fill="#1f2937" />
      <rect x="18" y="14" width="76" height="172" rx="6" fill="#fff" />
      <rect x="46" y="14" width="20" height="4" rx="2" fill="#1f2937" />
      <rect x="22" y="30" width="40" height="4" rx="1" fill={mockColors.ink} />
      <circle cx="86" cy="32" r="4" fill={`hsl(${hue} 60% 85%)`} />
      <rect x="22" y="40" width="68" height="8" rx="4" fill={mockColors.bg} />
      <rect x="22" y="54" width="68" height="38" rx="3" fill={`hsl(${hue} 60% 92%)`} />
      <rect x="26" y="58" width="30" height="3" rx="0.5" fill={mockColors.ink} />
      <rect x="26" y="64" width="22" height="2" rx="0.5" fill={mockColors.inkSoft} />
      <rect x="26" y="74" width="22" height="10" rx="2" fill={`hsl(${hue} 70% 50%)`} />
      <circle cx="76" cy="72" r="8" fill={`hsl(${hue} 70% 60%)`} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(22, ${98 + i * 22})`}>
          <rect width="68" height="18" rx="2" fill="#fff" stroke={mockColors.line} strokeWidth="0.3" />
          <rect x="4" y="4" width="10" height="10" rx="2" fill={`hsl(${(hue + i * 40) % 360} 60% 85%)`} />
          <rect x="18" y="5" width="32" height="2.5" rx="0.5" fill={mockColors.ink} />
          <rect x="18" y="10" width="24" height="2" rx="0.5" fill={mockColors.inkSoft} />
          <rect x="56" y="7" width="8" height="4" rx="1" fill={mockColors.amberSoft} />
        </g>
      ))}
      <rect x="14" y="168" width="84" height="24" fill="#fff" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={28 + i * 19} cy="180" r="2.5" fill={i === 0 ? mockColors.amber : mockColors.inkSoft} />
      ))}
    </svg>
  );
}

function MuDashboard() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill={mockColors.bg} />
      <rect x="0" y="0" width="30" height="150" fill="#fff" />
      <circle cx="15" cy="14" r="5" fill={mockColors.amber} />
      {[28, 40, 52, 64].map((y, i) => (
        <g key={y}>
          <rect x="6" y={y} width="18" height="8" rx="1" fill={i === 0 ? mockColors.amberSoft : "none"} />
          <circle cx="10" cy={y + 4} r="1.5" fill={i === 0 ? mockColors.amber : mockColors.inkSoft} />
          <rect x="14" y={y + 3} width="8" height="2" rx="0.5" fill={i === 0 ? mockColors.ink : mockColors.inkSoft} />
        </g>
      ))}
      {[
        { x: 38, color: mockColors.amberSoft, accent: mockColors.amber, trend: "up" as const },
        { x: 92, color: "#ecfdf5", accent: mockColors.green, trend: "up" as const },
        { x: 146, color: "#eff6ff", accent: mockColors.blue, trend: "down" as const },
      ].map((k, i) => (
        <g key={i}>
          <rect x={k.x} y="8" width="48" height="32" rx="3" fill="#fff" />
          <rect x={k.x + 4} y="12" width="20" height="2" rx="0.5" fill={mockColors.inkSoft} />
          <rect x={k.x + 4} y="17" width="30" height="6" rx="1" fill={mockColors.ink} />
          <rect x={k.x + 4} y="28" width="12" height="4" rx="1" fill={k.color} />
          <polygon points={k.trend === "up" ? `${k.x + 7},31 ${k.x + 10},28 ${k.x + 13},31` : `${k.x + 7},29 ${k.x + 10},32 ${k.x + 13},29`} fill={k.accent} />
        </g>
      ))}
      <rect x="38" y="46" width="102" height="56" rx="3" fill="#fff" />
      <rect x="42" y="50" width="30" height="3" rx="0.5" fill={mockColors.ink} />
      <g transform="translate(42, 60)">
        <polyline points="0,30 12,26 24,28 36,18 48,22 60,14 72,16 84,8 94,10" fill="none" stroke={mockColors.amber} strokeWidth="1.5" />
        <polyline points="0,30 12,26 24,28 36,18 48,22 60,14 72,16 84,8 94,10 94,36 0,36" fill={mockColors.amberSoft} opacity="0.5" />
      </g>
      <rect x="144" y="46" width="52" height="56" rx="3" fill="#fff" />
      <circle cx="170" cy="78" r="16" fill="none" stroke={mockColors.line} strokeWidth="6" />
      <circle cx="170" cy="78" r="16" fill="none" stroke={mockColors.amber} strokeWidth="6" strokeDasharray="60 100" transform="rotate(-90 170 78)" />
      <circle cx="170" cy="78" r="16" fill="none" stroke={mockColors.green} strokeWidth="6" strokeDasharray="28 100" strokeDashoffset="-60" transform="rotate(-90 170 78)" />
      <rect x="38" y="108" width="158" height="38" rx="3" fill="#fff" />
    </svg>
  );
}

function MuSalesReport() {
  const points = [90, 84, 78, 70, 72, 60, 50, 44, 36];
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill="#fff" />
      <rect x="0" y="0" width="200" height="22" fill={mockColors.bg} />
      <circle cx="8" cy="11" r="2" fill="#ef4444" />
      <circle cx="16" cy="11" r="2" fill="#f59e0b" />
      <circle cx="24" cy="11" r="2" fill="#10b981" />
      <rect x="12" y="30" width="60" height="4" rx="1" fill={mockColors.ink} />
      <rect x="12" y="38" width="40" height="2.5" rx="1" fill={mockColors.inkSoft} />
      <rect x="12" y="48" width="42" height="22" rx="2" fill={mockColors.amberSoft} />
      <text x="18" y="60" fontSize="8" fontWeight="700" fill={mockColors.amber} fontFamily="system-ui">$48.2k</text>
      <rect x="60" y="48" width="42" height="22" rx="2" fill="#ecfdf5" />
      <text x="66" y="60" fontSize="8" fontWeight="700" fill={mockColors.green} fontFamily="system-ui">+14%</text>
      <rect x="108" y="48" width="42" height="22" rx="2" fill="#eff6ff" />
      <text x="114" y="60" fontSize="8" fontWeight="700" fill={mockColors.blue} fontFamily="system-ui">1,204</text>
      <g transform="translate(12, 78)">
        {points.map((y, i) => (
          <rect key={i} x={i * 20 + 4} y={y - 20} width="12" height={75 - y} fill={mockColors.amber} opacity={0.5 + i * 0.05} rx="1" />
        ))}
        <polyline points={points.map((y, i) => `${i * 20 + 10},${y - 30}`).join(" ")} fill="none" stroke={mockColors.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function MuCodeDiff() {
  const lines: { t: "normal" | "add" | "del"; c: string; txt: string }[] = [
    { t: "normal", c: "#94a3b8", txt: "export const price = (items) => {" },
    { t: "del", c: "#fca5a5", txt: "  return items.reduce((a, b) =>" },
    { t: "del", c: "#fca5a5", txt: "    a + b.cost * 1.08, 0);" },
    { t: "add", c: "#86efac", txt: "  const tax = getTaxRate(items);" },
    { t: "add", c: "#86efac", txt: "  return items.reduce((a, b) =>" },
    { t: "add", c: "#86efac", txt: "    a + b.cost * (1 + tax), 0);" },
    { t: "normal", c: "#94a3b8", txt: "}" },
    { t: "normal", c: "#94a3b8", txt: "" },
    { t: "normal", c: "#94a3b8", txt: "export const format = (n) => {" },
    { t: "add", c: "#86efac", txt: '  if (typeof n !== "number") return "-";' },
    { t: "normal", c: "#94a3b8", txt: "  return `$${n.toFixed(2)}`;" },
    { t: "normal", c: "#94a3b8", txt: "}" },
  ];
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="200" height="150" fill="#1e293b" />
      <rect x="0" y="0" width="200" height="16" fill="#0f172a" />
      <rect x="6" y="4" width="50" height="12" fill="#1e293b" />
      <circle cx="12" cy="10" r="2" fill={mockColors.amber} />
      <rect x="18" y="8" width="30" height="3" rx="0.5" fill="#cbd5e1" />
      {lines.map((line, i) => {
        const y = 22 + i * 10;
        const rowFill = line.t === "add" ? "#14532d" : line.t === "del" ? "#7f1d1d" : "transparent";
        return (
          <g key={i}>
            <rect y={y - 7} width="200" height="10" fill={rowFill} opacity="0.3" />
            <text x="4" y={y} fontSize="5" fill="#475569" fontFamily="ui-monospace, monospace">{i + 1}</text>
            <text x="14" y={y} fontSize="5" fill={line.t === "add" ? mockColors.green : line.t === "del" ? mockColors.red : "#64748b"} fontFamily="ui-monospace, monospace">
              {line.t === "add" ? "+" : line.t === "del" ? "−" : " "}
            </text>
            <text x="22" y={y} fontSize="5" fill={line.c} fontFamily="ui-monospace, monospace">{line.txt}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MuVideoThumb({ hue = 18, scene = "product" }: { hue?: number; scene?: "product" | "person" | "scene" }) {
  const gradId = `vg-${hue}-${scene}`;
  return (
    <svg viewBox="0 0 112 200" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 80% 65%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 30) % 360} 70% 38%)`} />
        </linearGradient>
      </defs>
      <rect width="112" height="200" fill={`url(#${gradId})`} />
      {scene === "product" && (
        <g>
          <ellipse cx="56" cy="140" rx="32" ry="6" fill="#000" opacity="0.2" />
          <rect x="40" y="60" width="32" height="80" rx="3" fill={`hsl(${hue} 60% 25%)`} />
          <rect x="44" y="80" width="24" height="30" rx="1" fill={`hsl(${hue} 40% 95%)`} />
          <circle cx="56" cy="95" r="5" fill="none" stroke={`hsl(${hue} 60% 30%)`} strokeWidth="1" />
        </g>
      )}
      {scene === "person" && (
        <g>
          <circle cx="56" cy="85" r="18" fill={`hsl(${hue} 30% 70%)`} />
          <path d="M 36 110 Q 56 100, 76 110 L 82 160 L 30 160 Z" fill={`hsl(${hue} 40% 40%)`} />
        </g>
      )}
      {scene === "scene" && (
        <g>
          <rect y="130" width="112" height="70" fill={`hsl(${hue} 40% 22%)`} />
          <circle cx="20" cy="40" r="12" fill="#fff" opacity="0.7" />
          <path d="M 0 130 Q 30 120, 60 128 T 112 124 L 112 130 Z" fill={`hsl(${hue} 50% 50%)`} opacity="0.6" />
        </g>
      )}
      <circle cx="56" cy="100" r="14" fill="#000" opacity="0.4" />
      <polygon points="52,94 52,106 64,100" fill="#fff" />
      <rect y="170" width="112" height="30" fill="#000" opacity="0.55" />
      <rect x="8" y="176" width="60" height="3" rx="1" fill="#fff" />
      <rect x="8" y="183" width="44" height="2" rx="0.5" fill="#fff" opacity="0.8" />
      <rect x="0" y="167" width="112" height="1.5" fill="#fff" opacity="0.3" />
      <rect x="0" y="167" width="60" height="1.5" fill={mockColors.amber} />
    </svg>
  );
}

// ── Pill used across card footers ───────────────────────────────────────────

type PillTone = "success" | "warning" | "danger" | "info";

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const classes: Record<PillTone, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    info: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  };
  const dotColor: Record<PillTone, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${classes[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]}`} />
      {children}
    </span>
  );
}

const cardBase =
  "overflow-hidden rounded-xl border border-default-200 bg-white dark:border-white/8 dark:bg-white/[0.03]";

// ── Per-kind card renderers ─────────────────────────────────────────────────

function PwEmail({ it }: { it: PortfolioEmail }) {
  return (
    <div className={`${cardBase} grid grid-cols-[120px_1fr] gap-3 p-3`}>
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-default-200 bg-white dark:border-white/8">
        <MuEmail />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11.5px] font-medium text-default-500 dark:text-white/50">
            <Icon name="person" variant="round" className="text-[13px]" />
            <span className="truncate">{it.to}</span>
          </span>
          <span className="shrink-0 text-[11px] text-default-400 dark:text-white/35">{it.when}</span>
        </div>
        <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.subject}</div>
        <p className="line-clamp-2 text-xs leading-relaxed text-default-500 dark:text-white/55">{it.snippet}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Pill tone="success">{it.outcome}</Pill>
          <span className="inline-flex items-center gap-1 text-[11px] text-default-400 dark:text-white/40">
            <Icon name="chat_bubble" variant="round" className="text-[12px]" />
            {it.tone}
          </span>
        </div>
      </div>
    </div>
  );
}

function PwInvoice({ it }: { it: PortfolioInvoice }) {
  const tone: PillTone = it.status === "Paid" ? "success" : it.status === "Overdue" ? "danger" : "info";
  return (
    <div className={`${cardBase} grid grid-cols-[120px_1fr] gap-3 p-3`}>
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-default-200 bg-white dark:border-white/8">
        <MuSpreadsheet />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.customer}</div>
            <div className="mt-0.5 text-xs text-default-400 dark:text-white/40">
              {it.invoice} · {it.amount}
            </div>
          </div>
          <Pill tone={tone}>{it.status}</Pill>
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-default-500 dark:text-white/55">{it.note}</div>
        <div className="mt-auto pt-1 text-[11px] text-default-400 dark:text-white/35">{it.when}</div>
      </div>
    </div>
  );
}

function PwImage({ it }: { it: PortfolioImage }) {
  return (
    <div className={cardBase}>
      <div className="relative aspect-[4/3] overflow-hidden bg-default-50 dark:bg-white/5">
        {it.mockup === "landing" && <MuLanding hue={it.hue} />}
        {it.mockup === "product" && <MuProduct hue={it.hue} />}
        {it.mockup === "socialPost" && <MuSocialPost hue={it.hue} />}
        {it.mockup === "appScreen" && <MuAppScreen hue={it.hue} />}
        {it.mockup === "dashboard" && <MuDashboard />}
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-white">
          ×{it.variants}
        </span>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
        <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">{it.brief}</div>
      </div>
    </div>
  );
}

function PwDoc({ it }: { it: PortfolioDoc }) {
  return (
    <div className={`${cardBase} grid grid-cols-[140px_1fr] gap-3 p-3`}>
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-default-50 dark:bg-white/5">
        <MuPDF kind={it.mockupKind} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
        <div className="text-xs text-default-400 dark:text-white/40">
          {it.words} · {it.when}
        </div>
        <p className="line-clamp-3 text-xs leading-relaxed text-default-500 dark:text-white/55">{it.excerpt}</p>
        <div className="mt-auto pt-1">
          <Pill tone="success">{it.outcome}</Pill>
        </div>
      </div>
    </div>
  );
}

function PwCampaign({ it }: { it: PortfolioCampaign }) {
  const tone: PillTone = it.status === "Winning" ? "success" : it.status === "Scaling" ? "warning" : "info";
  return (
    <div className={cardBase}>
      <div className="aspect-[16/6] overflow-hidden bg-default-50 dark:bg-white/5">
        <MuLanding hue={it.hue} />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.name}</div>
          <Pill tone={tone}>{it.status}</Pill>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <div className="text-[15px] font-bold text-default-800 dark:text-white/90">{it.spend}</div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">Spend</div>
          </div>
          <div>
            <div className="text-[15px] font-bold text-default-800 dark:text-white/90">{it.ctr}</div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">CTR</div>
          </div>
          <div>
            <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">{it.roas}</div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">ROAS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PwResearch({ it }: { it: PortfolioResearch }) {
  return (
    <div className={`${cardBase} grid grid-cols-[140px_1fr] gap-3 p-3`}>
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-default-50 dark:bg-white/5">
        <MuPDF kind={it.mockupKind} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
        <div className="text-xs text-default-400 dark:text-white/40">
          {it.sources} sources · {it.when}
        </div>
        <div className="mt-1 rounded-lg border-l-2 border-amber-400 bg-amber-50/60 p-2 dark:border-amber-500/60 dark:bg-amber-500/5">
          <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Key finding
          </div>
          <div className="text-xs leading-relaxed text-default-600 dark:text-white/65">{it.finding}</div>
        </div>
      </div>
    </div>
  );
}

function PwDashboard({ it }: { it: PortfolioDashboard }) {
  return (
    <div className={cardBase}>
      <div className="aspect-[4/3] overflow-hidden bg-default-50 dark:bg-white/5">
        {it.mockup === "dashboard" ? <MuDashboard /> : <MuSalesReport />}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-default-500 dark:text-white/55">
          <Icon name="insights" variant="round" className="text-[13px] text-amber-500" />
          <span className="leading-relaxed">{it.insight}</span>
        </div>
      </div>
    </div>
  );
}

function PwTicket({ it }: { it: PortfolioTicket }) {
  return (
    <div className={`${cardBase} p-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.customer}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-default-500 dark:text-white/55">{it.issue}</div>
        </div>
        <span className="flex shrink-0 items-center gap-0.5">
          {Array.from({ length: it.csat }).map((_, i) => (
            <Icon key={i} name="star" variant="round" className="text-[11px] text-amber-400" />
          ))}
        </span>
      </div>
      <div className="mt-2 inline-flex items-start gap-1.5 text-xs text-default-600 dark:text-white/65">
        <Icon name="check_circle" variant="round" className="mt-[1px] text-[13px] text-emerald-500" />
        <span>{it.resolution}</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-default-400 dark:text-white/40">
        <Icon name="schedule" variant="round" className="text-[12px]" />
        {it.time}
      </div>
    </div>
  );
}

function PwOutreach({ it }: { it: PortfolioOutreach }) {
  return (
    <div className={`${cardBase} p-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.company}</div>
          <div className="mt-0.5 text-xs text-default-400 dark:text-white/40">
            {it.persona} · {it.when}
          </div>
        </div>
        <Pill tone="success">{it.replies}</Pill>
      </div>
      <blockquote className="mt-2 border-l-2 border-default-200 pl-2 text-xs italic leading-relaxed text-default-500 dark:border-white/10 dark:text-white/55">
        &ldquo;{it.opener}&rdquo;
      </blockquote>
    </div>
  );
}

function PwCode({ it }: { it: PortfolioCode }) {
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2 border-b border-default-200 p-3 dark:border-white/8">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
          <Icon name="merge" variant="round" className="text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-medium text-default-400 dark:text-white/45">{it.repo}</div>
          <div className="truncate text-[13px] font-semibold text-default-800 dark:text-white/90">{it.pr}</div>
        </div>
        <Pill tone={it.status === "Merged" ? "success" : "warning"}>{it.status}</Pill>
      </div>
      <div className="aspect-[16/7] overflow-hidden bg-slate-900">
        <MuCodeDiff />
      </div>
      <div className="flex items-center gap-3 px-3 py-2 text-[11.5px] text-default-500 dark:text-white/50">
        <span className="inline-flex items-center gap-1">
          <Icon name="description" variant="round" className="text-[12px]" />
          {it.files} files
        </span>
        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">+{it.additions}</span>
        <span className="font-mono font-semibold text-red-500 dark:text-red-400">−{it.deletions}</span>
        <span className="ml-auto text-[11px] text-default-400 dark:text-white/35">{it.when}</span>
      </div>
    </div>
  );
}

function PwVideo({ it }: { it: PortfolioVideo }) {
  return (
    <div className={cardBase}>
      <div className="relative aspect-[9/16] overflow-hidden bg-default-50 dark:bg-white/5">
        <MuVideoThumb hue={it.hue} scene={it.scene} />
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white">
          {it.duration}
        </span>
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-default-400 dark:text-white/45">
          <Icon name="visibility" variant="round" className="text-[12px]" />
          {it.views} · {it.platform}
        </div>
      </div>
    </div>
  );
}

function PwGeneric({ it }: { it: PortfolioGeneric }) {
  return (
    <div className={`${cardBase} p-3.5`}>
      <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{it.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-default-500 dark:text-white/55">{it.excerpt}</p>
      <div className="mt-2 text-[11px] text-default-400 dark:text-white/35">{it.when}</div>
    </div>
  );
}

// ── Main section ────────────────────────────────────────────────────────────

const GRID_COLS: Record<Portfolio["kind"], string> = {
  email: "grid-cols-1",
  invoice: "grid-cols-1",
  doc: "grid-cols-1",
  research: "grid-cols-1",
  outreach: "grid-cols-1",
  code: "grid-cols-1",
  campaign: "grid-cols-1 sm:grid-cols-2",
  ticket: "grid-cols-1 sm:grid-cols-2",
  generic: "grid-cols-1 sm:grid-cols-2",
  image: "grid-cols-2 sm:grid-cols-3",
  design: "grid-cols-2 sm:grid-cols-3",
  dashboard: "grid-cols-2 sm:grid-cols-3",
  video: "grid-cols-2 sm:grid-cols-3",
};

function renderItems(pf: Portfolio) {
  switch (pf.kind) {
    case "email":
      return pf.items.map((it, i) => <PwEmail key={i} it={it} />);
    case "invoice":
      return pf.items.map((it, i) => <PwInvoice key={i} it={it} />);
    case "image":
    case "design":
      return pf.items.map((it, i) => <PwImage key={i} it={it} />);
    case "doc":
      return pf.items.map((it, i) => <PwDoc key={i} it={it} />);
    case "campaign":
      return pf.items.map((it, i) => <PwCampaign key={i} it={it} />);
    case "research":
      return pf.items.map((it, i) => <PwResearch key={i} it={it} />);
    case "dashboard":
      return pf.items.map((it, i) => <PwDashboard key={i} it={it} />);
    case "ticket":
      return pf.items.map((it, i) => <PwTicket key={i} it={it} />);
    case "outreach":
      return pf.items.map((it, i) => <PwOutreach key={i} it={it} />);
    case "code":
      return pf.items.map((it, i) => <PwCode key={i} it={it} />);
    case "video":
      return pf.items.map((it, i) => <PwVideo key={i} it={it} />);
    case "generic":
      return pf.items.map((it, i) => <PwGeneric key={i} it={it} />);
  }
}

export function PreviousWork({ agent }: { agent: Agent }) {
  const pf = getPortfolio(agent.id);
  return (
    <section className="border-t border-default-200 py-5 dark:border-white/8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-default-800 dark:text-white/90">
          Previous work
          <span className="ml-2 text-xs font-medium text-default-400 dark:text-white/40">
            {pf.items.length}
          </span>
        </h2>
        <Button
          variant="light"
          size="sm"
          endContent={<Icon name="arrow_forward" variant="round" className="text-sm" />}
        >
          View all
        </Button>
      </div>
      <p className="mb-3 text-[13px] text-default-400 dark:text-white/45">
        Recent runs from {agent.name}&rsquo;s portfolio. Redacted to protect client data.
      </p>
      <div className={`grid gap-3 ${GRID_COLS[pf.kind]}`}>{renderItems(pf)}</div>
    </section>
  );
}
