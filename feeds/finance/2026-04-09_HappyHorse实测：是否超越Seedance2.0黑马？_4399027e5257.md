---
title: HappyHorse实测：是否超越Seedance2.0黑马？
source: 华尔街见闻
source_url: '{{RSSHUB_BASE_URL}}/wallstreetcn/news/global'
link: 'https://wallstreetcn.com/articles/3769590'
author: 国联民生证券吕伟等
published: 'Thu, 09 Apr 2026 12:24:00 GMT'
fetched: '2026-04-09T15:07:41.069Z'
category: finance
tags:
  - 财经
  - 全球市场
language: ''
guid: '3769590'
hash: '4399027e5257'
read: false
starred: false
---

近期在AI视频圈突然冒出来的一匹“黑马”模型——HappyHorse。从Artificial Analysis的最新榜单看，这匹小马目前的成绩非常亮眼：

1）在**Text-to-Video（无音频）** 榜单中，HappyHorse-1.0 以 1374 Elo 排名第 1；在 Text-to-Video（含音频） 榜单中，HappyHorse-1.0 以 1222 Elo 位居第 1，与 Dreamina Seedance 2.0 720p 并列第一。 

2）在**Image-to-Video（无音频）** 榜单中，HappyHorse-1.0 以 1410 Elo 排名第 1；在 Image-to-Video（含音频） 榜单中，HappyHorse-1.0 以 1159 Elo 位列第 2，与 Seedance 2.0 720p 实际上同分，仅因展示顺序排在其后。 

从其项目主页的自述看，该模型由Happy Horse团队于2026年初推出，定位为一款**15B参数的统一Transformer视频生成模型**，支持从**文本或图片提示**联合生成**视频与同步音频**，输出规格主打**1080p**，并支持**7种语言的口型同步**。项目主页同时声称，其模型、蒸馏版、超分模块和推理代码均可商用部署。

但需要友情提示，Artificial Analysis的分数本质上是**Video Arena盲测 Elo**：用户在不知道模型名称的情况下，对同一提示词生成的视频进行偏好投票，分高意味着综合观感更容易被人“选中”，而不是单一维度上绝对碾压。也就是说，这个分数更像是**人类综合偏好分**，不是严格意义上的“物理模拟分”或“镜头语言分”。 

## **一、怎么解读得分？**

**1\. HappyHorse 的强项更偏“成片感”**

如果只看 Artificial Analysis 的盲测偏好结果，HappyHorse 已经证明自己至少具备三个明显优势：

_第一，静态画面质感强。  
_无论是文生视频还是图生视频，HappyHorse在无音频赛道都拿到了榜首，这通常意味着它在用户第一眼最容易感知的指标上——如画面精致度、材质细节、光影氛围、整体观感——表现很强。 

_第二，提示词遵循度大概率不弱。_  
项目主页自述其基于2,000 组人工评测，在visual quality、prompt alignment、physical realism上领先若干开源对手；虽然这部分属于项目方自报数据，不能完全等同于第三方权威基准，但结合Artificial Analysis的盲测领先，至少可以说明这批“黑马”不是“只会出好看图”，而是“在大多数用户眼里，好看且合理”。 

_第三，音频能力不是短板。_  
HappyHorse在含音频榜单里仍保持第一梯队，且明确支持**视频与同步音频联合生成**，并支持多语言lip-sync。 

**2\. 高分却不等于全能：与Seedance的差距，不在“好不好看”，而在“能不能导”**

_这是当下怎么理解HappyHorse的关键之处。_

Seedance 2.0的核心定位并不只是“生成好看视频”，而是_统一多模态音视频联合架构_。它支持_文本、图片、音频、视频四种输入模态_，且可以同时输入9张图片、3段视频、3段音频，再加自然语言指令；其可以参考输入素材中的构图、运动、镜头、特效、音频等元素，本质上是一套**更偏“导演台”的能力体系**。这意味着 Seedance 的核心优势，不只是输出结果本身，而是**控制链条更长**。因此它更适合做这类任务：

·给多张角色图，要求角色一致；

·给一段参考视频，要求学习镜头运动；

·给一段音频，要求按节奏和情绪生成；

·做多镜头衔接、续写、插镜头、改镜头。

即Seedance2.0 强在“自导自演”，而 HappyHorse当前能确认的输入仍主要是Text / Image，并没有像Seedance2.0那样把_“全模态参考+重编辑能力”_作为官方核心卖点。所以如果只看分数，HappyHorse和Seedance已经非常接近；但如果看产品能力边界，二者的差异更像是：

·**HappyHorse**：更像一个“高质感成片引擎”

·**Seedance 2.0**：更像一个“多模态导演系统”

这也是为什么在很多实际使用中，用户会觉得HappyHorse**单镜头质感惊艳**，但一旦动作复杂、镜头组织变多，未必能像Seedance那样稳。

**3. 与Kling的区别是：分镜化与专业镜头控制力度**

Kling3.0 Omni 的官方升级点也很明确，Video 3.0 Omni 支持 multi-shot storyboard，用户可以为每一个镜头分别设定时长、景别、视角、叙事内容和镜头运动。这套能力和 Seedance 一样，明确是在往“_导演工具”方向走_。从Artificial Analysis榜单看，Kling 3.0 Omni 目前在部分赛道仍处于第一梯队，但无论是 Text-to-Video（含音频） 还是 Image-to-Video（无音频），分数都暂时落后于 HappyHorse 与 Seedance。 这隐含着一种可能，Kling 的产品方向和行业判断是对的——分镜、镜头组织、专业控制会越来越重要；但在当前盲测偏好里，HappyHorse 的“单次成片观感”更容易讨好用户。即Kling 更像一个可控性优先的选手，而 HappyHorse 更像一个第一眼质感优先的选手。

**4.若对标 SkyReels V4，HappyHorse 仍偏“轻导演、重成片”**

若把这匹“黑马”对标昆仑万维的 SkyReels V4，差异会更清楚。SkyReels V4 是一个_统一多模态视频基础模型_，同时支持文本、图片、音频、视频等丰富输入和音视频联合生成，同时把生成、补全、编辑纳入统一接口；并支持1080p、32FPS、15 秒、多镜头、同步音频输出。 从Artificial Analysis的当前榜单看，SkyReels V4 在多个赛道里都已进入前列，例如在 Text-to-Video（含音频）中，SkyReels V4 为1142 Elo；在Text-to-Video（无音频）中为1244 Elo。

这反映出：HappyHorse的优势是_“好看”“真实”“同步音频”_；而Seedance / Kling / SkyReels的优势是_“参考、分镜、编辑、长链路控制”的完整性_。这两类能力未来很可能会收敛，但当前阶段仍然没有完全统一。因此HappyHorse现在更像一个**结果导向型高分模型**，而 Seedance、Kling、SkyReels 更像**系统能力更完整的产品型模型**。

**5. 那HappyHorse 自身的技术特色在哪儿？**

这匹“快乐小马”最值得关注的技术标签有：

1） _15B统一unified Transformer架构：_它不是传统意义上“文生视频一个模块、音频另一个模块”那种明显拼装感的产物，而是强调统一生成视频与同步音频。

_2） 8-step DMD-2 distillation：_其通过蒸馏把去噪压缩到8步，且不依赖classifier-free guidance，并结合自家运行时加速。这意味着商业化路径的快速落地：推理速度更快，单位视频成本可以更低。**官方的口径是：H100 上生成 5 秒 1080p 视频约 38 秒，**这个速度在当前视频生成模型中绝对是佼佼者之一。

_3）_**_多语言 lip-sync_**：它公开支持英语、普通话、粤语、日语、韩语、德语、法语七种语言口型同步。这个特点很适合社媒广告、本地化内容、虚拟人口播这类场景。

因此HappyHorse 把“高画质、同步音频、多语言、相对快推理” 这几个特色做到了极致。

## 二、实测

·提示词：High-speed vertical chase, agile fighter sprinting upward through collapsing platforms, massive heavy creature charging from below, sudden leaps and wall kicks, extreme sense of speed and height, exaggerated motion arcs, brief pose freezes mid-jump, strong gravity pull, cinematic camera tilting upward following the ascent, explosive kinetic energy.

![](https://wdl-wscn.awtmt.com/07aeb3e7-f4ca-4207-befb-c987b3dc7011)

·提示词：A purebred Siberian Husky jumps down step by step from the stairs of its owner’s villa, which is covered with a classical patterned carpet. The Husky opens its mouth and pants with its tongue out, just as many animals do when exercising.

![](https://wdl-wscn.awtmt.com/07aeb3e7-f4ca-4207-befb-c987b3dc7011)

·提示词：A key-point colored Ragdoll kitten plays with a ball of yarn on a cozy carpet, batting it with its front paws. The yarn slips away from its paws, and the kitten lets out a disappointed "meow".

Audio: A disappointed "meow".

![](https://wdl-wscn.awtmt.com/07aeb3e7-f4ca-4207-befb-c987b3dc7011)

·提示词：

A young Asian woman with long black hair and natural makeup walks slowly by the seaside. The breeze gently blows her hair and skirt. She smiles naturally at the camera with gentle eyes.

Warm dusk light, with backlighting outlining her silhouette and glowing hair strands.

The shot opens with a medium view showing her full body, slowly pushing in to a close-up of her face.

The camera follows smoothly with a slight half-circle movement.

Healing and fresh style, cinematic color grading.

4K ultra HD, rich details, smooth and stable footage.

Clear and undistorted face, stable facial features, natural human anatomy, natural and unstiff movements.

![](https://wdl-wscn.awtmt.com/07aeb3e7-f4ca-4207-befb-c987b3dc7011)

## **三、总结：优点很突出，短板也很明确**

_1.优点：场景感、真实感、成片感，确实是它最突出的长板_

从实际观感看，HappyHorse 最容易打动人的地方，不是“它功能最多”，而是它提供的“看起来很真、很满、很有细节的场景”。尤其在环境丰富度、空间层次、材质纹理、镜头画面的“饱满感”上，它的完成度是很高的。若用于**广告片素材、社媒短视频、氛围感强的内容创作**，它的优势会比较明显。

_2\. 缺点：动作一复杂，就容易露出底层控制力不足的缺陷_

一旦动作复杂度上来，模型会开始出现**动作理解不到位、肢体关系错乱、连贯性下降**等问题。这说明它虽然在“画面结果”上很强，但在**复杂时序动作建模**上，仍然没有把稳定性完全做出来。

HappyHorse目前更像一个很会拍漂亮镜头的摄影师，但还不是一个真正成熟的动作导演。

_3\. “剪分镜能力”确实不是它当前最强项_

从这次体验看，HappyHorse还缺一点Seedance那种“自导自演”的感觉。它能把单个场景做得很漂亮，但在多镜头组织、镜头逻辑推进、镜头之间的叙事连贯性上，目前并没有给人特别强的掌控感。在_Seedance、Kling、SkyReels 都在大力强化 storyboard、多模态参考、编辑与续写时_，HappyHorse的能力边界仍更偏向文本/图片→高质量片段生成。 

_4\. 音频是加分项，但不是决定性壁垒_

开启Audio 后，HappyHorse的音画同步整体较好，音乐选择也不错。但从行业竞争角度看，音频能力已经不再是HappyHorse独占，各头部玩家都在往“原生音视频一体”方向走。

综合来看，这匹“发布者身份成谜的黑马”是一款“画面和场景很强、音频也不错，但复杂动作和分镜控制还不如Seedance等玩家那么成熟”的高质量视频模型。

本文来源：[国联民生证券](https://mp.weixin.qq.com/s/gKrtlII2zvEpPfeRZhHcAA)

风险提示及免责条款

市场有风险，投资需谨慎。本文不构成个人投资建议，也未考虑到个别用户特殊的投资目标、财务状况或需要。用户应考虑本文中的任何意见、观点或结论是否符合其特定状况。据此投资，责任自负。
