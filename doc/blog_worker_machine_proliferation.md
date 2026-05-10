# 因为一行配置问题，我被 Fly.io 反薅了 $15

## 背景

我有一个 side project 叫 [大案牍库](https://dak-news.com)（dak-news.com），是一个给AI用的实时新闻聚合数据库，每小时从 30 多个信源抓取财经、地缘政治、科技等领域的新闻。然后提供一套适合AI的query API来支持新闻查询总结等应用场景， 例如

> 根据dak-news.com/AGENTS.md, 总结过去一周美伊战争最新动态

整合技术栈是 Bun + Hono + SQLite + Litestream，部署在 Fly.io 上。

架构很简单：
- **dak-server**：一台 shared-cpu-1x 512MB 的机器，跑 API 和前端，挂了一块 1GB 的 volume 存 SQLite
- **dak-worker**：一台 shared-cpu-1x 256MB 的机器，每 30 分钟抓一次 RSS，然后 POST 到 server 的 ingest 接口

为什么选择fly.io呢。有几个原因。首先是因为fly.io对运维的支持比较好，最重要的是Fly.io经常waive $5以内的账单，而整个dak news都部署在最基础的设施上，每月的账单应该远小于$5. 所以我一开始就是冲着薅fly.io的羊毛去的

## 被flyio反薅 - 4月账单：$15

今天早上打开邮箱，看到 Fly.io 的 4 月账单：compute $11，egress $5。

$16。

作为一个连 $5 都想 waive 掉的抠福，这个数字让我无法接受。更无法接受的是我打算薅一把的羊居然回头反薅了我一把。

## 拆账单

先看 compute 的构成：
- dak-server：$3.19 ✅ 正常
- dak-worker：**???**

跑了一下 `flyctl machines list -a dak-worker`——

```
16 machines have been retrieved from app dak-worker.
```

16 台？？？其中 8 台正在运行？？？

每台 $1.94/月。8 台跑满一个月就是 $15.52。虽然大部分是月底才创建的所以没跑满，但这已经足够让账单爆表了。

再看 egress $5。按 Fly.io 东京区 $0.04/GB 的出站价格算，大约是 125 GB 的出站流量。8 台 worker 每台每 30 分钟往 server 的公网地址 POST 一批新闻条目，一个月下来 8 倍的冗余流量，确实能堆到这个数。

## root cause：flyctl deploy 的默认部署策略

深入看这 16 台机器的创建时间，和 deploy 历史完美对应：

```
Apr 28 23:29 – 23:57  →  v30–v34：5 次 deploy，创建 6 台新机器
Apr 29 00:04 – 00:21  →  v35–v37：3 次 deploy，创建 4 台新机器
May 01 04:33 – 04:37  →  v39–v40：2 次 deploy，创建 2 台新机器
```

原因是 `flyctl deploy` 默认使用**蓝绿部署**策略：蓝绿部署的策略是先创建新机器，健康检查通过后再下线旧机器。但这个机制依赖 **HTTP 健康检查**。

我的 worker 是一个纯后台进程——没有 HTTP 端口、没有 `[http_service]`。Fly 无法对它做健康检查，于是新机器创建后，旧机器就**一直**留在那了。每次 deploy 都留下一对"孤儿"，而它们全都在忠实地执行 `setInterval`，每 30 分钟发起一轮完全相同的抓取和上传。

4 月底那两天我在密集调试一个 feature，一晚上部署了十几次。每次 deploy 都在悄悄给我的账单加码。

## 修复

- 保留最早创建的一台机器，把其余 15 台孤儿全部销毁。

**防复发**：

1. `fly.toml` 加 `[deploy] strategy = "immediate"`，告诉 Fly 原地更新而不是蓝绿部署
2. 部署后重新 apply `--schedule hourly`，让机器只在整点启动、跑完就关

**降本**：

原来 worker 7×24 跑着 `setInterval`，94% 的时间在发呆。改成 Fly Machine Schedule 之后，每小时启动一次，跑完（大约 1–2 分钟）就退出。Fly 按秒计费，月成本从 $1.94 → $0.07。

最终账单预估：

| | 改前 | 改后 |
|---|---|---|
| Server | $3.19 | $3.19 |
| Worker | $15.52（8 台） | $0.07（hourly schedule） |
| Egress | ~$5 | ~$0.50 |
| **合计** | **~$21** | **~$3.76** |

## 总结：Vibe Coding 的隐性技术债

dak-news 是一个彻头彻尾的 vibe coding 项目。技术栈简单，需求明确，全程 AI 辅助——从第一行代码到部署上线，体验丝滑得让人产生幻觉：这也太容易了吧。

但写代码容易不代表运维容易。代码没有 bug 不代表 infra 没有 bug。这次的问题出在 Fly.io 的部署机制和fly.toml 配置之间的一个微妙的交互——这种问题不会出现在任何教程里，AI 不会主动提醒你，你的 CI 也不会 fail。它只会安静地、忠实地，在每次 deploy 之后多创建两台机器。然后在月底的账单给你一个surprise

**复杂度不会消失，只会转移。Bug 也一样。**
**债务不会消失，只会连本带利越滚越大。技术债也一样**

Vibe coding 把软件开发的复杂度从 coding 转移到了 debugging。写代码的时候你欠下了对项目的熟悉度的债——对每一行配置的含义、每一个部署行为的副作用、每一个平台的隐式约定。只要不出事，这笔债可以无限期展期。**但它真的不会到期吗**

---

## 最后再推销一下dak-news

如果你也在关注财经、地缘政治、科技领域的实时新闻，欢迎试试 [dak-news.com](https://dak-news.com)——30+ 信源、每小时更新、全文搜索、免费 API。

**只需要对你的agent说**
> 根据dak-news.com/AGENTS.md, 总结过去一周美伊战争最新动态



