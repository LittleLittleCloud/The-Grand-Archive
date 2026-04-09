---
title: >-
  Show HN: Finalrun – Spec-driven testing using English and vision for mobile
  apps
source: Hacker News
source_url: 'https://hnrss.org/frontpage'
link: 'https://github.com/final-run/finalrun-agent'
author: ashish004
published: 'Tue, 07 Apr 2026 14:33:48 +0000'
fetched: '2026-04-07T17:31:59.299Z'
category: news
tags:
  - 创业
  - YC
language: ''
guid: 'https://news.ycombinator.com/item?id=47676044'
hash: 428717abc15f
read: false
starred: false
---

I wanted to test mobile apps in plain English instead of relying on brittle selectors like XPath or accessibility IDs.

With a vision-based agent, that part actually works well. It can look at the screen, understand intent, and perform actions across Android and iOS.

The bigger problem showed up around how tests are defined and maintained.

When test flows are kept outside the codebase (written manually or generated from PRDs), they quickly go out of sync with the app. Keeping them updated becomes a lot of effort, and they lose reliability over time.

I then tried generating tests directly from the codebase (via MCP). That improved sync, but introduced high token usage and slower generation.

The shift for me was realizing test generation shouldn’t be a one-off step. Tests need to live alongside the codebase so they stay in sync and have more context.

I kept the execution vision-based (no brittle selectors), but moved test generation closer to the repo.

I’ve open sourced the core pieces:

1\. generate tests from codebase context 2. YAML-based test flows 3. Vision-based execution across Android and iOS

Repo: [https://github.com/final-run/finalrun-agent](https://github.com/final-run/finalrun-agent) Demo: [https://youtu.be/rJCw3p0PHr4](https://youtu.be/rJCw3p0PHr4)

In the Demo video, you’ll see the "post-development hand-off." An AI builds a feature in an IDE, and Finalrun immediately generates and executes a vision-based test for it verifying the feature developed by AI.

* * *

Comments URL: [https://news.ycombinator.com/item?id=47676044](https://news.ycombinator.com/item?id=47676044)

Points: 13

\# Comments: 3
