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
  sessionId?: string;
  title: string;
  preview: string;
  unread: number;
  pinned: boolean;
  updated: string;
  status: "active" | "needs-approval" | "review" | "done";
};

export type Delivery = {
  id: string;
  agentId: string;
  task: string;
  summary: string;
  when: string;
  status: "awaiting" | "changes-req" | "approved" | "sent" | "archived";
  itemCount: number;
};

