// Per-agent "previous work" data, shaped to each agent's specialty.
// Keyed by the same slugs used in fallback-agents.ts.

export type PortfolioEmail = {
  to: string;
  subject: string;
  snippet: string;
  outcome: string;
  when: string;
  tone: string;
};

export type PortfolioInvoice = {
  customer: string;
  invoice: string;
  amount: string;
  status: "Paid" | "Overdue" | "Reconciled" | "Pending";
  note: string;
  when: string;
};

export type PortfolioImage = {
  title: string;
  brief: string;
  hue: number;
  variants: number;
  mockup: "landing" | "product" | "socialPost" | "appScreen" | "dashboard";
};

export type PortfolioDoc = {
  title: string;
  words: string;
  excerpt: string;
  outcome: string;
  when: string;
  mockupKind: "report" | "contract";
};

export type PortfolioCampaign = {
  name: string;
  spend: string;
  ctr: string;
  roas: string;
  status: "Winning" | "Scaling" | "Rotating";
  creatives: number;
  hue: number;
};

export type PortfolioResearch = {
  title: string;
  sources: number;
  finding: string;
  when: string;
  mockupKind: "report" | "contract";
};

export type PortfolioDashboard = {
  title: string;
  insight: string;
  bars: number[];
  mockup: "dashboard" | "salesReport";
};

export type PortfolioTicket = {
  customer: string;
  issue: string;
  resolution: string;
  time: string;
  csat: number;
};

export type PortfolioOutreach = {
  company: string;
  persona: string;
  opener: string;
  replies: string;
  when: string;
};

export type PortfolioCode = {
  repo: string;
  pr: string;
  files: number;
  additions: number;
  deletions: number;
  status: "Merged" | "In review";
  when: string;
};

export type PortfolioVideo = {
  title: string;
  duration: string;
  views: string;
  platform: string;
  hue: number;
  scene: "product" | "person" | "scene";
};

export type PortfolioGeneric = {
  title: string;
  excerpt: string;
  when: string;
};

export type Portfolio =
  | { kind: "email"; items: PortfolioEmail[] }
  | { kind: "invoice"; items: PortfolioInvoice[] }
  | { kind: "image"; items: PortfolioImage[] }
  | { kind: "doc"; items: PortfolioDoc[] }
  | { kind: "campaign"; items: PortfolioCampaign[] }
  | { kind: "research"; items: PortfolioResearch[] }
  | { kind: "dashboard"; items: PortfolioDashboard[] }
  | { kind: "ticket"; items: PortfolioTicket[] }
  | { kind: "outreach"; items: PortfolioOutreach[] }
  | { kind: "code"; items: PortfolioCode[] }
  | { kind: "design"; items: PortfolioImage[] }
  | { kind: "video"; items: PortfolioVideo[] }
  | { kind: "generic"; items: PortfolioGeneric[] };

export const PORTFOLIO: Record<string, Portfolio> = {
  iris: {
    kind: "email",
    items: [
      { to: "priya@hillview.co", subject: "Re: Wholesale pricing — Ethiopia lot attached", snippet: "Hi Priya — our wholesale tier starts at 20 lb/mo. Attaching the Ethiopia lot we just cupped…", outcome: "Booked · $4.2k PO", when: "2d ago", tone: "friendly" },
      { to: "anders@mercato.io", subject: "Re: Partnership roast — next steps", snippet: "Thanks for the note, Anders. Happy to run a 50-lb sample against your single-origin program…", outcome: "Meeting set", when: "3d ago", tone: "warm" },
      { to: "billing@cortex.ai", subject: "Following up: invoice #4421 (17 days overdue)", snippet: "Hi team — just circling back on invoice #4421. Happy to re-send if it got lost…", outcome: "Paid next day", when: "1w ago", tone: "polite" },
    ],
  },
  kai: {
    kind: "invoice",
    items: [
      { customer: "Cortex Labs", invoice: "#4421", amount: "$4,200", status: "Paid", note: "Resolved after 2 auto-nudges.", when: "2d ago" },
      { customer: "Hillview Roasters", invoice: "#4388", amount: "$1,850", status: "Reconciled", note: "Matched Stripe payout → QB.", when: "3d ago" },
      { customer: "Orbit Partners", invoice: "#4402", amount: "$12,400", status: "Overdue", note: "Escalated — payment plan proposed.", when: "5d ago" },
    ],
  },
  nova: {
    kind: "image",
    items: [
      { title: "Spring launch hero", brief: "Warm, sunlit, 16:9 for site header", hue: 30, variants: 6, mockup: "landing" },
      { title: "Cold brew product shot", brief: "White bg, can 3/4 angle, 1:1", hue: 200, variants: 4, mockup: "product" },
      { title: "Founder story — social kit", brief: "9:16 portrait + 1:1 quote cards", hue: 340, variants: 8, mockup: "socialPost" },
      { title: "Holiday gifting collection", brief: "Flat-lay, amber accents", hue: 18, variants: 5, mockup: "product" },
    ],
  },
  lyra: {
    kind: "doc",
    items: [
      { title: "Single-origin sourcing: our 2025 playbook", words: "2,140 words", excerpt: "Sourcing great coffee is less about hitting cupping scores than about building the kind of farmer relationships that hold up during a bad harvest…", outcome: "Published · 2.1k views", when: "4d ago", mockupKind: "report" },
      { title: "How we priced our wholesale tiers", words: "980 words", excerpt: "We re-ran the math this quarter. Here's what changed, why we raised the 20-lb tier, and what stayed the same…", outcome: "Blog · 430 views", when: "1w ago", mockupKind: "report" },
      { title: "Landing page copy — Spring launch", words: "620 words", excerpt: "A single 1,200 m lot, picked in the last week of March. Naturally processed on raised beds. Roasted light. 4oz, 8oz, or wholesale…", outcome: "Live on site", when: "2w ago", mockupKind: "contract" },
    ],
  },
  ember: {
    kind: "campaign",
    items: [
      { name: "Spring launch · Meta", spend: "$2,840", ctr: "3.2%", roas: "4.1x", status: "Winning", creatives: 3, hue: 30 },
      { name: "Retargeting · visitors", spend: "$1,220", ctr: "5.8%", roas: "6.4x", status: "Scaling", creatives: 4, hue: 200 },
      { name: "Cold audiences · lookalikes", spend: "$3,600", ctr: "1.9%", roas: "2.1x", status: "Rotating", creatives: 6, hue: 340 },
    ],
  },
  atlas: {
    kind: "research",
    items: [
      { title: "Competitive landscape — specialty coffee subscriptions", sources: 23, finding: "Only 3 of 18 offer lot-level traceability. That's our wedge.", when: "3d ago", mockupKind: "report" },
      { title: "Wholesale buyer ICP brief — café chains <25 locations", sources: 17, finding: "Decision maker is usually head of beverage; closes in 3–5 weeks.", when: "1w ago", mockupKind: "report" },
      { title: "Ethiopia harvest outlook — 2025 vs 2024", sources: 14, finding: "Yields down 8%; premium lots will clear early. Pre-commit by June.", when: "2w ago", mockupKind: "report" },
    ],
  },
  orbit: {
    kind: "dashboard",
    items: [
      { title: "Wholesale funnel", insight: "Close rate up 14% QoQ after pricing refresh.", bars: [40, 55, 62, 70, 58, 74, 82], mockup: "dashboard" },
      { title: "Retail cohorts", insight: "Month-2 repeat rate holding at 38%.", bars: [72, 68, 66, 60, 58, 55, 54], mockup: "salesReport" },
      { title: "Roaster utilization", insight: "Tuesday bottleneck — 94% vs 68% avg.", bars: [45, 94, 52, 48, 50, 70, 40], mockup: "dashboard" },
    ],
  },
  reed: {
    kind: "ticket",
    items: [
      { customer: "Jamie R.", issue: "Order arrived past freshness window", resolution: "Refunded + resent; added to priority list.", time: "4 min", csat: 5 },
      { customer: "Mei T.", issue: "Grind size wrong for my Aeropress", resolution: "Sent grind guide + replaced bag.", time: "2 min", csat: 5 },
      { customer: "Dev. shop", issue: "Bulk order for office — need invoice", resolution: "Escalated to Kai · PO generated.", time: "1 min", csat: 4 },
      { customer: "Nora P.", issue: "Subscription pause for 2 weeks", resolution: "Paused; confirmed restart date.", time: "<1 min", csat: 5 },
    ],
  },
  vale: {
    kind: "outreach",
    items: [
      { company: "Mercato Partners", persona: "Head of Beverage", opener: "Saw the Series B, Dana — quick thought on sourcing post-scale…", replies: "3 of 14", when: "Today" },
      { company: "Northline Cafés", persona: "VP Operations", opener: "Your Brooklyn opening looked great — a question about roaster capacity…", replies: "1 of 8", when: "Yesterday" },
      { company: "Glasshouse Group", persona: "Founder", opener: "We just helped a 12-location group cut green-coffee COGS by 11%…", replies: "2 of 11", when: "2d ago" },
    ],
  },
  axon: {
    kind: "code",
    items: [
      { repo: "hillview/storefront", pr: "feat: per-lot PDP with cupping notes", files: 14, additions: 342, deletions: 58, status: "Merged", when: "1d ago" },
      { repo: "hillview/checkout", pr: "fix: tax rounding on wholesale line items", files: 3, additions: 24, deletions: 9, status: "Merged", when: "3d ago" },
      { repo: "hillview/ops-api", pr: "chore: Stripe → QB reconciliation job", files: 8, additions: 189, deletions: 12, status: "In review", when: "4d ago" },
    ],
  },
  mira: {
    kind: "design",
    items: [
      { title: "Wholesale dashboard — redesign", brief: "3 screens · components · tokens", hue: 340, variants: 3, mockup: "dashboard" },
      { title: "Spring launch · landing", brief: "Hero, product grid, testimonial", hue: 30, variants: 2, mockup: "landing" },
      { title: "Mobile order flow", brief: "4 screens · empty + loaded states", hue: 210, variants: 4, mockup: "appScreen" },
    ],
  },
  koa: {
    kind: "video",
    items: [
      { title: "Ethiopia lot — 30s Reel", duration: "0:30", views: "24.1k", platform: "Reels", hue: 18, scene: "product" },
      { title: "Cupping session — Short", duration: "0:45", views: "11.4k", platform: "Shorts", hue: 140, scene: "scene" },
      { title: "Founder story — TikTok cut", duration: "0:58", views: "62.8k", platform: "TikTok", hue: 340, scene: "person" },
    ],
  },
};

const DEFAULT_PORTFOLIO: Portfolio = {
  kind: "generic",
  items: [
    { title: "Recent run — sample output", excerpt: "Shipped on first attempt. Rated 5/5 by the hiring team.", when: "recently" },
  ],
};

export function getPortfolio(agentId: string): Portfolio {
  return PORTFOLIO[agentId] ?? DEFAULT_PORTFOLIO;
}
