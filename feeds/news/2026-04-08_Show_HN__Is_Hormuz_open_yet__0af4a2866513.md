---
title: 'Show HN: Is Hormuz open yet?'
source: Hacker News
source_url: 'https://hnrss.org/frontpage'
link: 'https://www.ishormuzopenyet.com/'
author: anonfunction
published: 'Wed, 08 Apr 2026 21:33:06 +0000'
fetched: '2026-04-08T23:07:21.817Z'
category: news
tags:
  - 创业
  - YC
language: ''
guid: 'https://news.ycombinator.com/item?id=47696562'
hash: 0af4a2866513
read: false
starred: false
---

I built this because I was interested in the data. Didn't fully get it to what I wanted, but thought I'd share it nonetheless. Maybe someone has better data sources they could share!

Turns out live ship tracking APIs are expensive so I manually just copied the json from [https://www.marinetraffic.com/en/ais/home/centerx:57.4/cente...](https://www.marinetraffic.com/en/ais/home/centerx:57.4/centery:26.4/zoom:8) I'll probably have an ai agent do the same thing on some cron interval, if this gets any fanfare.

To actually know if the port is open without live ship tracking I found [https://portwatch.imf.org/pages/cb5856222a5b4105adc6ee7e880a...](https://portwatch.imf.org/pages/cb5856222a5b4105adc6ee7e880a1730) which was perfect, except it has 4 day lag!

I also thought of adding news feed parsing or prediction market data to get a more definitive answer on if it's open right when you load it, but I spent a few hours and am gonna move on for now.

* * *

Comments URL: [https://news.ycombinator.com/item?id=47696562](https://news.ycombinator.com/item?id=47696562)

Points: 131

\# Comments: 47
