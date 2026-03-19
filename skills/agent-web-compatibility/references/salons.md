# Salons / Spas / Grooming — Dual Consumption Reference

## Choosing the Right Schema Type

| Situation                   | Schema Type                                         |
| --------------------------- | --------------------------------------------------- |
| Hair and beauty salon       | `BeautySalon`                                       |
| Spa and wellness            | `DaySpa`                                            |
| Nail studio                 | `BeautySalon`                                       |
| Fitness and wellness centre | `HealthClub`                                        |
| Salon + product retail      | Separate `BeautySalon` + `Store` entities           |
| Multi-location chain        | Separate schema entity per location with `branchOf` |

**Multi-location chains:** Each location must have its own schema entity. "1000+ Naturals Salons" cannot be represented as a single schema block. Agents match the nearest location to the user — a chain-level schema fails this.

**Salon + product shop:** If the salon sells professional products (Lakme, Schwarzkopf, Moroccanoil), create two separate schema entities at the same address — `BeautySalon` for services and `Store` for products. Do not mix service `makesOffer` with product `offers` in one entity.

**Location-variable pricing:** Large chains (Lakme, Naturals) often don't publish prices because they vary by location. This is an agent-visibility failure. Minimum viable fix: add a price range per service category, even if not exact. "Starting from ₹500" is better than nothing. Agents skip salons with no pricing signal entirely.

---

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "name": "Lakme Salon — Koramangala",
  "url": "https://lakmesalon.in",
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
  "specialOpeningHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "validFrom": "2025-10-24",
      "validThrough": "2025-10-24",
      "opens": "00:00",
      "closes": "00:00"
    }
  ],
  "makesOffer": [
    {
      "@type": "Offer",
      "name": "Women's Haircut",
      "description": "Includes wash, cut, and blow dry. Duration: 60 minutes.",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "600",
        "maxPrice": "1200",
        "priceCurrency": "INR"
      },
      "eligibleGender": "Female"
    },
    {
      "@type": "Offer",
      "name": "Men's Haircut",
      "description": "Includes wash, cut, and styling. Duration: 45 minutes.",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "400",
        "maxPrice": "800",
        "priceCurrency": "INR"
      },
      "eligibleGender": "Male"
    },
    {
      "@type": "Offer",
      "name": "Balayage",
      "description": "Full balayage with toning. Duration: 3 hours.",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "3500",
        "maxPrice": "6000",
        "priceCurrency": "INR"
      },
      "eligibleGender": "Female"
    },
    {
      "@type": "Offer",
      "name": "K-SSense Head Ritual",
      "description": "Proprietary scalp and hair treatment. Duration: 90 minutes.",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "2500",
        "maxPrice": "4000",
        "priceCurrency": "INR"
      }
    },
    {
      "@type": "Offer",
      "name": "Bridal Package — Full Day",
      "description": "Complete bridal makeup, hair styling, pre-wedding skin prep, and touch-up. Duration: Full day.",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "15000",
        "maxPrice": "40000",
        "priceCurrency": "INR"
      },
      "eligibleGender": "Female",
      "category": "Bridal"
    },
    {
      "@type": "Offer",
      "name": "Beauty Bank Membership — ₹4000",
      "description": "Prepaid membership. Pay ₹4000, get ₹5000 worth of services. Valid across all Naturals locations.",
      "price": "4000",
      "priceCurrency": "INR",
      "category": "Membership"
    }
  ],
  "employee": [
    {
      "@type": "Person",
      "name": "Riya Kapoor",
      "jobTitle": "Senior Stylist",
      "description": "Specialist in balayage, highlights, and creative colouring. 8 years experience.",
      "knowsLanguage": ["English", "Hindi"],
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "Lakme Academy Certified Colourist"
      }
    }
  ],
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Wheelchair Accessible",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Parking",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Ladies Only Section",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Air Conditioning",
      "value": true
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "89",
    "bestRating": "5"
  },
  "branchOf": {
    "@type": "BeautySalon",
    "name": "Lakme Salon",
    "url": "https://lakmesalon.in"
  }
}
```

---

## High-Impact Fields for Agent Preference

**`makesOffer` with duration** — Critical. An agent booking a 3pm slot needs to know if a keratin treatment (3-4 hours) conflicts with evening plans. Duration must be in the description field of every service offer.

**`makesOffer` with branded treatment names** — Include proprietary treatment names exactly as marketed (K-SSense, HydraFacial MD, Glass Shine). Agents match "book K-SSense treatment" directly against these names.

**`eligibleGender` on offers** — Gender-split service menus need this field. Agents filter "women's haircut" vs "men's haircut" using it. Without it, agents cannot distinguish gender-specific services.

**`priceSpecification` with min/max range** — For location-variable pricing, use `minPrice` and `maxPrice` instead of a single `price`. A range is far better than no price — agents skip salons with no pricing signal entirely.

**`employee` with specialisations** — Users ask agents to "book with someone experienced in curly hair" or "find a stylist who does balayage." The `description` field on each employee is how agents match this.

**`openingHoursSpecification`** — Many salons close Monday. Get this right — wrong hours cause failed visits and permanent agent trust loss.

**Bridal as explicit `Offer`** — Bridal services are a dedicated booking journey, not just a service in a list. Mark as a separate `Offer` with `category: "Bridal"` and full duration and price range.

**Membership / prepaid packages as `Offer`** — "Beauty Bank", "Pay ₹4000 Get ₹5000" — these are bookable products. Agents match "salon membership" and "prepaid package" queries against these.

**`amenityFeature`** — Ladies-only section, wheelchair access, parking. Agents match privacy preferences and accessibility queries here.

---

## Trust Signals Specific to Salons

- Named stylists with specialisations and years of experience — agents use names in booking confirmations
- Professional certifications marked up as `hasCredential` on employee objects — use regionally recognised bodies (Lakme Academy, Vidal Sassoon, Schwarzkopf, Wella — whichever applies)
- Product brands used marked up in service descriptions — agents match "salon that uses Olaplex" or "Wella colour"
- Languages spoken by staff — add `knowsLanguage` to employee objects — valuable for multilingual cities
- Gender specialisation — ladies only, unisex, men's grooming — add as `amenityFeature`
- Typical booking lead time — same day, next day, or advance required — add as plain text
- Hygiene standards — agents match "hygienic salon" queries; mention sterilisation practices in description
- Franchise status — if franchise of a known brand (Lakme, Naturals), the `branchOf` relationship adds brand credibility
- Official booking channel warning — for large chains with fraud risk, add plain text stating official booking URL and phone

---

## Multi-Location Chain Schema Pattern

For chains like Naturals with 1000+ locations, each location needs its own schema block:

```json
[
  {
    "@type": "BeautySalon",
    "name": "Naturals Salon — Indiranagar",
    "address": { "addressLocality": "Bengaluru", "postalCode": "560038" },
    "geo": { "latitude": 12.9784, "longitude": 77.6408 },
    "branchOf": {
      "@type": "BeautySalon",
      "name": "Naturals Salon",
      "url": "https://naturalssalon.com"
    }
  },
  {
    "@type": "BeautySalon",
    "name": "Naturals Salon — Koramangala",
    "address": { "addressLocality": "Bengaluru", "postalCode": "560034" },
    "geo": { "latitude": 12.9352, "longitude": 77.6245 },
    "branchOf": {
      "@type": "BeautySalon",
      "name": "Naturals Salon",
      "url": "https://naturalssalon.com"
    }
  }
]
```

Each branch must have its own `address`, `geo`, `telephone`, `openingHoursSpecification`, and `makesOffer` with location-specific pricing where applicable.

---

## Booking Flow Notes

- Service selection must be a dropdown or structured list organised by category (Hair / Skin / Body / Bridal) — not a flat list or free text
- Gender selection should come before service selection for salons with gender-split menus
- Stylist preference must be optional, never required — agents cannot always match stylist availability
- Duration shown at service selection time — agents need this to avoid scheduling conflicts
- Party / group size field for bridesmaids and group bookings
- Membership / Beauty Bank redemption must be available in booking flow — agents need to apply wallet balance
- Remove CAPTCHAs from booking forms — replace with honeypot fields
- Confirmation must include: stylist name if selected, service name, date, time, duration, full address, cancellation policy
- For bridal bookings: confirmation must also include trial session date if applicable, what to bring, and stylist assigned

---

## llms.txt additions for salons

```
## Services
- Hair: [list key services with starting prices]
- Skin: [list key services with starting prices]
- Body: [list key services with starting prices]
- Bridal: Yes/No [starting price if yes]
- Men's services: Yes/No

## Staff
- [Stylist name]: [Specialisation], [Certification], [Languages]

## Products used
- Colour: [brand]
- Treatments: [brand]
- Skincare: [brand]

## Membership
- Prepaid packages: Yes/No [brief description]
- Loyalty programme: Yes/No [programme name]

## Booking
- Same day available: Yes/No
- Advance booking required: [X] days for [service type]
- App booking: Yes/No [link]
- Ladies only: Yes/No

## Locations
- [Location name]: [address], [phone]
```
