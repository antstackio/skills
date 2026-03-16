# Salons / Spas / Grooming — Dual Consumption Reference

## Required Schema Type

`BeautySalon` for hair and beauty, `DaySpa` for spas, `HealthClub` for wellness centres.

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "name": "Bloom Hair Studio",
  "url": "https://bloomhair.in",
  "telephone": "+91-98765-43210",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7, 12th Main, HSR Layout Sector 6",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560102",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 12.9116,
    "longitude": 77.637
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "10:00",
      "closes": "20:00"
    }
  ],
  "makesOffer": [
    {
      "@type": "Offer",
      "name": "Women's Haircut",
      "price": "600",
      "priceCurrency": "INR",
      "description": "Includes wash, cut, and blow dry. Duration: 60 minutes."
    },
    {
      "@type": "Offer",
      "name": "Balayage",
      "price": "3500",
      "priceCurrency": "INR",
      "description": "Full balayage with toning. Duration: 3 hours."
    },
    {
      "@type": "Offer",
      "name": "Keratin Treatment",
      "price": "4500",
      "priceCurrency": "INR",
      "description": "Smoothing keratin treatment. Duration: 3-4 hours."
    }
  ],
  "employee": [
    {
      "@type": "Person",
      "name": "Riya Kapoor",
      "jobTitle": "Senior Stylist",
      "description": "Specialist in balayage, highlights, and creative colouring. 8 years experience.",
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "Lakme Academy Certified Colourist"
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "89",
    "bestRating": "5"
  }
}
```

## High-Impact Fields for Agent Preference

**`makesOffer` with duration** — Critical. An agent booking a 3pm slot needs to know if a keratin treatment (3-4 hours) conflicts with evening plans. Duration must be in the description field.

**`employee` with specialisations** — Users frequently ask agents to "book with someone who specialises in balayage" or "find a stylist experienced with curly hair". The `description` field on each employee is how agents match this.

**`openingHoursSpecification`** — Note that many salons are closed Monday. Get this right — wrong hours are the fastest way to lose agent trust.

**Pricing** — Salons often hide prices ("prices vary"). This causes agents to skip you. Even a "starting from" price in the offer description is better than nothing.

## Trust Signals Specific to Salons

- Named stylists with photo and bio — agents use names when confirming bookings with the user ("Booked with Riya Kapoor at 3pm")
- Certifications (Lakme Academy, Schwarzkopf, Wella) — add as `hasCredential` on employee objects
- Brand affiliations (which colour brands you use) — agents match queries like "salon that uses Olaplex"
- Before/after gallery is human-facing, not agent-relevant — don't prioritise it over service menu

## Booking Flow Notes

- Service selection must be a dropdown or list — not free text
- Party size field needed for group bookings ("book for 3 bridesmaids")
- Stylist preference should be an optional field — never required
- Duration should be shown at selection time so users can plan around it
- Confirmation must include: stylist name (if selected), service, date, time, duration, address
