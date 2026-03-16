# Restaurants / Cafes — Dual Consumption Reference

## Required Schema Type

`Restaurant` for full-service, `CafeOrCoffeeShop` for cafes, `FoodEstablishment` as fallback.

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "The Coastal Kitchen",
  "url": "https://coastalkitchen.in",
  "telephone": "+91-80-98765432",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12, 80 Feet Road, Koramangala 4th Block",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560034",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 12.9352,
    "longitude": 77.6245
  },
  "servesCuisine": ["Coastal Karnataka", "Mangalorean", "Seafood"],
  "priceRange": "₹₹",
  "hasMenu": "https://coastalkitchen.in/menu",
  "acceptsReservations": true,
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "12:00",
      "closes": "23:00"
    }
  ],
  "hasMenuItem": [
    {
      "@type": "MenuItem",
      "name": "Neer Dosa",
      "description": "Thin rice crepes served with coconut chutney and fish curry",
      "offers": { "@type": "Offer", "price": "120", "priceCurrency": "INR" },
      "suitableForDiet": "https://schema.org/GlutenFreeDiet"
    },
    {
      "@type": "MenuItem",
      "name": "Prawn Gassi",
      "description": "Mangalorean coconut-based prawn curry",
      "offers": { "@type": "Offer", "price": "380", "priceCurrency": "INR" }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.4",
    "reviewCount": "312",
    "bestRating": "5"
  },
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Outdoor Seating",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Parking",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Air Conditioning",
      "value": true
    }
  ]
}
```

## High-Impact Fields for Agent Preference

**`servesCuisine`** — Use standard cuisine terms. An agent asked "good South Indian near me" matches against this. "Coastal Karnataka" and "Mangalorean" are more specific and better than just "Indian".

**`hasMenuItem` with prices** — This is the tiebreaker. An agent asked "good seafood under ₹500 for two" needs to read your menu. If it's an image or PDF, you lose to a competitor with a crawlable menu.

**`priceRange`** — Use standard symbols: `₹` (under ₹500), `₹₹` (₹500–1500), `₹₹₹` (₹1500+) for two people. Agents use this for budget queries.

**`acceptsReservations: true`** — Without this, agents won't attempt to book a table.

**`suitableForDiet`** — Use Schema.org diet types: `VegetarianDiet`, `VeganDiet`, `GlutenFreeDiet`, `HalalDiet`. Agents filter on dietary requirements.

## Trust Signals Specific to Restaurants

- FSSAI licence number: show on page, add as `identifier` in schema
- `amenityFeature` list: parking, outdoor seating, private dining — agents match these to user preferences
- Speciality dishes: list top 3-5 as `hasMenuItem` with descriptions — agents cite these in recommendations
- Live music / events: if regular, add as `Event` children with schedule

## Booking Flow Notes

Restaurant booking is the highest delegation use case — users trust agents completely here.

- Table booking form needs: `date`, `time`, `party_size`, `name`, `phone` — nothing more
- Don't require account creation for a reservation — this breaks agent flows
- Send confirmation via SMS + email with restaurant address embedded
- If using a third-party reservation widget (Dineout, EazyDiner), ensure it loads within the page — not a redirect
