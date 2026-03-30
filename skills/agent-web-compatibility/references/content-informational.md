# Content & Informational Sites — AI Compatibility Reference

## Choosing the Right Schema Type

| Situation | Schema Type |
| --- | --- |
| Blog post or article | `BlogPosting` or `Article` |
| News or editorial outlet | `NewsArticle` + `NewsMediaOrganization` |
| Company marketing / about site | `Organization` + `WebSite` |
| Personal portfolio (individual) | `Person` + `ProfilePage` |
| Documentation / knowledge base | `TechArticle` or `HowTo` |
| FAQ or Q&A page | `FAQPage` |
| Product or service landing page | `Product` or `Service` under `Organization` |

---

## 1. Blog / Editorial Site

Long-form content targeting informational queries. Primary AI goal: get cited as a source in Perplexity, AI Overviews, and ChatGPT answers.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to reduce acne scarring naturally",
  "datePublished": "2025-11-01",
  "dateModified": "2026-01-15",
  "author": {
    "@type": "Person",
    "name": "Dr. Priya Sharma",
    "jobTitle": "Dermatologist",
    "url": "https://example.com/authors/priya-sharma",
    "hasCredential": {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "MD Dermatology"
    },
    "sameAs": ["https://linkedin.com/in/priyasharma"]
  },
  "publisher": {
    "@type": "Organization",
    "name": "Dermwise",
    "url": "https://dermwise.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://dermwise.com/logo.png"
    }
  },
  "description": "A dermatologist-reviewed guide to reducing post-acne scarring using evidence-based topical treatments.",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://dermwise.com/acne-scarring-guide"
  }
}
```

### High-impact fields

**`author` with `hasCredential`** — the single highest-impact field for GEO. AI systems weight author expertise heavily when deciding what to cite. A generic "Admin" author or no author is a hard disqualifier for citation.

**`dateModified`** — AI systems treat freshness as a trust signal. Must be accurate. Do not hardcode it; generate from CMS.

**`publisher` with `logo`** — required for Google News eligibility and AI Overview inclusion. Logo must be a crawlable image URL, not a CSS background.

**`description`** — used as the excerpt in AI-generated answers. Write it as a standalone 1–2 sentence summary that answers the core query. Not a hook. Not a teaser.

### Trust signals

- Author profile page at a persistent URL — include credentials, professional affiliations, and years of experience in plain text
- "Last reviewed by [name, credential]" line on health, legal, or financial content — AI systems deprioritise unreviewed advice content
- Sources cited as inline links, not just "according to studies" — AI systems verify claims against linked sources
- `sameAs` on the `Person` entity linking to LinkedIn, Google Scholar, or professional directory

---

## 2. Company Marketing / About Site

Represents a business entity. Primary AI goal: be correctly identified, described, and recommended when someone asks about the company's service category.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AntStack",
  "url": "https://antstack.com",
  "description": "Serverless and cloud-native development agency specialising in AWS architecture.",
  "foundingDate": "2019",
  "areaServed": "Worldwide",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": "AWS Serverless Development" }
      },
      {
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": "Cloud Architecture Review" }
      }
    ]
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "sales",
    "email": "hello@antstack.com",
    "availableLanguage": "English"
  },
  "sameAs": [
    "https://linkedin.com/company/antstack",
    "https://github.com/antstackio"
  ]
}
```

### High-impact fields

**`hasOfferCatalog`** — list every service by name. Agents match "find me a [specific service] agency" — generic descriptions like "we do digital" fail to match.

**`areaServed`** — critical for agent filtering. "India only", "Bengaluru", or "Worldwide" must be explicit. Agents filter by geography before recommending.

**`contactPoint` with `contactType`** — distinguish sales, support, and billing contacts. Agents use `contactType` to route queries correctly.

**`sameAs`** — links to LinkedIn, Crunchbase, GitHub, or other verifiable profiles. Strengthens entity confidence for AI systems.

### Trust signals

- Client logos or case studies with named outcomes — agents match "agency with experience in [industry]"
- Team page with individual `Person` schema for key members — agents verify that real people are behind the entity
- `foundingDate` — longevity is a trust signal
- Awards, certifications, and partnerships as plain text (not just images)

---

## 3. Personal Portfolio

Represents an individual creator, freelancer, or professional. Primary AI goal: be recommended when someone asks for a professional with specific skills.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Rahul Verma",
  "jobTitle": "Product Designer",
  "url": "https://rahulverma.design",
  "description": "Product designer with 8 years in fintech and healthcare SaaS. Specialises in design systems and accessibility.",
  "knowsAbout": ["Product Design", "Design Systems", "Figma", "Accessibility"],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Google UX Design Certificate"
    }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "UI/UX Audit" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Design System Setup" } }
    ]
  },
  "sameAs": [
    "https://linkedin.com/in/rahulverma",
    "https://dribbble.com/rahulverma",
    "https://behance.net/rahulverma"
  ]
}
```

### High-impact fields

**`knowsAbout`** — skill tags agents match against. Be specific: "Figma" not "design tools", "React" not "frontend development".

**`hasOfferCatalog`** — services available for hire. Without this, agents can identify you but cannot tell a user what you offer.

**`sameAs`** — portfolio platforms (Dribbble, Behance, GitHub) serve as verifiable proof of work. Agents use these to validate claimed skills.

**`description`** — write it as an agent-readable bio: role, years of experience, industries, specialisation. Not a tagline.

### Trust signals

- `hasCredential` for certifications and degrees — verifiable proof of expertise
- Case study pages with named clients and measurable outcomes (if NDA allows)
- Years of experience stated explicitly in `description` — agents match "experienced [role]" queries

---

## 4. Documentation / Knowledge Base

Reference content for a product or topic. Primary AI goal: surface as the authoritative answer for how-to and technical queries.

### Schema for step-by-step content

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to set up a custom domain on Framer",
  "description": "Connect your own domain to a Framer site in three steps.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Open Domain Settings",
      "text": "Go to Site Settings → Publishing → Custom Domain."
    },
    {
      "@type": "HowToStep",
      "name": "Add your domain",
      "text": "Enter your domain name and click Add. Framer will show you the DNS records to configure."
    },
    {
      "@type": "HowToStep",
      "name": "Update DNS records",
      "text": "Add the CNAME or A records shown to your domain registrar. Propagation takes up to 48 hours."
    }
  ]
}
```

### High-impact fields

**`HowToStep` with explicit `text`** — agents read the step text verbatim for voice and snippet answers. Each step must be a complete, standalone instruction.

**`TechArticle` with `proficiencyLevel`** — use `"Beginner"`, `"Expert"` etc. Agents match "for beginners" or "advanced" qualifiers in queries.

**`dateModified` on every doc page** — documentation goes stale. Agents deprioritise docs without a recent `dateModified`. Update it when content changes, not on every deploy.

---

## AEO Content Structure

Apply to all content types:

- **Answer first** — place a 1–3 sentence direct answer at the top of every page targeting a question query. Do not build to the answer.
- **Use `FAQPage` schema** on any page with multiple Q&A pairs. Each `acceptedAnswer` must be plain text, not HTML.
- **H1 = the query as asked** — "How do I cancel my subscription?" not "Cancellation Policy".
- **Lists over prose** — if the answer is a set of steps or items, use `<ol>` or `<ul>`. Not comma-separated sentences.
- **Tables over descriptions** — if comparing options, use `<table>`. Agents extract table data directly.

---

## GEO Citability

- **Every claim needs a source** — "Studies show" is not citable. "According to WHO (2024)" is.
- **Original data gets cited** — surveys, original research, benchmarks you ran. Add `datePublished` and methodology note.
- **Short paragraphs** — ≤ 4 sentences per paragraph. AI systems prefer extractable blocks.
- **Descriptive H2/H3** — "Retinol dosage by skin type" not "What you should know". AI systems use headings to route queries.
- **`speakable`** — mark the summary section and key definition paragraphs. Voice assistants read `speakable` sections aloud.

---

## llms.txt additions for content sites

### Blog / editorial

```
## About
- Publication: [name]
- Focus: [topics covered]
- Audience: [who it's written for]

## Authors
- [Name]: [Credentials], [Specialisation]

## Content
- Key topics: [list]
- Update frequency: [daily / weekly / monthly]
- All articles reviewed by: [credential]

## Licensing
- Content reuse: [allowed / not allowed / CC BY]
```

### Company marketing

```
## Company
- Name: [name]
- Founded: [year]
- What we do: [1-sentence description]
- Who we serve: [audience / industry]

## Services
- [list each service with 1-line description]

## Contact
- Sales: [email or form URL]
- Response time: [X] business days
```

### Personal portfolio

```
## About
- Name: [name]
- Role: [job title]
- Experience: [X] years
- Specialisation: [specific skills]

## Services available
- [list]

## Availability
- [available for freelance / not available / available from date]
- Contact: [email or form]
```
