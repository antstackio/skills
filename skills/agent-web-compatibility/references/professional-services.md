# Professional Services & SaaS — AI Compatibility Reference

## Choosing the Right Schema Type

| Situation | Schema Type |
| --- | --- |
| Agency or consultancy | `ProfessionalService` |
| Law firm | `LegalService` |
| Accounting / financial advisory | `AccountingService` |
| SaaS or web application | `SoftwareApplication` |
| Online course or training | `Course` + `EducationalOrganization` |
| In-person tutoring / coaching | `LocalBusiness` with `serviceType` |
| Hotel or accommodation | `LodgingBusiness` |
| Travel agency | `TravelAgency` |
| Job board / recruitment | `JobPosting` per listing + `Organization` |

---

## 1. Agency / Consultancy

Single-location or remote service business. Primary AI goal: be recommended when someone asks for a service provider in a specific domain.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Clearbridge Legal",
  "url": "https://clearbridgelegal.com",
  "description": "Commercial law firm specialising in startup contracts, IP, and employment law for early-stage companies.",
  "telephone": "+91-80-41234567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12 Lavelle Road",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560001",
    "addressCountry": "IN"
  },
  "areaServed": ["Karnataka", "Maharashtra", "Remote — Pan India"],
  "serviceType": ["Contract Drafting", "IP Registration", "Employment Agreements", "Fundraising Legal"],
  "employee": [
    {
      "@type": "Person",
      "name": "Adv. Meera Krishnan",
      "jobTitle": "Managing Partner",
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "LLM, National Law School"
      },
      "identifier": {
        "@type": "PropertyValue",
        "name": "Bar Council Registration",
        "value": "KAR/XXXX/2012"
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "43"
  }
}
```

### High-impact fields

**`serviceType` as an array** — list every service by its exact name. Agents match "find me a lawyer who does [specific service]" — "legal services" is not matchable. Use precise names: "ESOP drafting", not "startup law".

**`employee` with `identifier`** — professional registration numbers (Bar Council, ICAI, etc.) are the primary trust signal for regulated professions. Must appear in schema AND visibly on page.

**`areaServed`** — explicitly state geography and whether remote work is offered. Agents filter by location before recommending.

### Trust signals

- Registration numbers for regulated professionals (bar, medical, accounting) — visible on page and in schema
- Professional body memberships as `memberOf` — not images
- Years in practice per practitioner as plain text
- Named clients or case outcomes (with permission)
- Pricing model on page — "from ₹X" or "fixed fee / hourly" — agents use this for "affordable" queries

### Contact / inquiry flow notes

- Inquiry forms must have explicit `label` on every field and a `name`/`id` that describes the purpose (`matter_type`, `budget_range`, not `field_1`)
- Response time expectation on the thank-you page — agents relay this to users
- If consultation is paid, state fee before form submission — hidden fees cause agent dropout
- Calendar embed preferred over "we'll call you back"

---

## 2. SaaS / Web Application

Software product with a subscription or freemium model. Primary AI goal: be recommended when someone asks for a tool that does a specific thing.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Razorpay",
  "url": "https://razorpay.com",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Payment gateway for Indian businesses. Accepts cards, UPI, net banking, wallets, and EMI. No setup fee.",
  "featureList": [
    "UPI payments",
    "Payment links",
    "Subscription billing",
    "International payments",
    "Route — multi-party payments"
  ],
  "offers": [
    {
      "@type": "Offer",
      "name": "Pay-per-transaction",
      "price": "0",
      "priceCurrency": "INR",
      "description": "No monthly fee. Transaction fee from 2% per transaction."
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.4",
    "reviewCount": "2100",
    "bestRating": "5"
  }
}
```

### High-impact fields

**`featureList`** — the most important field for SaaS. Agents match "tool that does X" against `featureList`. Each entry should be a named capability, not a marketing phrase. "Multi-currency support" beats "go global".

**`applicationCategory`** — use Google's accepted categories: `BusinessApplication`, `FinanceApplication`, `DeveloperApplication`, `EducationApplication`, etc. Agents use this for category-level filtering.

**`offers` with pricing model** — freemium, pay-per-use, and subscription must be stated explicitly. Agents filter heavily on "free", "affordable", and "no credit card required" queries. If a free tier exists, mark it as a separate `Offer`.

**`operatingSystem`** — include `"Web"` for browser-based tools. Agents filter for "works on Mac", "mobile app available", etc.

### Trust signals

- G2 / Capterra / Product Hunt rating embedded as `aggregateRating` with source link
- SOC 2 / ISO 27001 / GDPR compliance stated as plain text (not just in footer)
- Integration list on a dedicated page, crawlable as plain text or schema — agents match "integrates with [tool]"
- Uptime SLA as a plain-text statement — agents parse for reliability signals

### SaaS-specific anti-patterns

| Anti-pattern | Why it hurts | Fix |
| --- | --- | --- |
| Pricing page behind login | Agents can't retrieve pricing | Public pricing page, even if simplified |
| Feature list as marketing copy | Not matchable by agents | Explicit `featureList` in schema + plain text list on page |
| "Contact sales for pricing" only | Agents won't recommend without price signal | Add at least a "starting from" or pricing model description |
| Changelog behind login | Agents can't verify freshness | Public changelog or `dateModified` on product pages |

---

## 3. Education / Courses

Online or in-person learning. Primary AI goal: be recommended when someone asks for a course or instructor covering a specific topic.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "AWS Solutions Architect Associate — Exam Prep",
  "description": "Comprehensive prep for the AWS SAA-C03 certification. Includes 30 hours of video, hands-on labs, and practice exams.",
  "provider": {
    "@type": "Organization",
    "name": "CloudAce Academy",
    "url": "https://cloudace.io"
  },
  "instructor": {
    "@type": "Person",
    "name": "Arun Nair",
    "jobTitle": "AWS Solutions Architect",
    "hasCredential": {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "AWS Certified Solutions Architect — Professional"
    }
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "duration": "PT30H",
    "startDate": "2026-04-01",
    "endDate": "2026-06-01",
    "courseWorkload": "PT5H"
  },
  "offers": {
    "@type": "Offer",
    "price": "2999",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  },
  "educationalCredentialAwarded": "Certificate of Completion",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "380"
  }
}
```

### High-impact fields

**`instructor` with `hasCredential`** — agents match "course taught by a certified [role]". A named, credentialled instructor is a stronger trust signal than an unnamed "expert".

**`hasCourseInstance` with `courseMode`** — `"online"`, `"onsite"`, or `"blended"`. Agents filter by delivery mode. `courseWorkload` (hours per week) helps agents answer "how much time does this take?"

**`educationalCredentialAwarded`** — whether the course gives a certificate. Agents match "certification course" vs "non-certified training".

**`offers` with `availability`** — mark `InStock`, `SoldOut`, or `PreOrder`. Agents won't recommend a sold-out cohort.

### Trust signals

- Instructor's credential must match the course topic — an AWS course taught by someone without AWS credentials ranks lower for agents
- Student count or completion rate as plain text — "3,000+ students enrolled"
- Prerequisite level stated explicitly — "beginner", "requires Python basics" — agents match to user skill level

---

## 4. Travel & Hospitality

Hotels, homestays, travel agencies. Primary AI goal: be recommended and have booking completed by an agent on the user's behalf.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": "The Bougainvillea Homestay",
  "url": "https://bougainvilleahomestay.com",
  "telephone": "+91-484-2345678",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "14 Lake Road, Kumarakom",
    "addressLocality": "Kottayam",
    "addressRegion": "Kerala",
    "postalCode": "686563",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 9.5916,
    "longitude": 76.4305
  },
  "checkinTime": "14:00",
  "checkoutTime": "11:00",
  "petsAllowed": false,
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Airport Transfer", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Breakfast Included", "value": true }
  ],
  "priceRange": "₹₹₹",
  "numberOfRooms": 6,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "214"
  }
}
```

### High-impact fields

**`checkinTime` / `checkoutTime`** — agents relay this to users planning itineraries. Must match what's on the booking form.

**`amenityFeature` as a structured list** — agents filter on "with pool", "breakfast included", "pet-friendly". Image-based amenity lists are invisible to agents.

**`petsAllowed`** — boolean. One of the most-filtered fields in travel queries. If true or false, mark it explicitly.

**`numberOfRooms`** — helps agents understand scale (homestay vs hotel). Small properties should mark this to avoid being compared to large chain hotels.

### Booking flow notes for travel

- Room availability must be queryable without account creation
- Cancellation policy in plain prose on the property page — not only at checkout. Agents read it before recommending.
- Taxes and fees shown on the listing page, not revealed at checkout — hidden fees are the top cause of agent dropout in travel booking
- Direct booking discount (if any) stated explicitly — agents factor this into recommendations over OTAs

---

## llms.txt additions

### Agency / professional service

```
## Services
- [list each service with 1-line description]
- Remote: Yes/No
- Geographies served: [list]

## Team
- [Name]: [Role], [Credentials], [Registration number if regulated]

## Engagement
- How to start: [contact form / calendar link / email]
- Response time: [X] business days
- Pricing model: [fixed / hourly / retainer / from ₹X]
```

### SaaS

```
## Product
- What it does: [1-sentence description]
- Category: [type of software]
- Pricing: [free / freemium / from $X/month]
- Free trial: Yes/No

## Key features
- [list]

## Integrations
- [list key integrations]

## Compliance
- [SOC 2 / GDPR / ISO 27001 — list what applies]
```

### Education

```
## Courses
- [Course name]: [topic], [duration], [price], [online/in-person], [certificate: yes/no]

## Instructors
- [Name]: [Credentials]

## Enrollment
- How to enroll: [URL]
- Next cohort: [date or "self-paced"]
```

### Travel & hospitality

```
## Property
- Type: [homestay / hotel / resort]
- Rooms: [number]
- Location: [area description]

## Policies
- Check-in: [time]
- Check-out: [time]
- Cancellation: [policy summary]
- Pets: [yes/no]

## Amenities
- [list key amenities]

## Booking
- Direct booking: [URL]
- Direct discount: [X% off OTA / none]
```
