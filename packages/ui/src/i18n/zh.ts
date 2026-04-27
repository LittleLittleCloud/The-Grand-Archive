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

  // FAQ
  faq: {
    title: "常见问题",
    q1: "大案牍库是什么？",
    a1: "大案牍库（The Grand Archive）是一个专为 AI Agent 设计的实时 RSS 新闻数据库。它持续从 20 多个权威来源抓取财经、地缘政治、科技和社交热点文章，并通过 REST API、TypeScript SDK、命令行工具或 AI Skill 提供全文检索服务。",
    q2: "追踪哪些新闻来源？",
    a2: "目前追踪超过 20 个来源，包括 Bloomberg、CNBC、MarketWatch、BBC Chinese、NYT Chinese、AP News、Al Jazeera、Foreign Affairs、Hacker News、微博热搜、知乎热榜、华尔街见闻、第一财经、财新网等，每 30 分钟更新一次。",
    q3: "大案牍库是否免费使用？",
    a3: "是的。匿名用户无需注册即可搜索最近 28 天的内容。注册免费账号后可访问 90 天历史记录并获得 API 密钥。高级套餐提供无限历史记录和更高速率限制，详情请联系我们。",
    q4: "如何搜索或查询档案库？",
    a4: "您可以直接在本站搜索，或使用 REST API（匿名访问无需密钥），也可以安装 TypeScript SDK（@littlelittlecloud/dak）或命令行工具（@littlelittlecloud/dak-cli）。AI Agent 还可以通过已发布的 AI Skill 接入。",
    q5: "我的 AI Agent 能使用大案牍库吗？",
    a5: "可以。运行 `npx skills add LittleLittleCloud/The-Grand-Archive` 即可将 DAK Skill 添加到您的 Agent，或让 Agent 参考 https://dak-news.com/AGENTS.md 中的接入说明。支持 Claude、Clawdbot 等所有兼容 Skills 协议的 Agent。",
    q6: "免费版和高级版有什么区别？",
    a6: "免费版（需注册）可访问 90 天历史记录，API 速率限制为每分钟 60 次。高级版提供无限历史记录、每分钟最多 120 次请求以及专属支持。匿名访问限 28 天历史，速率上限为每分钟 10 次。",
  },

  // Footer
  footer: {
    brand: "大案牍库",
    tagline: "THE GRAND ARCHIVE",
  },

  // Search
  search: {
    placeholder: "搜索条目…",
    button: "搜索",
    showAdvanced: "高级搜索",
    hideAdvanced: "收起高级搜索",
    category: "分类",
    allCategories: "全部分类",
    source: "来源",
    sourcePlaceholder: "例如 Bloomberg、CNBC",
    from: "起始日期",
    to: "截止日期",
    clearFilters: "清除筛选",
    resultsFor: "条结果，关键词",
    sortBy: "排序",
    sortRelevance: "相关度",
    sortNewest: "最新优先",
    sortOldest: "最早优先",
    sortTitle: "标题 A–Z",
    tierNotice: "显示 {{date}} 之后的结果（{{tier}} 级别）",
    prev: "上一页",
    next: "下一页",
  },

  // Entry
  entry: {
    loading: "加载中…",
    back: "返回",
    noContent: "该条目暂无正文内容。",
    viewOriginal: "查看原文",
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
