---
title: >-
  Anthropic Withholds Latest Model After It Went Rogue In Testing; Launches
  "Project Glasswing" To Secure Critical Software
source: ZeroHedge
source_url: 'https://feeds.feedburner.com/zerohedge/feed'
link: >-
  https://www.zerohedge.com/ai/anthropic-limits-access-new-ai-model-over-cyberattack-concerns
author: Tyler Durden
published: 'Wed, 08 Apr 2026 15:20:00 +0000'
fetched: '2026-04-08T16:13:48.845Z'
category: finance
tags:
  - 财经
  - 另类观点
  - 宏观
language: ''
guid: '1107106 at https://www.zerohedge.com'
hash: c851db1e316f
read: false
starred: false
---

Anthropic Withholds Latest Model After It Went Rogue In Testing; Launches "Project Glasswing" To Secure Critical Software

Still smarting from its [embarrassing source code leak,](https://www.theregister.com/2026/04/06/anthropic_code_leak_kettle_podcast/) Anthropic announced it will not release its latest frontier AI model, Mythos, to the public, saying the model is too powerful in ways that introduce elevated cybersecurity risk.

In internal testing, Anthropic said the model surfaced thousands of high‑severity “zero‑day” vulnerabilities (previously unknown flaws) across every major operating system and web browser, materially outperforming its prior flagship (CyberGym vulnerability reproduction: 83.1% vs. 66.6% for Opus 4.6).  

> _“Given the rate of AI progress, it will not be long before such capabilities proliferate, potentially beyond actors who are committed to deploying them safely.”_

A [zero-day vulnerability](https://cointelegraph.com/news/more-than-280-blockchains-at-risk-of-zero-day-exploits-warns-security-firm) is a software bug that can be exploited before anyone with the ability to fix it even knows it exists. Finding and patching them has historically required rare, expensive human expertise, but AI could change the scale and speed of detection. 

[Anthropic](https://cointelegraph.com/news/anthropic-launches-pac-ai-policy-tensions-washington) said the vulnerabilities it finds are “often subtle or difficult to detect.” Many of them are 10 or 20 years old, with the oldest found so far being a now-patched 27-year-old bug in OpenBSD — an operating system known primarily for its security, it added.  It also found a 16-year-old bug in the FFmpeg media processing library, a 17-year-old remote code execution vulnerability in the open-source FreeBSD operating system and numerous vulnerabilities in the Linux kernel.

Mythos Preview also identified several weaknesses in the world’s most popular cryptography libraries, algorithms and protocols, including TLS, AES-GCM and SSH. 

It added that web applications “contain a myriad of vulnerabilities,” ranging from cross-site scripting and SQL injection to domain-specific vulnerabilities such as cross-site request forgery, which is often used in [phishing attacks](https://cointelegraph.com/news/ai-agent-openclaw-security-risk-certik). 

[![](https://assets.zerohedge.com/s3fs-public/styles/inline_image_mobile/public/inline-images/019d6b4d-cf8d-7285-b863-2a1830a3_0.jpg?itok=YXnMupVv)](https://cms.zerohedge.com/s3/files/inline-images/019d6b4d-cf8d-7285-b863-2a1830a3_0.jpg?itok=YXnMupVv)

_Lifecycle of a zero-day exploit. Source:_ [_PhoenixNAP_](https://phoenixnap.com/blog/zero-day-exploit)

Anthropic claimed that 99% of the vulnerabilities it found have not yet been patched, “so it would be irresponsible for us to disclose details about them.

Anthropic also disclosed that when challenged during evaluation, **Mythos was able to break out of a restricted sandbox environment - a containment concern that contributed to the decision to tightly limit access.** Here are some other things Mythos did during testing, per [Axios](https://www.axios.com/2026/04/08/mythos-system-card):

*   **Act as a ruthless business operator:** One internal test showed Mythos acting like a cutthroat executive, turning a competitor into a dependent wholesale customer, threatening to cut off supply to control pricing and keeping extra supplier shipments it hadn't paid for.
*   **Hack + brag:** The model developed a multi-step exploit to break out of restricted internet access, gained broader connectivity and posted details of the exploit on obscure public websites.
*   **Hide what it's doing:** In rare cases (less than 0.001% of interactions), Mythos used a prohibited method to get an answer, then tried to "re-solve" it to avoid detection.
*   **Manipulate the judge:** When Mythos was working on a coding task graded by another AI, it watched the judge reject its submission, then attempted a prompt injection to attack the grader.

 "These capabilities are so strong that we now need to prepare for security in a very different way than we have for the past few decades," Anthropic's Logan Graham told Axios,  expressing concern over what would happen if similar AI capabilities were used by bad actors.

So rather than pursuing a broad release, Anthropic is channeling the model into [Project Glasswing](https://www.anthropic.com/glasswing), a defensive, coalition‑based effort aimed at identifying, responsibly disclosing, and patching critical software vulnerabilities before threat actors can exploit similar AI capabilities.

[![](https://assets.zerohedge.com/s3fs-public/styles/inline_image_mobile/public/inline-images/project%20glasswing.jpg?itok=U8p1xeOR)](https://cms.zerohedge.com/s3/files/inline-images/project%20glasswing.jpg?itok=U8p1xeOR)

Glasswing includes 11 named launch tech partners (_Amazon Web Services, Apple, Broadcom, Cisco, CrowdStrike, Google, JPMorgan, the Linux Foundation, Microsoft, NVIDIA, and Palo Alto Networks_...  yes JPMorgan is now viewed as a tech company) plus over 40 additional critical software organizations, and is supported by up to $100 million in usage credits and funding for open‑source security.

The initiative reflects Anthropic’s view that frontier‑AI cyber risks are systemic rather than firm‑specific, requiring coordinated action across the software ecosystem as AI accelerates vulnerability discovery and compresses response timelines.

The staggered release could be the blueprint for what future model releases look like as they get stronger and stronger: limiting access to select partners deemed secure enough to test world-bending systems.

[Tyler Durden](https://cms.zerohedge.com/users/tyler-durden "View user profile.") Wed, 04/08/2026 - 11:20
