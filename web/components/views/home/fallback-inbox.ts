// Fallback data for inbox view — used when API is unavailable or not seeded.

export type InboxAgent = { id: string; name: string; role: string; hue: number; avatar: string };

export const FALLBACK_INBOX_AGENTS: InboxAgent[] = [
  { id: "iris", name: "Iris", role: "Email triage", hue: 240, avatar: "https://mockmind-api.uifaces.co/content/human/49.jpg" },
  { id: "kai", name: "Kai", role: "Invoice & AR", hue: 30, avatar: "https://mockmind-api.uifaces.co/content/human/103.jpg" },
  { id: "nova", name: "Nova", role: "Brand imagery", hue: 310, avatar: "https://mockmind-api.uifaces.co/content/human/68.jpg" },
  { id: "lyra", name: "Lyra", role: "Long-form writer", hue: 160, avatar: "https://mockmind-api.uifaces.co/content/human/181.jpg" },
  { id: "ember", name: "Ember", role: "Ad campaigns", hue: 0, avatar: "https://mockmind-api.uifaces.co/content/human/156.jpg" },
  { id: "atlas", name: "Atlas", role: "Deep researcher", hue: 210, avatar: "https://mockmind-api.uifaces.co/content/human/87.jpg" },
  { id: "orbit", name: "Orbit", role: "Dashboard builder", hue: 190, avatar: "https://mockmind-api.uifaces.co/content/human/200.jpg" },
  { id: "reed", name: "Reed", role: "Tier-1 support", hue: 130, avatar: "https://mockmind-api.uifaces.co/content/human/134.jpg" },
  { id: "vale", name: "Vale", role: "Outbound SDR", hue: 290, avatar: "https://mockmind-api.uifaces.co/content/human/42.jpg" },
  { id: "axon", name: "Axon", role: "Full-stack coder", hue: 260, avatar: "https://mockmind-api.uifaces.co/content/human/217.jpg" },
  { id: "mira", name: "Mira", role: "UI/brand design", hue: 340, avatar: "https://mockmind-api.uifaces.co/content/human/29.jpg" },
];

export type Team = {
  id: string;
  name: string;
  icon: string;
  hue: number;
  goal: string;
  lead: string;
  agents: string[];
  created: string;
  runs: number;
  success: number;
};

export const FALLBACK_TEAMS: Team[] = [
  { id: "growth", name: "Growth Ops", icon: "trending_up", hue: 30, goal: "Drive more qualified pipeline from web → demo.", lead: "vale", agents: ["vale", "ember", "atlas", "lyra"], created: "Apr 12", runs: 1247, success: 0.94 },
  { id: "revops", name: "Revenue & billing", icon: "receipt_long", hue: 190, goal: "Close the loop on invoicing and cash collection.", lead: "kai", agents: ["kai", "orbit"], created: "Mar 03", runs: 612, success: 0.98 },
  { id: "support", name: "Customer support", icon: "support_agent", hue: 130, goal: "Keep tier-1 inbox at <5 min response.", lead: "reed", agents: ["reed", "iris", "atlas"], created: "Feb 18", runs: 3892, success: 0.96 },
  { id: "brand", name: "Brand studio", icon: "palette", hue: 310, goal: "Weekly content drops across social + blog.", lead: "mira", agents: ["mira", "nova", "lyra"], created: "Apr 21", runs: 284, success: 0.91 },
];

export type Thread = {
  id: string;
  kind: "dm" | "team" | "notif";
  teamId?: string;
  agentId?: string;
  title: string;
  preview: string;
  unread: number;
  pinned: boolean;
  updated: string;
  status: "active" | "needs-approval" | "review" | "done";
};

export const FALLBACK_THREADS: Thread[] = [
  { id: "t1", kind: "team", teamId: "growth", title: "Q2 outbound push", preview: "Vale → Ember: handing off 14 warm leads for retargeting ads…", unread: 3, pinned: true, updated: "12:41", status: "active" },
  { id: "t2", kind: "dm", agentId: "iris", title: "Iris", preview: "Triaged 47 emails overnight — 2 need your approval before reply.", unread: 2, pinned: true, updated: "12:18", status: "needs-approval" },
  { id: "t3", kind: "team", teamId: "support", title: "Weekend ticket backlog", preview: "Reed closed 38/42 tickets. 4 escalated to Iris for VIP routing.", unread: 0, pinned: false, updated: "11:02", status: "active" },
  { id: "t4", kind: "dm", agentId: "kai", title: "Kai", preview: "3 invoices paid this morning. Cortex Labs still 17 days overdue.", unread: 0, pinned: false, updated: "10:47", status: "active" },
  { id: "t5", kind: "notif", title: "Weekly digest", preview: "Your agents completed 284 tasks this week — up 12% from last.", unread: 0, pinned: false, updated: "9:00", status: "done" },
  { id: "t6", kind: "team", teamId: "revops", title: "March close-out", preview: "Kai → Orbit: dashboard ready for your review.", unread: 0, pinned: false, updated: "Mon", status: "done" },
  { id: "t7", kind: "dm", agentId: "nova", title: "Nova", preview: "Generated 6 hero variants for the Spring launch. Pick your favorite →", unread: 1, pinned: false, updated: "Mon", status: "review" },
  { id: "t8", kind: "team", teamId: "brand", title: "Spring launch content", preview: "Mira → Nova → Lyra: blog post + social kit ready for review.", unread: 0, pinned: false, updated: "Sun", status: "review" },
  { id: "t9", kind: "dm", agentId: "atlas", title: "Atlas", preview: "Research brief done — 23 sources, competitive matrix attached.", unread: 0, pinned: false, updated: "Fri", status: "done" },
];
