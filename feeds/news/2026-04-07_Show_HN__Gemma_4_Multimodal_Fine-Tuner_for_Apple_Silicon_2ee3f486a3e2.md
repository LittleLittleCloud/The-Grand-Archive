---
title: 'Show HN: Gemma 4 Multimodal Fine-Tuner for Apple Silicon'
source: Hacker News
source_url: 'https://hnrss.org/frontpage'
link: 'https://github.com/mattmireles/gemma-tuner-multimodal'
author: MediaSquirrel
published: 'Tue, 07 Apr 2026 19:37:05 +0000'
fetched: '2026-04-07T19:59:51.737Z'
category: news
tags:
  - 创业
  - YC
language: ''
guid: 'https://news.ycombinator.com/item?id=47680309'
hash: 2ee3f486a3e2
read: false
starred: false
---

About six months ago, I started working on a project to fine-tune Whisper locally on my M2 Ultra Mac Studio with a limited compute budget. I got into it. The problem I had at the time was I had 15,000 hours of audio data in Google Cloud Storage, and there was no way I could fit all the audio onto my local machine, so I built a system to stream data from my GCS to my machine during training.

Gemma 3n came out, so I added that. Kinda went nuts, tbh.

Then I put it on the shelf.

When Gemma 4 came out a few days ago, I dusted it off, cleaned it up, broke out the Gemma part from the Whisper fine-tuning and added support for Gemma 4.

I'm presenting it for you here today to play with, fork and improve upon.

One thing I have learned so far: It's very easy to OOM when you fine-tune on longer sequences! My local Mac Studio has 64GB RAM, so I run out of memory constantly.

Anywho, given how much interest there is in Gemma 4, and frankly, the fact that you can't really do audio fine-tuning with MLX, that's really the reason this exists (in addition to my personal interest). I would have preferred to use MLX and not have had to make this, but here we are. Welcome to my little side quest.

And so I made this. I hope you have as much fun using it as I had fun making it.

\-Matt

* * *

Comments URL: [https://news.ycombinator.com/item?id=47680309](https://news.ycombinator.com/item?id=47680309)

Points: 7

\# Comments: 1
