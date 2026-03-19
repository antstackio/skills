> Audit and redesign websites to get picked, trusted, and completed by AI agents — not just human visitors.

## The Problem

When a user asks an AI agent _"find me a dermatologist near me available this week"_ or _"book a table for 2 tonight, good South Indian, Koramangala"_ — the agent has to **choose** between multiple options. It doesn't click buttons or read hero images. It parses structured data, verifies trust signals, and selects the option it can confidently recommend and complete.

---

## What This Skill Does

Given a website URL or codebase, this skill:

1. **Audits** the site across three layers — Discoverability, Preferability, and Completability
2. **Generates** a filled scorecard of what's missing or broken for AI agents
3. **Produces** ready-to-paste JSON-LD structured data for the site's vertical
4. **Creates** a `llms.txt` file draft for the domain
5. **Flags** booking flow friction that causes agent dropout
6. **Prioritises** fixes by agent-preference impact

---

## Who This Is For

This skill is used by **practitioners building or redesigning websites for businesses** — not the business owners themselves.

| Audience                 | Use Case                                                |
| ------------------------ | ------------------------------------------------------- |
| Web agencies             | Differentiate packages with "agent-ready" websites      |
| No-code platform teams   | Bake dual consumption into templates at scale           |
| Booking software vendors | Make widgets agent-completable by default               |
| GEO / SEO consultants    | Extend beyond citation into transactional AI visibility |

### Best-fit verticals

- Independent clinics, diagnostic labs, wellness centres
- Standalone restaurants and cafes
- Salons, spas, grooming studios
- Local e-commerce and D2C with same-day delivery
- Movie theatres, event venues, experience bookings

---

## Installation

```bash
npx skills add antstackio/skills
```

Or install directly:

```bash
npx skills add <your-github-username>/skills
```

---

## Usage

Once installed, trigger the skill by describing what you want to audit or build:

```
Audit this restaurant website for AI agent compatibility: https://example.com
```

```
This clinic site needs to be picked by AI assistants. What needs to change?
```

```
Generate structured data and llms.txt for a salon in HSR Layout, Bengaluru
```

```
Review this booking flow and tell me where an AI agent would drop off
```

The skill works on **Claude, Cursor, GitHub Copilot, Windsurf, Gemini CLI**, and all other Agent Skills-compatible tools.

---

## The Three-Layer Framework

### Layer 1 — Discoverability

Can the agent find and understand the business?

- Schema.org JSON-LD markup (vertical-specific)
- `llms.txt` file at domain root
- Entity consistency across all external listings
- Data freshness signals

### Layer 2 — Preferability

Does the agent trust the business enough to recommend it?

- Machine-readable trust credentials (licences, certifications, qualifications)
- Crawlable menu / service list with prices
- Content provenance (author, dateModified, citations)
- Booking and cancellation policy in plain prose

### Layer 3 — Completability

Can the agent finish the transaction without breaking?

- No hostile CAPTCHAs on booking forms
- Session timeout ≥ 30 minutes
- Proper form field labels and autocomplete attributes
- Confirmation payload with all required booking details

---

## Output Format

Every audit produces five deliverables:

1. **Scorecard** — Checklist with ✅ / ⚠️ / ❌ across all three layers
2. **Priority fixes** — Top 3 changes ranked by agent-preference impact
3. **Schema block** — Ready-to-paste JSON-LD for the site's vertical
4. **llms.txt draft** — Ready to upload to the domain root
5. **Booking flow notes** — Specific friction points and how to resolve them

---

## Vertical Coverage

Detailed implementation specs with ready-to-paste JSON-LD examples are included for:

| Vertical             | Schema Type                  | Key Fields                                                  |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| Healthcare / Clinics | `MedicalClinic`, `Physician` | `medicalSpecialty`, `hasCredential`, `availableService`     |
| Restaurants / Cafes  | `Restaurant`                 | `hasMenuItem`, `servesCuisine`, `priceRange`                |
| Salons / Spas        | `BeautySalon`, `DaySpa`      | `makesOffer` with duration, `employee` specialisations      |
| Local E-commerce     | `OnlineStore`, `Product`     | `deliveryLeadTime`, `areaServed`, `hasMerchantReturnPolicy` |

---

## Why Not Just Rely on Zomato / Practo / Google?

Right now, AI agents lean on aggregators. But:

- **Reviews are becoming a commodity** — when every option has 4.2 stars, agents need a tiebreaker. That tiebreaker is first-party structured data.
- **Aggregators have a freshness problem** — your Zomato listing might say you're open when you're closed for renovation. Agents will learn to prefer authoritative first-party sources.
- **First-party booking = no commission** — if the agent books through your site instead of an aggregator, the business keeps 100% of the transaction.

---

## File Structure

```
agent-web-compatibility/
├── SKILL.md              # Core audit framework + checklist
├── README.md             # This file
├── metadata.json         # Registry metadata
└── references/
    ├── healthcare.md     # Clinics, labs, doctors — JSON-LD + trust signals
    ├── restaurants.md    # Restaurants, cafes — JSON-LD + menu markup
    ├── salons.md         # Salons, spas — JSON-LD + staff markup
    ├── ecommerce.md      # Local D2C — JSON-LD + delivery fields
    └── quickcommerce.md  # Quick commerce — on-demand delivery signals
```

---

## Testing the Skill

### 1. Install

```bash
npx skills add antstackio/skills
```

### 2. Trigger with a test prompt

Use any of these prompts in your AI assistant (Claude, Cursor, Copilot, Windsurf, etc.):

**Full audit:**
```
Audit this restaurant website for AI agent compatibility: https://example.com
```

**Schema + llms.txt generation:**
```
Generate structured data and an llms.txt for a dermatology clinic called Sunshine Skin Clinic at 42 5th Cross, Indiranagar, Bengaluru. They offer acne treatment, hair loss consultation, and skin allergy treatment. Open Mon–Fri 9am–8pm, Sat 9am–2pm. Rating: 4.6 from 128 reviews.
```

**Booking flow review:**
```
Review this booking flow and tell me where an AI agent would drop off: [paste HTML or describe the flow]
```

### 3. Verify the output

A correct skill response must include all five of:

| # | Deliverable | What to check |
|---|-------------|---------------|
| 1 | **Scorecard** | ✅ / ⚠️ / ❌ against all checklist items in all 3 layers |
| 2 | **Priority fixes** | Top 3 ranked by agent-preference impact, each actionable without follow-up |
| 3 | **Schema block** | Valid JSON-LD — paste into [Google Rich Results Test](https://search.google.com/test/rich-results) and verify no errors |
| 4 | **llms.txt draft** | Has business name, key page paths, booking policy, trust signals |
| 5 | **Booking flow notes** | Specific friction points (not generic advice) with concrete fixes |

### 4. Validate the schema output

Paste the generated JSON-LD into [Google Rich Results Test](https://search.google.com/test/rich-results). All required fields should show green with no missing-field warnings.

### 5. Check recommendation quality

Each recommendation must be specific enough to act on immediately. Flag it as a failure if the skill outputs anything like _"improve your structured data"_ without specifying exactly which fields to add, in which schema type, with what values.

---

## License

MIT
