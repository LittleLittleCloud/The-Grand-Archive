export default {
  // AppBar
  nav: {
    home: "首页",
    search: "搜索",
    feeds: "信息源",
    apiKeys: "API 密钥",
    signIn: "登录",
    signOut: "退出",
  },

  // Hero
  hero: {
    title1: "大案牍库",
    title2: "",
    subtitle:
      "大案牍库是一个专门为 AI Agent 设计的基于 RSS 的实时新闻数据库，目前追踪超过 20 个权威信息源，包含超过 15,000+ 条目。",
    discord: "加入 Discord",
    github: "GitHub 仓库",
    tracking: "追踪中",
  },

  // Stats
  stats: {
    totalEntries: "总条目数",
    categories: "分类",
    sources: "信息源",
    lastUpdated: "最后更新",
  },

  // Features
  features: {
    title: "核心能力",
    aiNative: "AI Skills",
    aiNativeDesc:
      "通过 AI Skills 无缝整合到你的 Agent 中，支持 Claude、Clawdbot 等主流平台，无需额外配置。",
    fullTextSearch: "全文搜索",
    fullTextSearchDesc:
      "模糊匹配 + 前缀匹配，支持分类、来源、日期等多维度过滤。",
    liveSources: "20+ 个实时来源",
    liveSourcesDesc:
      "覆盖财经、地缘政治、科技和社交热点 — 每 30 分钟更新。",
    sdk: "TypeScript SDK",
    sdkDesc: "类型化 HTTP 客户端，支持 ESM 和 CJS，一条命令安装。",
    cli: "命令行工具",
    cliDesc:
      'dak search "tariff" — 在终端中一行命令搜索和浏览。',
    tieredAccess: "分级访问",
    tieredAccessDesc:
      "匿名（28 天）、免费（90 天）、高级（无限历史和更高速率限制）。",
  },

  // Integration
  integration: {
    title: "集成方式",
  },

  // Steps
  steps: {
    title: "三步开始",
    installTitle: "安装",
    installDesc:
      "npm install @littlelittlecloud/dak — 或将 Claude Skill 添加到您的 AI 代理。",
    queryTitle: "查询",
    queryDesc:
      "通过 SDK、CLI 或 AI 代理使用自然语言进行搜索。",
    analyzeTitle: "分析",
    analyzeDesc:
      "获取结构化结果，包含来源、日期、分类和相关性评分等元数据。",
  },

  // Access Tiers
  tiers: {
    title: "访问级别",
    anonymous: "匿名",
    free: "免费",
    premium: "高级",
    days28: "28 天",
    days90: "90 天",
    unlimited: "无限制",
    ofSearchHistory: "搜索历史",
    fullArchiveAccess: "完整档案访问",
    fullTextSearch: "全文搜索",
    allCategoriesSources: "全部分类和来源",
    rateLimit10: "10 次请求 / 分钟",
    rateLimit60: "60 次请求 / 分钟",
    rateLimit120: "120 次请求 / 分钟",
    apiKeyAccess: "API 密钥访问",
    everythingInFree: "包含免费版全部功能",
    unlimitedHistory: "无限历史记录",
    dedicatedSupport: "专属支持",
    noSignUp: "无需注册",
    signInToStart: "登录即可使用",
    contactUs: "联系我们",
  },

  // Footer
  footer: {
    brand: "大案牍库",
    tagline: "THE GRAND ARCHIVE",
  },

  // Feeds
  feeds: {
    title: "信息源状态",
    subtitle: "过去 90 天内所有追踪源的实时更新状态。",
    loading: "加载中…",
    lastUpdated: "最后更新",
    dateRange: "日期范围",
    entryCount: "条目数",
    active: "活跃",
    stale: "停滞 (>2h)",
    minutesAgo: "{{n}} 分钟前",
    hoursAgo: "{{n}} 小时前",
    daysAgo: "{{n}} 天前",
    less: "少",
    more: "多",
  },
} as const;
