---
title: 太强了不敢公开！Anthropic推出“神话”新模型，暂时仅限科技巨头试用
source: 华尔街见闻
source_url: '{{RSSHUB_BASE_URL}}/wallstreetcn/news/global'
link: 'https://wallstreetcn.com/articles/3769434'
author: ''
published: 'Wed, 08 Apr 2026 00:16:21 GMT'
fetched: '2026-04-08T07:59:15.703Z'
category: finance
tags:
  - 财经
  - 全球市场
language: ''
guid: '3769434'
hash: 6abd0e5f0e20
read: false
starred: false
---

Anthropic正将一款尚未公开发布的顶级AI模型武装给全球最重要的科技企业，以应对AI驱动的网络安全威胁。

4月7日周二，**Anthropic宣布成立名为"Project Glasswing"的行业联合项目，联合亚马逊、苹果、微软、思科等公司提供工具，将旗下新一代前沿模型Claude Mythos Preview用于关键软件基础设施的漏洞扫描与修复。**

**![](https://wpimg-wscn.awtmt.com/e56aa9b6-e806-4fbb-9d0e-6586264ad6c4.png)**

**Anthropic表示，正是由于这一模型能力过于强大，目前暂无向公众开放的计划。在这一背景下，Project Glasswing被定位为先发防御行动，在同等能力向更广泛行为者扩散之前，优先将其用于防御目的。**

随着AI模型在漏洞发现和利用方面的能力快速提升，安全社区对攻防窗口期急剧压缩的担忧日益加剧。Anthropic前沿安全负责人Logan Graham表示：

> 我们认为这不仅仅是Anthropic的问题，这是一个行业性问题，无论是私营企业还是政府都需要正视。我们通过Glasswing所做的，就是让防御者获得先手优势。

**与此同时据The Information报道，Anthropic年化营收已突破300亿美元，若当前增速延续，Anthropic最快三个月内可触及年化营收1000亿美元。**

上述两项进展共同指向同一信号：Anthropic在商业化和技术能力两个维度上的扩张均在提速，而这也给竞争对手、投资者和整个AI产业带来深远影响。

## Mythos Preview：发现数千零日漏洞，能力远超前代模型

Claude Mythos Preview的网络安全能力，建立在其强大的自主编码与推理能力之上。

在代码基准测试SWE-bench Verified上，Mythos Preview得分达93.9%，同期Claude Opus 4.6为80.8%。

![](https://wpimg-wscn.awtmt.com/ab47b809-0a9e-4d51-bd87-6ba69ea8d81f.png)

在专项网络安全基准CyberGym上，Mythos Preview得分83.1%，Opus 4.6为66.6%。

![](https://wpimg-wscn.awtmt.com/a17dacd1-c7d1-4e8d-95ee-66cdd14f2a02.png)

AI代理搜索与计算机使用方面，Mythos模型预览版本也领先Opus4.6。

![](https://wpimg-wscn.awtmt.com/b4d79aa8-839f-4b1c-937d-86750ae1dbd5.png)

实战结果更为直接。Anthropic披露的三个具体案例中：

> *   **其一，**Mythos Preview发现了OpenBSD中一个存在27年的远程崩溃漏洞。OpenBSD以安全性著称，被广泛用于运行防火墙等关键基础设施。
>     
> *   **其二，**模型在FFmpeg中发现了一个16年前埋下的漏洞，而定位该漏洞的那行代码此前已被自动化测试工具扫描逾500万次，从未触发警报。
>     
> *   **其三，**模型在Linux内核中自主发现并串联多个漏洞，构建出从普通用户权限提升至完全控制机器的完整攻击链。
>     

上述漏洞已全部向相关软件维护方披露并完成修复。值得关注的是，这些漏洞中的部分案例，已历经数十年人工审查和数百万次自动化安全测试而始终未被发现。

**据Anthropic的Graham透露，以每发现一个漏洞的美元成本衡量，Mythos Preview的效率约为前代AI模型的10倍。**

## Glasswing项目，让防御者抢先一步

Glasswing项目的核心逻辑是在强大AI模型更广泛推广之前，提前识别和弥补潜在的网络安全漏洞。

12家合作伙伴涵盖云计算、终端安全、芯片设计、金融基础设施和开源社区等核心领域。参与企业将利用Mythos模型主动挖掘自身产品缺陷，并将研究成果在行业内部共享。

**亚马逊**AWS副总裁兼首席信息安全官Amy Herzog表示，AWS每天分析逾400万亿次网络流量，已将Mythos Preview应用于关键代码库的安全强化工作。

**微软**网络安全执行副总裁Igor Tsyganskiy称，该模型在微软开源安全基准CTI-REALM上的表现"较前代模型有实质性提升"。

**CrowdStrike**首席技术官Elia Zaitsev指出了这一计划的紧迫逻辑：

> 漏洞从被发现到被攻击者利用的窗口已经崩塌。过去需要数月的事情，如今借助AI可以在数分钟内完成。

**摩根大通**首席信息安全官Pat Opet则表示，该行将以"严格、独立的方式"评估这一工具在金融关键基础设施防御中的应用价值。

**开源社区的参与同样受到重点关注。**Linux基金会CEO Jim Zemlin表示，开源软件构成了现代系统中绝大多数的代码，包括AI智能体用于编写新软件的基础设施本身，而开源维护者长期以来在安全资源上处于严重匮乏的状态。

**Project Glasswing通过向40余家开源及关键基础设施机构提供模型访问权限，试图弥补这一缺口。**

**Anthropic为Project Glasswing设定了明确的信息共享机制。**各合作伙伴将尽可能互通信息和最佳实践；Anthropic承诺在90天内发布公开报告，披露已发现的漏洞数量、修复情况及可公开的改进成果。

**在政策层面**，Anthropic计划与主要安全机构合作，就漏洞披露流程、软件更新流程、开源与供应链安全、安全软件开发生命周期、补丁自动化等方向形成实践建议。Anthropic同时提出，从中期看，由私营和公共部门共同组成的独立第三方机构，或许是推动大规模网络安全协作的理想载体。

**Anthropic坦承，Project Glasswing仅是一个起点。**没有任何单一机构能够独立解决这些挑战，而AI前沿能力在未来数月内仍将快速演进。该公司表示：

> 防御者若想占据上风，必须立即行动。

## 模型不对外开放，防御路径分阶段推进

**尽管Mythos Preview能力强大，Anthropic明确表示目前无意将其向公众开放。**其最终目标是开发出足够可靠的安全防护机制，使同等能力级别的模型能够安全部署。

为此，Anthropic计划首先在即将推出的Claude Opus新版本上验证和迭代相关安全措施，在风险可控的条件下完成防护机制的打磨，再逐步推进更高能力模型的开放。

**研究预览期结束后，Claude Mythos Preview将向计划参与方提供商业访问，定价为每百万输入/输出token 25/125美元，可通过Claude API、Amazon Bedrock、Google Cloud Vertex AI及Microsoft Foundry接入。**

在资金层面，Anthropic通过Linux基金会向Alpha-Omega和OpenSSF捐赠250万美元，向Apache软件基金会捐赠150万美元。

Anthropic还表示，已就Mythos Preview的攻防能力与美国政府官员展开持续沟通，认为维护民主国家在AI领域的决定性领先优势，是当前重要的国家安全优先事项。

## 年化营收突破300亿美元，增速令OpenAI承压

Anthropic正以令竞争对手难以追赶的速度扩张。

据The Information报道，Anthropic年化营收在约一个月内从190亿美元跃升至逾300亿美元，较去年年底水平增长逾三倍。这一增速意味着该公司已超越其去年12月设定的320亿美元年底目标，且提前约八个月完成。

这一水平已超越OpenAI。此前报道称OpenAI年化营收在今年2月底达到约250亿美元。据报道援引知情人士透露，即使考虑两家公司在云合作伙伴销售收入上的会计处理差异，上述差距依然成立。

**具体而言，OpenAI通过Microsoft Azure销售模型时，仅将20%的销售额计入收入；而Anthropic将通过Amazon Web Services、微软及谷歌销售Claude所获得的全部收入纳入统计。**

**这一差异使OpenAI的收入数字看起来相对偏低。但据上述知情人士估算，即便OpenAI采用与Anthropic相同的会计口径，其年化营收也仅能提升数十亿美元，不足以弥补当前差距。**

强劲的营收增势也为Anthropic的IPO预期提供了支撑。该公司在去年12月预计将于2028年实现现金流转正，较OpenAI的同类预测早两年。

若收入保持当前增速，现金流正转时间或进一步提前。此前华尔街见闻提及，Anthropic最早可能于今年第四季度寻求上市。

不过，The Information的报道也指出若干制约因素：

> *   **其一**是算力瓶颈：Anthropic刚刚与Broadcom和谷歌签署协议，将于2027年起获得多吉瓦级服务器容量，并计划在未来数年内布局至少10吉瓦的算力；
>     
> *   **其二**是利润率压力：去年Anthropic毛利率较原先预期低约10个百分点，核心原因是营收高速增长拉动推理成本大幅上升；
>     
> *   **其三**是增速的可持续性：业界普遍认为，当前的指数级增长处于S曲线的前期阶段，市场饱和与竞争加剧最终将令增速收敛。
>     

风险提示及免责条款

市场有风险，投资需谨慎。本文不构成个人投资建议，也未考虑到个别用户特殊的投资目标、财务状况或需要。用户应考虑本文中的任何意见、观点或结论是否符合其特定状况。据此投资，责任自负。
