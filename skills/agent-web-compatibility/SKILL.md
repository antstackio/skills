---
name: agent-web-compatibility
description: Audit and redesign websites for dual consumption — optimised for both human visitors and AI agents acting on their behalf. Use this skill when someone wants to make a website agent-compatible, improve how AI assistants discover or recommend their site, build trust signals for AI-mediated transactions, or ensure their booking/reservation flow works for AI agents. Triggers on phrases like "agent-friendly website", "AI can't book on my site", "make my site work with AI assistants", "optimise for AI agents", "dual consumption", "agentic web", "my site isn't getting picked by AI", or any request to audit or redesign a website for AI compatibility. Also triggers when building new websites for clinics, restaurants, salons, local e-commerce, or event booking where agentic discovery and completion is a goal.
license: MIT
metadata:
  author: antstackio
  version: "1.0.0"
---

# Agent Web Compatibility

Audit and redesign websites so they perform well for **both** human visitors and AI agents acting on a user's behalf.

When an agent is asked _"find me a dermatologist near Indiranagar available this Thursday"_ it doesn't click buttons or read hero images — it parses structured data, verifies trust signals, and picks the option it can confidently complete. This skill addresses all three stages of that decision.

**Best fit:** independent clinics, restaurants, salons, local e-commerce, event venues. Not for chains already integrated into aggregator APIs at scale.

---

## The Three-Layer Framework

```
1. DISCOVERABILITY  — Can the agent find and understand you?
2. PREFERABILITY    — Does the agent trust you enough to recommend you?
3. COMPLETABILITY   — Can the agent finish the transaction without breaking?
```

Work through layers in order. Read the vertical reference file before auditing.

---

## Layer 1: Discoverability

**Schema.org JSON-LD** — highest-impact change. Every entity needs: `name`, `address` (PostalAddress), `telephone`, `geo`, `url`, `openingHoursSpecification`. Vertical-specific required fields are in the reference files.

**Data freshness** — check `dateModified` on all key pages, use `specialOpeningHoursSpecification` for exceptions, set `temporarilyClosed` when the business is shut. Stale data causes agents to deprioritise you.

**llms.txt** — place at domain root with: business description, key page paths, booking policy summary, trust signals. Signals intentionality to AI crawlers.

**Entity consistency** — business name, address, phone, and category must be identical across Google, Maps, Justdial, Sulekha, and all aggregator listings. Inconsistency fractures the entity graph.

---

## Layer 2: Preferability

Agents evaluate verifiable signals, not marketing copy. Every vertical has specific trust credentials — see the reference file. Cross-vertical requirements:

- `aggregateRating` with `ratingCount` present and sourced
- Menu / service list with prices crawlable (not in images or PDFs)
- Booking and cancellation policy in plain prose on the page
- `dateModified` accurate on all key pages
- Author bylines with `author` schema on blog/FAQ content

---

## Layer 3: Completability

**Hostile barriers to remove:**
- CAPTCHA on booking forms → replace with honeypot + IP rate limiting
- Session timeout < 30 minutes → extend to minimum 30 minutes
- OTP-only flows → always offer email confirmation as fallback
- JS-only forms with no HTML fallback → inaccessible to many agents
- Third-party booking redirects mid-flow → embed widgets in-page
- Price shown at checkout differs from listing → taxes must be shown upfront

**Form fields:** every input needs an explicit `label`, semantic `name`/`id` (`guest_count` not `field_1`), and `autocomplete` where relevant.

**Confirmation payload** must include in plain parseable text: business name, date/time (unambiguous format), what was booked, cancellation policy, and a unique booking reference ID.

---

## Audit Checklist

Mark each: ✅ Done / ⚠️ Partial / ❌ Missing

**Discoverability**
- [ ] JSON-LD present with correct Schema.org type for vertical
- [ ] `name`, `address`, `telephone`, `geo`, `url` populated
- [ ] Vertical-specific required fields present (see reference file)
- [ ] `openingHoursSpecification` accurate and current
- [ ] `llms.txt` at domain root
- [ ] Entity consistent across all external listings

**Preferability**
- [ ] Vertical trust credentials on page and in schema
- [ ] `aggregateRating` with `ratingCount` present
- [ ] Menu/service list with prices is crawlable
- [ ] `dateModified` present and accurate
- [ ] Booking/cancellation policy in plain prose

**Completability**
- [ ] No CAPTCHA (or agent-safe alternative)
- [ ] Session timeout ≥ 30 minutes
- [ ] All form fields: `label`, `name`, `id`, `autocomplete`
- [ ] OTP flows have email fallback
- [ ] Confirmation contains all 5 required fields
- [ ] Booking reference ID generated

---

## Common Anti-Patterns

| Anti-pattern | Why it hurts | Fix |
| --- | --- | --- |
| Menu as image or PDF | Agents can't read it | HTML menu with JSON-LD `hasMenuItem` |
| "Call to book" only | Agents can't call | Add online booking or callback form |
| Hours in image format | Agents miss changes | Use `openingHoursSpecification` |
| Generic page titles | Weak entity signal | `[Business] — [Service] — [Area]` |
| Mixed name spellings | Fractures entity graph | Standardise across all touchpoints |
| Availability always "open" | Destroys trust | Real-time or manually updated status |
| Reviews only on third-party sites | Agent can't verify | `aggregateRating` schema with source link |

---

## Vertical Reference Files

Read the relevant file before auditing — each contains required schema fields, trust signals, JSON-LD examples, and booking flow notes:

- `references/healthcare.md` — clinics, diagnostic labs, doctors
- `references/restaurants.md` — restaurants, cafes, cloud kitchens
- `references/salons.md` — salons, spas, grooming
- `references/ecommerce.md` — local D2C, same-day delivery
- `references/quickcommerce.md` — quick commerce, on-demand delivery

---

## Output Format

Deliver five artefacts:

1. **Scorecard** — checklist above with ✅ / ⚠️ / ❌
2. **Priority fixes** — top 3 ranked by agent-preference impact
3. **Schema block** — ready-to-paste JSON-LD for the vertical
4. **llms.txt draft** — ready to upload
5. **Booking flow notes** — specific friction points and fixes

Every recommendation must be specific enough for a developer to act on without a follow-up question. Not _"improve structured data"_ — but _"add `hasMenuItem` array with each dish as a `MenuItem` containing `name`, `description`, and `offers.price`"_.

---

## Verification Steps

1. **Schema** — Google Rich Results Test (search.google.com/test/rich-results)
2. **Citation** — ask ChatGPT / Perplexity: _"Find me a [vertical] in [neighbourhood] that [requirement]"_
3. **Booking flow** — complete the full flow using keyboard-only navigation
4. **Entity** — Google the business name in quotes, check all results match
5. **Freshness** — view source, search `dateModified`, confirm it's recent
