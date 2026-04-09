---
title: 'Launch HN: Relvy (YC F24) – On-call runbooks, automated'
source: Hacker News
source_url: 'https://hnrss.org/frontpage'
link: 'https://www.relvy.ai'
author: behat
published: 'Thu, 09 Apr 2026 12:11:56 +0000'
fetched: '2026-04-09T13:23:56.725Z'
category: news
tags:
  - 创业
  - YC
language: ''
guid: 'https://news.ycombinator.com/item?id=47702647'
hash: 377d085a8799
read: false
starred: false
---

Hey HN! We are Bharath, and Simranjit from Relvy AI ([https://www.relvy.ai](https://www.relvy.ai)). Relvy automates on-call runbooks for software engineering teams. It is an AI agent equipped with tools that can analyze telemetry data and code at scale, helping teams debug and resolve production issues in minutes. Here’s a video: \[\[\[[https://www.youtube.com/watch?v=BXr4\_XlWXc0](https://www.youtube.com/watch?v=BXr4_XlWXc0)\]\]\]

A lot of teams are using AI in some form to reduce their on-call burden. You may be pasting logs into Cursor, or using Claude Code with Datadog’s MCP server to help debug. What we’ve seen is that autonomous root cause analysis is a hard problem for AI. This shows up in benchmarks - Claude Opus 4.6 is currently at 36% accuracy on the OpenRCA dataset, in contrast to coding tasks.

There are three main reasons for this: (1) Telemetry data volume can drown the model in noise; (2) Data interpretation / reasoning is enterprise context dependent; (3) On-call is a time-constrained, high-stakes problem, with little room for AI to explore during investigation time. Errors that send the user down the wrong path are not easily forgiven.

At Relvy, we are tackling these problems by building specialized tools for telemetry data analysis. Our tools can detect anomalies and identify problem slices from dense time series data, do log pattern search, and reason about span trees, all without overwhelming the agent context.

Anchoring the agent around runbooks leads to less agentic exploration and more deterministic steps that reflect the most useful steps that an experienced engineer would take. That results in faster analysis, and less cognitive load on engineers to review and understand what the AI did.

How it works: Relvy is installed on a local machine via docker-compose (or via helm charts, or sign up on our cloud), connect your stack (observability and code), create your first runbook and have Relvy investigate a recent alert.

Each investigation is presented as a notebook in our web UI, with data visualizations that help engineers verify and build trust with the AI. From there on, Relvy can be configured to automatically respond to alerts from Slack

Some example runbook steps that Relvy automates: - Check so-and-so dashboard, see if the errors are isolated to a specific shard. - Check if there’s a throughput surge on the APM page, and if so, is it from a few IPs? - Check recent commits to see if anything changed for this endpoint.

You can also configure AWS CLI commands that Relvy can run to automate mitigation actions, with human approval.

A little bit about us - We did YC back in fall 2024. We started our journey experimenting with continuous log monitoring with small language models - that was too slow. We then invested deeply into solving root cause analysis effectively, and our product today is the result of about a year of work with our early customers.

Give us a try today. Happy to hear feedback, or about how you are tackling on-call burden at your company. Appreciate any comments or suggestions!

* * *

Comments URL: [https://news.ycombinator.com/item?id=47702647](https://news.ycombinator.com/item?id=47702647)

Points: 9

\# Comments: 8
