---
name: agent-web-compatibility
description: Audit and redesign websites for dual consumption — optimised for both human visitors and AI agents acting on their behalf. Use this skill when someone wants to make a website agent-compatible, improve how AI assistants discover or recommend their site, build trust signals for AI-mediated transactions, or ensure their booking/reservation flow works for AI agents. Triggers on phrases like "agent-friendly website", "AI can't book on my site", "make my site work with AI assistants", "optimise for AI agents", "dual consumption", "agentic web", "my site isn't getting picked by AI", or any request to audit or redesign a website for AI compatibility. Also triggers when building new websites for clinics, restaurants, salons, local e-commerce, or event booking where agentic discovery and completion is a goal.
---

# Agent Web Compatibility

A skill for auditing and redesigning websites so they perform well for **both** human visitors and AI agents acting on a user's behalf.

## The Core Problem

When a user tells an AI agent _"find me a dermatologist near Indiranagar available this Thursday"_ or _"book a table for 2 tonight, good South Indian, around ₹800 for two"_ — the agent must **choose** between multiple options. It doesn't click buttons or read hero images. It parses structured data, verifies trust signals, and selects the option it can confidently recommend and complete.

**Reviews get you into the consideration set. Dual consumption design wins the tiebreaker.**

This skill is most valuable for:

- Independent clinics, diagnostic labs, and wellness centres
- Standalone restaurants and cafes
- Salons, spas, and grooming studios
- Local e-commerce and D2C with same-day delivery
- Movie theatres, event venues, and experience bookings

It is NOT for large chains already deeply integrated into aggregator APIs (Swiggy, Zomato, BookMyShow at scale) — they solve this differently.

---

## The Three-Layer Framework

Every audit and redesign decision maps to one of three layers:

```
1. DISCOVERABILITY  — Can the agent find and understand you?
2. PREFERABILITY    — Does the agent trust you enough to recommend you?
3. COMPLETABILITY   — Can the agent finish the transaction without breaking?
```

Work through all three layers in order. Don't skip to completability before fixing discoverability.

---

## Layer 1: Discoverability Audit

### What to check

**Structured data (Schema.org)**
The single highest-impact change. Verify the page has correct JSON-LD markup.

- For restaurants: `Restaurant` type with `servesCuisine`, `priceRange`, `hasMenu`, `openingHoursSpecification`, `aggregateRating`
- For clinics: `MedicalClinic` or `Physician` with `medicalSpecialty`, `availableService`, `openingHoursSpecification`
- For salons/spas: `HealthAndBeautyBusiness` with `makesOffer`, `openingHoursSpecification`
- For e-commerce: `Product` with `offers` (including `availability` and `deliveryLeadTime`)
- For event venues: `EventVenue` with `Event` children including `startDate`, `offers`

Every entity must also include: `name`, `address` (using `PostalAddress`), `telephone`, `geo` (lat/long), `url`

**Data freshness signals**
Agents penalise stale data. Check:

- Is menu/service/pricing data updated within the last 30 days?
- Do opening hours reflect current reality (holidays, seasonal changes)?
- Is slot/availability data real-time or static?

**llms.txt file**
Place a plain text file at `yourdomain.com/llms.txt`. This signals intentionality to AI crawlers.

Minimum viable format:

```
# [Business Name]
> [One line description of what you offer]

## Key pages
- /menu or /services — [what it contains]
- /book or /reserve — [booking flow description]
- /about — [credentials, certifications, founding year]

## Booking policy
[Cancellation terms in plain language, 2-3 sentences max]

## Trust signals
[Certifications, awards, years in operation]
```

**Entity consistency check**
Search the business name on Google, Justdial, Sulekha, Google Maps, and any aggregator listings. Every listing must use:

- Identical business name spelling
- Same address format
- Same phone number
- Consistent category/cuisine/specialty description

Inconsistency fractures the entity graph AI systems use to verify you.

---

## Layer 2: Preferability Audit

This is where **trust over clicks** becomes concrete. Agents don't respond to urgency copy or hero images. They evaluate verifiable signals.

### Trust signals by vertical

**Clinics and healthcare**

- Doctor names with qualifications marked up as `Person` with `hasCredential`
- Registration numbers (MCI/state medical council) visible on page and in schema
- Years in practice as `foundingDate` on the organisation
- Insurance accepted listed as plain text (agents parse this)
- Patient review schema using `aggregateRating` with `ratingCount` > 10

**Restaurants**

- FSSAI licence number visible on page (not just in footer — in schema too)
- Cuisine tags using standard terms (`South Indian`, `North Indian`, not invented names)
- Price range using `priceRange` field (e.g., `₹₹` or explicit range)
- Actual menu with prices in structured format (JSON-LD `hasMenuItem` or a crawlable HTML menu)
- Hygiene rating if available from municipal body

**Salons and spas**

- Named staff with specialisations (agents use this for "book with someone experienced in balayage")
- Service menu with durations AND prices — both required
- Certifications (Lakme Academy, VLCC etc.) marked up

**Local e-commerce**

- `deliveryLeadTime` in schema — this is the single most important field for agents choosing between sellers
- `areaServed` with specific pin codes or neighbourhoods
- Return policy as a `MerchantReturnPolicy` schema object
- Stock availability as `ItemAvailability` — never show "available" when you're not

### Content provenance signals

These help AI systems treat your content as authoritative:

- Author bylines on blog/FAQ content with `author` schema
- `dateModified` on all pages — keep it accurate
- Primary sources cited where you make claims
- Separate factual content from marketing copy structurally (use different page sections, not mixed paragraphs)

---

## Layer 3: Completability Audit

The agent has chosen your site. Now it needs to finish the booking. Most sites fail here silently — the agent attempts the flow, hits friction, abandons, and picks the next option.

### Booking flow requirements

**No hostile barriers**

- CAPTCHAs on booking forms will cause agent dropout — replace with honeypot fields or rate limiting by IP
- Session timeouts under 10 minutes will break multi-step agent flows — extend to minimum 30 minutes
- OTP-only flows with no alternative break agents entirely — always offer email confirmation as fallback

**Form field clarity**
Every input field must have:

- Explicit `label` element (not placeholder-only)
- `name` and `id` attributes that describe the data (`guest_count`, `appointment_date`, not `field_1`)
- `autocomplete` attributes where relevant

**Confirmation payload**
After booking, the confirmation page or email must include in plain, parseable text:

- Business name
- Date and time (in unambiguous format: `Thursday 24 April 2025, 7:30 PM`)
- What was booked (table for 2, Dr. Sharma appointment, haircut + colour)
- Cancellation policy and link/number
- A unique booking reference ID

This is what the agent reads back to the human. If it's missing, the human can't verify what happened.

**API or calendar endpoint (nice to have, high impact)**
If the site uses a booking system, expose a simple endpoint or support Google Reserve / Zomato Book integrations. Agents prefer completing transactions through structured endpoints over form-filling.

---

## Audit Checklist (use this when reviewing a live site)

Run through each item. Mark as ✅ Done / ⚠️ Partial / ❌ Missing.

**Discoverability**

- [ ] JSON-LD structured data present with correct type for vertical
- [ ] `name`, `address`, `telephone`, `geo`, `url` all populated
- [ ] Vertical-specific fields present (see Layer 1)
- [ ] `openingHoursSpecification` accurate and current
- [ ] `llms.txt` exists at root domain
- [ ] Entity name/address consistent across all external listings

**Preferability**

- [ ] Vertical-specific trust credentials visible on page AND in schema
- [ ] `aggregateRating` with `ratingCount` present
- [ ] Menu/service list with prices is crawlable (not locked in images or PDFs)
- [ ] `dateModified` present and accurate on key pages
- [ ] Booking/cancellation policy in plain prose (not buried in T&C PDF)

**Completability**

- [ ] No CAPTCHA on booking form (or agent-safe alternative used)
- [ ] Session timeout ≥ 30 minutes
- [ ] All form fields have proper `label`, `name`, `id`, `autocomplete`
- [ ] OTP-only flows have email fallback
- [ ] Confirmation page/email contains all 5 required fields
- [ ] Booking reference ID generated and shown

---

## Common Anti-Patterns

These actively hurt agent preference. Flag and fix them:

| Anti-pattern                          | Why it hurts                                  | Fix                                                          |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Menu as image or PDF only             | Agents can't read it                          | Add HTML menu with JSON-LD `hasMenuItem`                     |
| "Call to book" only                   | Agents can't make calls                       | Add online booking or enquiry form                           |
| Hours in image format                 | Agents miss closures and changes              | Use `openingHoursSpecification` schema                       |
| Generic page titles ("Home", "About") | Weak entity signal                            | Use `[Business Name] — [Specific Service] — [Neighbourhood]` |
| Mixed business name spellings         | Fractures entity graph                        | Standardise across all touchpoints                           |
| Availability always shows "open"      | Destroys agent trust after one bad experience | Show real-time or manually updated status                    |
| Reviews only on third-party sites     | Agent can't verify                            | Embed `aggregateRating` schema linking to review source      |

---

## Vertical Reference Files

For detailed implementation specs per vertical, read:

- `references/healthcare.md` — Clinics, diagnostic labs, doctors
- `references/restaurants.md` — Restaurants, cafes, cloud kitchens
- `references/salons.md` — Salons, spas, grooming
- `references/ecommerce.md` — Local D2C, quick commerce

---

## Testing Your Work

After implementing changes, verify agent-readiness:

1. **Schema validation** — Paste the URL into Google's Rich Results Test (search.google.com/test/rich-results). All required fields should show green.

2. **LLM citation test** — Ask ChatGPT, Gemini, or Perplexity: _"Find me a [vertical] in [neighbourhood] that [specific requirement]."_ Check if your client appears and what data is cited.

3. **Booking flow simulation** — Manually complete the entire booking flow using only keyboard navigation, no mouse. If you get stuck, an agent will too.

4. **Entity consistency check** — Google the business name in quotes. All results should show the same name, address, and category.

5. **Freshness check** — View page source and search for `dateModified`. Confirm it reflects a recent update.

---

## Output Format

When completing an audit, deliver:

1. **Audit scorecard** — The checklist above, filled in with ✅ / ⚠️ / ❌
2. **Priority fixes** — Top 3 changes ranked by agent-preference impact
3. **Schema block** — Ready-to-paste JSON-LD for the site's vertical
4. **llms.txt draft** — Ready to upload
5. **Booking flow notes** — Specific friction points found and how to resolve them

Keep recommendations concrete. Not _"improve structured data"_ but _"add `hasMenuItem` array to your Restaurant schema with each dish as a `MenuItem` object containing `name`, `description`, and `offers.price`"_.
