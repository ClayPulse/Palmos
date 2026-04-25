// Fallback agent data used when the API is unavailable or hasn't been seeded yet.
// This is the same data as lib/agents/agent-listings.ts in the backend,
// mapped to the frontend Agent type.

export type SkillRef = {
  source: "anthropic" | "clawhub";
  id: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  cat: string;
  rating: number;
  reviews: number;
  price: number;
  turnaround: string;
  used: string;
  tools: string[];
  tagline: string;
  hue: number;
  avatar: string;
  // Persona-focused system prompt for the worker agent backend. Optional on
  // the frontend type — the actual content lives in the backend's
  // AgentListing.systemPrompt, which the worker stream route reads. This
  // field exists here only so API responses can be passed through cleanly
  // when the listings API includes it.
  systemPrompt?: string;
  defaultSkills?: SkillRef[];
  defaultWorkflowSlugs?: string[];
};

export const FALLBACK_AGENTS: Agent[] = [
  { id: "iris", name: "Iris", role: "Email triage specialist", cat: "automation", rating: 4.9, reviews: 1247, price: 9, turnaround: "~3 min", used: "4.2k teams", tools: ["Gmail", "Slack", "Notion"], tagline: "Classifies inbox, drafts replies, escalates urgent.", hue: 240, avatar: "https://mockmind-api.uifaces.co/content/human/49.jpg" },
  { id: "kai", name: "Kai", role: "Invoice & AR agent", cat: "automation", rating: 4.8, reviews: 843, price: 19, turnaround: "~12 min", used: "1.8k teams", tools: ["Stripe", "QuickBooks", "Gmail"], tagline: "Chases overdue invoices and reconciles payments.", hue: 30, avatar: "https://mockmind-api.uifaces.co/content/human/103.jpg" },
  { id: "nova", name: "Nova", role: "Brand image generator", cat: "aigc", rating: 4.7, reviews: 2104, price: 15, turnaround: "~2 min", used: "6.1k teams", tools: ["Figma", "S3", "Webflow"], tagline: "On-brand hero images, product shots, social cards.", hue: 310, avatar: "https://mockmind-api.uifaces.co/content/human/68.jpg" },
  { id: "lyra", name: "Lyra", role: "Long-form writer", cat: "content", rating: 4.9, reviews: 3281, price: 12, turnaround: "~8 min", used: "9.4k teams", tools: ["Docs", "WordPress", "Ghost"], tagline: "Blog posts, landing copy, technical deep-dives.", hue: 160, avatar: "https://mockmind-api.uifaces.co/content/human/181.jpg" },
  { id: "ember", name: "Ember", role: "Ad campaign manager", cat: "marketing", rating: 4.6, reviews: 612, price: 29, turnaround: "~15 min", used: "740 teams", tools: ["Meta Ads", "GA4", "Sheets"], tagline: "Spins up, tests, and rotates ad creative daily.", hue: 0, avatar: "https://mockmind-api.uifaces.co/content/human/156.jpg" },
  { id: "atlas", name: "Atlas", role: "Deep researcher", cat: "research", rating: 4.8, reviews: 987, price: 22, turnaround: "~20 min", used: "1.1k teams", tools: ["Web", "PDF", "Notion"], tagline: "Multi-source briefs with citations and ranking.", hue: 210, avatar: "https://mockmind-api.uifaces.co/content/human/87.jpg" },
  { id: "orbit", name: "Orbit", role: "Dashboard builder", cat: "data", rating: 4.7, reviews: 445, price: 18, turnaround: "~10 min", used: "520 teams", tools: ["Snowflake", "Metabase", "GA4"], tagline: "Ships live dashboards from plain-English questions.", hue: 190, avatar: "https://mockmind-api.uifaces.co/content/human/200.jpg" },
  { id: "reed", name: "Reed", role: "Tier-1 support agent", cat: "support", rating: 4.9, reviews: 1892, price: 14, turnaround: "~1 min", used: "3.6k teams", tools: ["Intercom", "Zendesk", "Slack"], tagline: "Answers 80% of tickets; routes the rest.", hue: 130, avatar: "https://mockmind-api.uifaces.co/content/human/134.jpg" },
  { id: "vale", name: "Vale", role: "Outbound SDR", cat: "sales", rating: 4.5, reviews: 318, price: 24, turnaround: "~6 min", used: "410 teams", tools: ["HubSpot", "Apollo", "Gmail"], tagline: "Researches leads and sends personalized first touches.", hue: 290, avatar: "https://mockmind-api.uifaces.co/content/human/42.jpg" },
  { id: "axon", name: "Axon", role: "Full-stack coder", cat: "coding", rating: 4.8, reviews: 2712, price: 25, turnaround: "~18 min", used: "5.2k teams", tools: ["GitHub", "Vercel", "Supabase"], tagline: "Ships features PR-ready, with tests and preview.", hue: 260, avatar: "https://mockmind-api.uifaces.co/content/human/217.jpg" },
  { id: "mira", name: "Mira", role: "UI & brand designer", cat: "design", rating: 4.7, reviews: 604, price: 20, turnaround: "~14 min", used: "680 teams", tools: ["Figma", "Webflow", "S3"], tagline: "Produces on-brand screens, components, and systems.", hue: 340, avatar: "https://mockmind-api.uifaces.co/content/human/29.jpg" },
  { id: "koa", name: "Koa", role: "Short-form video editor", cat: "aigc", rating: 4.6, reviews: 1130, price: 17, turnaround: "~9 min", used: "2.3k teams", tools: ["Descript", "YouTube", "Drive"], tagline: "Cuts raw footage into TikToks, Reels, Shorts.", hue: 50, avatar: "https://mockmind-api.uifaces.co/content/human/192.jpg" },
  { id: "zara", name: "Zara", role: "Slack workflow bot", cat: "automation", rating: 4.7, reviews: 931, price: 11, turnaround: "~2 min", used: "2.9k teams", tools: ["Slack", "Jira", "Linear"], tagline: "Routes standup updates, nudges blockers, syncs status.", hue: 220, avatar: "https://mockmind-api.uifaces.co/content/human/55.jpg" },
  { id: "theo", name: "Theo", role: "Calendar optimizer", cat: "automation", rating: 4.6, reviews: 487, price: 8, turnaround: "~1 min", used: "1.3k teams", tools: ["Google Calendar", "Zoom", "Slack"], tagline: "Defragments your week and auto-declines low-value meetings.", hue: 175, avatar: "https://mockmind-api.uifaces.co/content/human/120.jpg" },
  { id: "pax", name: "Pax", role: "Data entry automator", cat: "automation", rating: 4.8, reviews: 672, price: 7, turnaround: "~4 min", used: "980 teams", tools: ["Sheets", "Airtable", "Zapier"], tagline: "Reads PDFs, receipts, and forms — fills your spreadsheets.", hue: 95, avatar: "https://mockmind-api.uifaces.co/content/human/78.jpg" },
  { id: "lux", name: "Lux", role: "Voice-over artist", cat: "aigc", rating: 4.5, reviews: 814, price: 13, turnaround: "~5 min", used: "1.7k teams", tools: ["ElevenLabs", "Drive", "Notion"], tagline: "Studio-quality narration from a script in any language.", hue: 280, avatar: "https://mockmind-api.uifaces.co/content/human/61.jpg" },
  { id: "pixel", name: "Pixel", role: "Product mockup creator", cat: "aigc", rating: 4.7, reviews: 1456, price: 16, turnaround: "~3 min", used: "3.8k teams", tools: ["Midjourney", "Figma", "S3"], tagline: "Photorealistic product mockups from a text brief.", hue: 350, avatar: "https://mockmind-api.uifaces.co/content/human/145.jpg" },
  { id: "sage", name: "Sage", role: "SEO content strategist", cat: "content", rating: 4.8, reviews: 2034, price: 18, turnaround: "~12 min", used: "4.6k teams", tools: ["Ahrefs", "WordPress", "Docs"], tagline: "Keyword clusters, briefs, and fully optimized articles.", hue: 145, avatar: "https://mockmind-api.uifaces.co/content/human/38.jpg" },
  { id: "quinn", name: "Quinn", role: "Social media writer", cat: "content", rating: 4.6, reviews: 1780, price: 8, turnaround: "~3 min", used: "5.1k teams", tools: ["Buffer", "Canva", "Notion"], tagline: "Platform-native posts, threads, and carousel copy.", hue: 25, avatar: "https://mockmind-api.uifaces.co/content/human/170.jpg" },
  { id: "juno", name: "Juno", role: "Newsletter editor", cat: "content", rating: 4.7, reviews: 923, price: 14, turnaround: "~10 min", used: "1.4k teams", tools: ["Mailchimp", "Substack", "Docs"], tagline: "Weekly roundups and drip sequences that actually get opened.", hue: 200, avatar: "https://mockmind-api.uifaces.co/content/human/210.jpg" },
  { id: "blaze", name: "Blaze", role: "SEO audit specialist", cat: "marketing", rating: 4.7, reviews: 534, price: 22, turnaround: "~18 min", used: "620 teams", tools: ["Ahrefs", "Screaming Frog", "Sheets"], tagline: "Technical audits with prioritized fix-it lists.", hue: 15, avatar: "https://mockmind-api.uifaces.co/content/human/99.jpg" },
  { id: "neon", name: "Neon", role: "Influencer outreach agent", cat: "marketing", rating: 4.5, reviews: 389, price: 20, turnaround: "~14 min", used: "310 teams", tools: ["Instagram", "Gmail", "Sheets"], tagline: "Finds, vets, and pitches micro-influencers at scale.", hue: 330, avatar: "https://mockmind-api.uifaces.co/content/human/18.jpg" },
  { id: "flux", name: "Flux", role: "Email marketing optimizer", cat: "marketing", rating: 4.8, reviews: 721, price: 15, turnaround: "~8 min", used: "890 teams", tools: ["Mailchimp", "Klaviyo", "GA4"], tagline: "A/B tests subjects, optimizes sends, cleans lists.", hue: 60, avatar: "https://mockmind-api.uifaces.co/content/human/205.jpg" },
  { id: "scout", name: "Scout", role: "Competitive intel analyst", cat: "research", rating: 4.7, reviews: 643, price: 26, turnaround: "~25 min", used: "780 teams", tools: ["Web", "Crunchbase", "Notion"], tagline: "Tracks competitor moves, pricing changes, and launches.", hue: 185, avatar: "https://mockmind-api.uifaces.co/content/human/130.jpg" },
  { id: "delphi", name: "Delphi", role: "Market research agent", cat: "research", rating: 4.6, reviews: 412, price: 30, turnaround: "~30 min", used: "390 teams", tools: ["Statista", "PDF", "Sheets"], tagline: "TAM/SAM/SOM sizing with sourced data tables.", hue: 250, avatar: "https://mockmind-api.uifaces.co/content/human/72.jpg" },
  { id: "sigma", name: "Sigma", role: "SQL query generator", cat: "data", rating: 4.8, reviews: 1102, price: 12, turnaround: "~4 min", used: "2.1k teams", tools: ["PostgreSQL", "BigQuery", "Sheets"], tagline: "Plain-English to production SQL with explanations.", hue: 215, avatar: "https://mockmind-api.uifaces.co/content/human/108.jpg" },
  { id: "prism", name: "Prism", role: "Data pipeline builder", cat: "data", rating: 4.6, reviews: 367, price: 28, turnaround: "~22 min", used: "430 teams", tools: ["Airflow", "dbt", "Snowflake"], tagline: "ETL pipelines from scratch, tested and documented.", hue: 170, avatar: "https://mockmind-api.uifaces.co/content/human/88.jpg" },
  { id: "cleo", name: "Cleo", role: "Knowledge base builder", cat: "support", rating: 4.7, reviews: 589, price: 16, turnaround: "~15 min", used: "710 teams", tools: ["Notion", "Zendesk", "Confluence"], tagline: "Turns support tickets into searchable help articles.", hue: 110, avatar: "https://mockmind-api.uifaces.co/content/human/25.jpg" },
  { id: "dash", name: "Dash", role: "Escalation triage bot", cat: "support", rating: 4.8, reviews: 1204, price: 10, turnaround: "~2 min", used: "2.4k teams", tools: ["Intercom", "Slack", "PagerDuty"], tagline: "Classifies severity, routes to the right team, pages on-call.", hue: 40, avatar: "https://mockmind-api.uifaces.co/content/human/160.jpg" },
  { id: "raven", name: "Raven", role: "CRM hygiene agent", cat: "sales", rating: 4.6, reviews: 478, price: 15, turnaround: "~8 min", used: "560 teams", tools: ["Salesforce", "HubSpot", "Clearbit"], tagline: "Dedupes contacts, enriches fields, flags stale deals.", hue: 300, avatar: "https://mockmind-api.uifaces.co/content/human/115.jpg" },
  { id: "slate", name: "Slate", role: "Proposal writer", cat: "sales", rating: 4.7, reviews: 356, price: 22, turnaround: "~16 min", used: "420 teams", tools: ["Docs", "PandaDoc", "HubSpot"], tagline: "Custom proposals with ROI calcs from deal context.", hue: 230, avatar: "https://mockmind-api.uifaces.co/content/human/52.jpg" },
  { id: "finn", name: "Finn", role: "Demo prep assistant", cat: "sales", rating: 4.5, reviews: 287, price: 18, turnaround: "~10 min", used: "340 teams", tools: ["LinkedIn", "Notion", "Slack"], tagline: "Pre-call briefs with prospect research and talking points.", hue: 80, avatar: "https://mockmind-api.uifaces.co/content/human/185.jpg" },
  { id: "forge", name: "Forge", role: "API integration builder", cat: "coding", rating: 4.8, reviews: 1891, price: 28, turnaround: "~20 min", used: "3.1k teams", tools: ["GitHub", "Postman", "Vercel"], tagline: "Connects any two APIs with auth, retries, and tests.", hue: 270, avatar: "https://mockmind-api.uifaces.co/content/human/95.jpg" },
  { id: "bug", name: "Bug", role: "Automated QA tester", cat: "coding", rating: 4.7, reviews: 1456, price: 20, turnaround: "~12 min", used: "2.6k teams", tools: ["Playwright", "GitHub", "Slack"], tagline: "Writes E2E tests, runs them in CI, reports failures.", hue: 5, avatar: "https://mockmind-api.uifaces.co/content/human/140.jpg" },
  { id: "hex", name: "Hex", role: "DevOps & infra agent", cat: "coding", rating: 4.6, reviews: 823, price: 30, turnaround: "~25 min", used: "1.2k teams", tools: ["Terraform", "AWS", "GitHub Actions"], tagline: "Provisions infra, writes IaC, fixes deploy failures.", hue: 150, avatar: "https://mockmind-api.uifaces.co/content/human/63.jpg" },
  { id: "rust", name: "Rust", role: "Code reviewer", cat: "coding", rating: 4.9, reviews: 2341, price: 15, turnaround: "~7 min", used: "4.8k teams", tools: ["GitHub", "SonarQube", "Slack"], tagline: "Line-by-line PR reviews with security and perf callouts.", hue: 120, avatar: "https://mockmind-api.uifaces.co/content/human/175.jpg" },
  { id: "halo", name: "Halo", role: "Presentation designer", cat: "design", rating: 4.7, reviews: 892, price: 18, turnaround: "~12 min", used: "1.5k teams", tools: ["Figma", "Google Slides", "Canva"], tagline: "Investor decks, sales decks, and internal presentations.", hue: 320, avatar: "https://mockmind-api.uifaces.co/content/human/35.jpg" },
  { id: "tint", name: "Tint", role: "Icon & illustration artist", cat: "design", rating: 4.6, reviews: 534, price: 14, turnaround: "~8 min", used: "620 teams", tools: ["Figma", "Illustrator", "S3"], tagline: "Custom icon sets and spot illustrations in your brand style.", hue: 45, avatar: "https://mockmind-api.uifaces.co/content/human/150.jpg" },
  { id: "frame", name: "Frame", role: "Landing page designer", cat: "design", rating: 4.8, reviews: 1123, price: 24, turnaround: "~16 min", used: "1.9k teams", tools: ["Figma", "Webflow", "Framer"], tagline: "High-converting landing pages from a product brief.", hue: 195, avatar: "https://mockmind-api.uifaces.co/content/human/220.jpg" },
];
