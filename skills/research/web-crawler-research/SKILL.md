---
name: web-crawler-research
title: Web Crawler Research — Source Collection and Structured Evidence Packs
description: "Collect public web sources, extract useful facts, deduplicate findings, and produce structured research packs for editorial and new-media workflows."
version: 0.1.0
author: Hermes new media fork
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [research, crawler, scraper, web, sources, new-media]
    category: research
    requires_toolsets: [web, browser, file]
---

# Web Crawler Research

Use this skill when the user asks to collect public web information, crawl a small set of pages, summarize competitor pages, build a source pack, or turn links into structured notes.

## Boundaries

- Use public, accessible pages only.
- Respect robots/login/paywall boundaries. Do not bypass authentication, CAPTCHAs, rate limits, or platform protections.
- Prefer official pages, news sources, documentation, public posts, and pages provided by the user.
- Record source URLs and retrieval dates when facts matter.
- Mark weak, repeated, or unverified information clearly.

## Default Workflow

1. Clarify the topic, geography/language, time window, and output format if missing.
2. Build a source plan:
   - official/primary sources
   - news or industry sources
   - competitor pages or social/public pages
   - background explainers
3. Search or browse with focused queries.
4. Extract only relevant facts, quotes, numbers, examples, and claims.
5. Deduplicate repeated stories and identify conflicts.
6. Save useful source notes or tables to an output file when the user wants a deliverable.

## Output Shape

```markdown
## Research Goal
[What was collected and why]

## Source Table
| Source | URL | Type | Key evidence | Confidence |
| --- | --- | --- | --- | --- |

## Findings
1. [Finding with source reference]
2. [Finding with source reference]
3. [Finding with source reference]

## Editorial Angles
| Angle | Why it matters | Supporting sources | Risk/check |
| --- | --- | --- | --- |

## Gaps
- [Missing source, unclear data, paywalled item, or follow-up search]
```

## For Competitor Monitoring

When the target is competitor content, collect:

- positioning and recurring topics
- headline/hook patterns
- formats and publishing cadence
- visible engagement signals if available
- creative assets, offers, or CTAs
- differentiation opportunities for the user's team

## Quality Bar

Before finalizing:

- Every important claim has a source or is marked as an inference.
- The answer separates raw evidence from editorial recommendations.
- The user can hand the output to an editor, writer, or operator without redoing the search.
