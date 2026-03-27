---
name: agent-web-compatibility
description: Audit and redesign websites for AI consumption — covering agentic task completion (can an AI book/order on a user's behalf?), AEO (Answer Engine Optimization — can content surface as a direct answer in voice or featured snippets?), and GEO (Generative Engine Optimization — will AI systems like ChatGPT, Perplexity, and Google AI Overviews cite this content?). AI-optimized, human-compatible: the goal is AI performance; human experience is a constraint, not a deliverable. Use this skill when someone wants to make a website agent-compatible, improve how AI assistants discover or recommend their site, build trust signals for AI-mediated transactions, ensure their booking/reservation flow works for AI agents, or get their content cited in AI-generated answers. Triggers on phrases like "agent-friendly website", "AI can't book on my site", "make my site work with AI assistants", "optimise for AI agents", "agentic web", "my site isn't getting picked by AI", "AEO", "GEO", "AI citations", "featured snippets", "AI Overviews", or any request to audit or redesign a website for AI compatibility. Also triggers when building new websites for clinics, restaurants, salons, local e-commerce, or event booking where agentic discovery and completion is a goal.
license: MIT
metadata:
  author: antstackio
  version: "1.0.0"
---

# Agent Web Compatibility

Audit and redesign websites for AI consumption — so agents can find, trust, and transact on them. The goal is AI performance; human experience is a constraint: optimizations must not break what already works for human visitors, but improving human UX is out of scope.

Three AI consumption modes are in scope:

- **Agentic task completion** — when an agent is asked _"find me a dermatologist near Indiranagar available this Thursday"_ it parses structured data, verifies trust signals, and completes the booking without human intervention.
- **AEO (Answer Engine Optimization)** — when someone asks a voice assistant or search engine a question, your content surfaces as the direct answer.
- **GEO (Generative Engine Optimization)** — when ChatGPT, Perplexity, Google AI Overviews, Claude, or Gemini generate an answer, your content gets cited or recommended.

**Best fit:** independent clinics, restaurants, salons, local e-commerce, event venues. Not for chains already integrated into aggregator APIs at scale.

---

## The Five-Layer Framework

```
1. DISCOVERABILITY  — Can the agent find and understand you?
2. PREFERABILITY    — Does the agent trust you enough to recommend you?
3. COMPLETABILITY   — Can the agent finish the transaction without breaking?
4. ANSWERABILITY    — Does your content surface as a direct answer (AEO)?
5. CITABILITY       — Will AI systems cite or recommend your content (GEO)?
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

## Layer 4: Answerability (AEO)

AEO targets voice assistants, featured snippets, and "People Also Ask" boxes. The goal: your page is the source of the direct answer, not just a result in a list.

**Answer-format content** — place a concise direct answer (2–4 sentences or a tight list) at the top of any page targeting a question query. Do not bury the answer after marketing copy.

**`FAQPage` schema** — mark up Q&A content on service pages, about pages, and dedicated FAQ pages. Every `Question` needs an `acceptedAnswer` with `text` in plain prose (not HTML).

```json
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Does the clinic offer teleconsultation?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes. Teleconsultation is available Monday to Saturday, 9 AM to 8 PM. Book via the website or call +91-80-XXXXXXXX."
    }
  }]
}
```

**`HowTo` schema** — use for any step-by-step content (how to book, how to prepare for a procedure, how to place an order). Each `HowToStep` needs `name` and `text`.

**`Speakable` schema** — mark sections suitable for voice readout with `speakable` on the page entity. Target the business description, hours, and key service summary.

**Page structure for snippet capture:**
- H1 = the question as asked ("How do I book a same-day appointment at [Clinic]?")
- First paragraph = direct answer, ≤ 60 words
- Use `<ul>` or `<ol>` for list answers — not comma-separated prose
- Use `<table>` for comparison answers — not image-based tables

---

## Layer 5: Citability (GEO)

GEO targets AI-generated answers in ChatGPT, Perplexity, Google AI Overviews, Claude, and Gemini. These systems cite pages that demonstrate expertise, contain original data, and structure content for extraction.

**E-E-A-T signals** — Experience, Expertise, Authoritativeness, Trustworthiness. Concrete requirements:
- Every content page needs a visible author byline linked to an author profile
- Author profile must include credentials, professional registrations, and years of experience as plain text (not just a photo)
- Mark up with `author` schema pointing to a `Person` entity with `hasCredential` and `jobTitle`
- Publication date and `dateModified` must be visible on page and in schema

**Citable content structure** — AI systems excerpt pages that contain:
- Named statistics with source attribution ("According to ICMR, 60% of…")
- Original data, case studies, or named research the site produced
- Explicit definitions: "What is [term]:" followed by a concise definition
- Bulleted summaries at the top of long-form content ("Key takeaways: …")

**Content structure for AI extraction:**
- Use descriptive H2/H3 headings that state the answer, not tease it ("Consultation fees at [Clinic]" not "What you need to know")
- Keep paragraphs ≤ 4 sentences — AI systems prefer short, extractable blocks
- Use `<strong>` to highlight key facts within paragraphs
- Avoid burying key facts in the middle of long paragraphs

**AI Overview optimisation:**
- Target "zero-click" queries by being the most authoritative local source for your vertical and geography
- Add a "Last reviewed by [credentials]" line on all clinical/advice content
- Ensure `sameAs` in schema links to your Google Business Profile, Wikidata entry (if it exists), and authoritative directories

**Systematic AI visibility testing** — run monthly:
1. Ask ChatGPT: _"Best [vertical] in [area] for [specific need]"_ — are you mentioned?
2. Ask Perplexity: same query — are you cited with a source link?
3. Check Google AI Overview for your primary service + location query
4. If not appearing: identify which trust signal is weakest (E-E-A-T, freshness, or citation count) and address that layer first

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

**Answerability (AEO)**
- [ ] Question-targeting pages open with a direct answer (≤ 60 words)
- [ ] `FAQPage` schema on Q&A content with `acceptedAnswer` in plain prose
- [ ] `HowTo` schema on step-by-step pages
- [ ] `Speakable` schema marks business description and hours
- [ ] H1 headings on question pages match the query as asked
- [ ] Lists use `<ul>`/`<ol>`, not comma-separated prose

**Citability (GEO)**
- [ ] Every content page has a visible author byline
- [ ] Author profile page has credentials, registration, experience as plain text
- [ ] `author` schema on content pages links to `Person` entity with `hasCredential`
- [ ] `dateModified` visible on page and accurate
- [ ] Statistics and claims include named source attribution
- [ ] H2/H3 headings state the answer, not tease it
- [ ] Paragraphs ≤ 4 sentences on key content pages
- [ ] `sameAs` in schema links to Google Business Profile and authoritative directories
- [ ] "Last reviewed by [credentials]" line on clinical/advice content

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
| Answer buried after marketing copy | Missed featured snippet | Direct answer in first paragraph, ≤ 60 words |
| Q&A as prose paragraphs | No FAQPage eligibility | Mark up with `FAQPage` schema |
| Comparison tables as images | AI can't extract data | Use `<table>` with text cells |
| Author listed as "Admin" or no byline | Weak E-E-A-T | Named author with credentials and `author` schema |
| Stats without source attribution | AI won't cite unverified claims | Add "According to [source]" for every statistic |
| H2s as engagement hooks ("You won't believe…") | AI can't extract meaning | Descriptive headings that state the fact or answer |

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

Deliver seven artefacts:

1. **Scorecard** — checklist above with ✅ / ⚠️ / ❌ across all five layers
2. **Priority fixes** — top 5 ranked by impact (note which layer each addresses)
3. **Schema block** — ready-to-paste JSON-LD for the vertical (entity + FAQPage + HowTo where applicable)
4. **llms.txt draft** — ready to upload
5. **Booking flow notes** — specific friction points and fixes
6. **AEO content brief** — list of question queries to target, with required answer format (paragraph / list / table) and `FAQPage` entries for top 5 questions
7. **GEO content gaps** — missing E-E-A-T signals, weak/missing author schema, unattributed stats, and heading copy that needs rewriting for AI extraction

Every recommendation must be specific enough for a developer to act on without a follow-up question. Not _"improve structured data"_ — but _"add `hasMenuItem` array with each dish as a `MenuItem` containing `name`, `description`, and `offers.price`"_.

---

## Verification Steps

1. **Schema** — Google Rich Results Test (search.google.com/test/rich-results) — check entity schema, FAQPage, and HowTo
2. **Booking flow** — complete the full flow using keyboard-only navigation
3. **Entity** — Google the business name in quotes, check all results match
4. **Freshness** — view source, search `dateModified`, confirm it's recent
5. **AEO** — Google the primary service + location query, check if the site appears in Featured Snippet or People Also Ask
6. **GEO (transactional)** — ask ChatGPT / Perplexity: _"Find me a [vertical] in [neighbourhood] that [requirement]"_ — is the business recommended?
7. **GEO (content)** — ask Perplexity: _"[question the site's content should answer]"_ — is the site cited as a source?
8. **AI Overview** — Google the primary question query and check the AI Overview panel for citation or exclusion
