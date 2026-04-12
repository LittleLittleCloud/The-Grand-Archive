export default {
  // AppBar
  nav: {
    home: "Home",
    search: "Search",
    feeds: "Feeds",
    apiKeys: "API Keys",
    signIn: "Sign in",
    signOut: "Sign out",
  },

  // Hero
  hero: {
    title1: "The Grand Archive",
    title2: "",
    subtitle:
      "The Grand Archive is a real-time RSS-based news database designed for AI agents. Tracking 20+ authoritative sources with 15,000+ entries.",
    discord: "Join Discord",
    github: "View on GitHub",
    tracking: "Tracking",
  },

  // Stats
  stats: {
    totalEntries: "Total Entries",
    categories: "Categories",
    sources: "Sources",
    lastUpdated: "Last Updated",
  },

  // Features
  features: {
    title: "Capabilities",
    aiNative: "AI-Native",
    aiNativeDesc:
      "Claude Skills built in. Your agent searches, filters, and summarizes without extra setup.",
    fullTextSearch: "Full-Text Search",
    fullTextSearchDesc:
      "Fuzzy + prefix matching across every entry. Multi-dimensional filters by category, source, and date.",
    liveSources: "20+ Live Sources",
    liveSourcesDesc:
      "Finance, geopolitics, tech, and social trending — updated every 30 minutes.",
    sdk: "TypeScript SDK",
    sdkDesc: "Typed HTTP client. Supports ESM and CJS. One npm install away.",
    cli: "CLI Tool",
    cliDesc:
      'dak search "tariff" — one-liner searches and feed browsing from your terminal.',
    tieredAccess: "Tiered Access",
    tieredAccessDesc:
      "Anonymous (28 days), Free (90 days), Premium (unlimited history and higher rate limits).",
  },

  // Integration
  integration: {
    title: "Integration",
  },

  // Steps
  steps: {
    title: "Three Steps",
    installTitle: "Install",
    installDesc:
      "npm install @littlelittlecloud/dak — or add the Claude Skill to your AI agent.",
    queryTitle: "Query",
    queryDesc:
      "Search with the SDK, CLI, or natural language through your AI agent.",
    analyzeTitle: "Analyze",
    analyzeDesc:
      "Get structured results with metadata — source, date, category, relevance score.",
  },

  // Access Tiers
  tiers: {
    title: "Access Tiers",
    anonymous: "Anonymous",
    free: "Free",
    premium: "Premium",
    days28: "28 days",
    days90: "90 days",
    unlimited: "Unlimited",
    ofSearchHistory: "of search history",
    fullArchiveAccess: "full archive access",
    fullTextSearch: "Full-text search",
    allCategoriesSources: "All categories & sources",
    rateLimit10: "10 requests / min",
    rateLimit60: "60 requests / min",
    rateLimit120: "120 requests / min",
    apiKeyAccess: "API key access",
    everythingInFree: "Everything in Free",
    unlimitedHistory: "Unlimited history",
    dedicatedSupport: "Dedicated support",
    noSignUp: "No sign-up required",
    signInToStart: "Sign in to get started",
    contactUs: "Contact us",
  },

  // Footer
  footer: {
    brand: "THE GRAND ARCHIVE",
    tagline: "THE GRAND ARCHIVE",
  },

  // Feeds
  feeds: {
    title: "Feed Status",
    subtitle: "Live update status for all tracked sources over the past 90 days.",
    loading: "Loading feed status…",
    lastUpdated: "Last Updated",
    dateRange: "Date Range",
    entryCount: "Entries",
    active: "Active",
    stale: "Stale (>2h)",
    minutesAgo: "{{n}}m ago",
    hoursAgo: "{{n}}h ago",
    daysAgo: "{{n}}d ago",
    less: "Less",
    more: "More",
  },
} as const;
