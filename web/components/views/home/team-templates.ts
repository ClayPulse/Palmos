// Curated team templates rendered on the Explore home page and the
// My hires Teams tab. Each template is a one-click way to create an
// AgentTeam pre-populated with a relevant roster + lead. Slugs match
// the seeded marketplace agents (lib/agents/agent-listings.ts).

export interface TeamTemplate {
  slug: string;
  name: string;
  goal: string;
  icon: string;
  hue: number;
  agents: string[];
  /** Slug of the agent that gets the "lead" role on creation. */
  lead: string;
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    slug: "inbox-zero",
    name: "Inbox Zero",
    goal: "Triage email, defragment the calendar, and keep Slack running.",
    icon: "all_inbox",
    hue: 240,
    agents: ["iris", "theo", "zara"],
    lead: "iris",
  },
  {
    slug: "growth-ops",
    name: "Growth Ops",
    goal: "Outbound, ad creative, and email — top-of-funnel running on autopilot.",
    icon: "trending_up",
    hue: 30,
    agents: ["vale", "neon", "ember", "flux"],
    lead: "vale",
  },
  {
    slug: "content-engine",
    name: "Content Engine",
    goal: "Long-form articles, SEO briefs, social posts, and a weekly newsletter.",
    icon: "edit_note",
    hue: 160,
    agents: ["lyra", "sage", "quinn", "juno"],
    lead: "lyra",
  },
  {
    slug: "customer-care",
    name: "Customer Care",
    goal: "Answer Tier-1 tickets, build the help center, and escalate the rest.",
    icon: "support_agent",
    hue: 130,
    agents: ["reed", "cleo", "dash"],
    lead: "reed",
  },
  {
    slug: "sales-pipeline",
    name: "Sales Pipeline",
    goal: "Outbound research, CRM hygiene, custom proposals, and demo prep.",
    icon: "handshake",
    hue: 290,
    agents: ["vale", "raven", "slate", "finn"],
    lead: "vale",
  },
  {
    slug: "engineering",
    name: "Engineering",
    goal: "Ship features PR-ready: full-stack code, reviews, QA, and infra.",
    icon: "code",
    hue: 260,
    agents: ["axon", "rust", "bug", "hex"],
    lead: "axon",
  },
  {
    slug: "brand-and-design",
    name: "Brand & Design",
    goal: "On-brand UI, landing pages, icons, and presentation decks.",
    icon: "palette",
    hue: 340,
    agents: ["mira", "frame", "tint", "halo"],
    lead: "mira",
  },
  {
    slug: "data-team",
    name: "Data Team",
    goal: "SQL, dashboards, and ETL pipelines — answer data questions fast.",
    icon: "query_stats",
    hue: 215,
    agents: ["sigma", "orbit", "prism"],
    lead: "sigma",
  },
];
