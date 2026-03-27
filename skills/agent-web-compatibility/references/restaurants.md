# Restaurants / Cafes — AI Compatibility Reference

## Choosing the Right Schema Type

| Situation                   | Schema Type                                  |
| --------------------------- | -------------------------------------------- |
| Full-service restaurant     | `Restaurant`                                 |
| Cafe or coffee shop         | `CafeOrCoffeeShop`                           |
| Bakery                      | `Bakery`                                     |
| Food truck                  | `FoodEstablishment`                          |
| Multi-brand at one location | Separate schema entity per brand, same `geo` |
| Multi-location chain        | Separate schema entity per location          |

**Multi-location chains:** Each location must have its own schema entity with its own `address`, `geo`, `telephone`, and `openingHoursSpecification`. A single schema block for the whole chain is not enough — agents match against specific locations, not brand names.

**Co-located brands:** If two brands operate from the same address (e.g. a burger restaurant and a cafe sharing one space), create two separate schema entities with the same `geo` coordinates but different `name`, `servesCuisine`, and `hasMenuItem`.

**Social-first brands:** Many newer restaurants keep their menu on Instagram, not their website. Agents cannot read Instagram. A website with no crawlable menu is invisible to agents for query matching. Minimum viable fix: add a plain HTML menu page with prices, even if the design is basic.

---

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Just Loaf — Koramangala",
  "url": "https://justloaf.in",
  "telephone": "+91-XXXXXXXXXX",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "5000 sq ft flagship, Koramangala",
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
  "servesCuisine": ["American", "Burgers", "Breakfast", "Specialty Coffee"],
  "priceRange": "$$",
  "hasMenu": "https://justloaf.in/menu",
  "acceptsReservations": false,
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
      "opens": "08:00",
      "closes": "23:00"
    }
  ],
  "specialOpeningHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "validFrom": "2025-12-25",
      "validThrough": "2025-12-25",
      "opens": "10:00",
      "closes": "22:00"
    }
  ],
  "hasMenuItem": [
    {
      "@type": "MenuItem",
      "name": "Classic Beef Burger",
      "description": "100% meat hand-formed patty, grilled fresh, with signature toppings",
      "offers": {
        "@type": "Offer",
        "price": "249",
        "priceCurrency": "INR"
      },
      "suitableForDiet": "https://schema.org/LowCalorieDiet"
    },
    {
      "@type": "MenuItem",
      "name": "American Breakfast Platter",
      "description": "Eggs, toast, hash brown, and fresh juice. Available from 8am.",
      "offers": {
        "@type": "Offer",
        "price": "349",
        "priceCurrency": "INR"
      }
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
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Pet Friendly",
      "value": false
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Live Music",
      "value": false
    }
  ],
  "foundingDate": "2019",
  "description": "Fresh hand-formed burgers and American breakfast. Founded by seven friends in Kerala, now expanded across South India.",
  "identifier": {
    "@type": "PropertyValue",
    "name": "FSSAI Licence",
    "value": "XXXXXXXXXXXXXX"
  }
}
```

---

## High-Impact Fields for Agent Preference

**`servesCuisine`** — Use standard terms plus specific ones. "Burgers" and "American Breakfast" are more matchable than just "American". For fusion cuisines, list all that apply — agents match the most specific term first.

**`hasMenuItem` with prices** — The single highest-impact addition for most restaurant sites. An agent asked "burgers under ₹300 near Koramangala" needs to read your menu. If it's an image, PDF, or only on Instagram — you lose to any competitor with a crawlable menu.

**`priceRange`** — Use `$`, `$$`, `$$$`, `$$$$` as currency-neutral symbols, or an explicit local range. Agents use this for budget queries globally.

**`acceptsReservations`** — Set explicitly. `true` tells agents to attempt booking. `false` tells agents to direct users to walk in or order online instead. Leaving it absent causes agent uncertainty.

**`openingHoursSpecification`** — Include breakfast hours if you open early. Many schemas only mark lunch/dinner. An agent asked "breakfast place open at 8am" won't find you if your schema says opens at 12:00.

**`specialOpeningHoursSpecification`** — For holiday hours, temporary closures, Ramadan timings, festival specials. Agents lose trust after one failed visit.

**`suitableForDiet`** — Use Schema.org types: `VegetarianDiet`, `VeganDiet`, `GlutenFreeDiet`, `HalalDiet`, `KosherDiet`. Agents filter on dietary requirements before anything else for users with restrictions.

**`amenityFeature`** — Pet friendly, rooftop, outdoor seating, parking, live music, private dining. Agents match vibe and occasion queries here.

**`foundingDate` and `description`** — Brand story signals. Founding year, origin story summary, unique positioning. Agents use these for "authentic", "local", "established" type queries. Don't leave this in unstructured prose only.

---

## Trust Signals Specific to Restaurants

- Food safety licence number visible on page and in schema as `identifier` — use regionally appropriate body (FSSAI in India, FSA in UK, FDA in US)
- Cuisine tags using standard terms — avoid invented or overly niche labels that agents won't match
- Price range using `priceRange` field — currency-neutral symbols preferred for global compatibility
- Actual menu with prices in structured format — not image, not PDF, not Instagram-only
- Hygiene or food safety rating if available from local regulatory body
- Dietary indicators: veg-only, non-vegetarian, vegan options, Halal, Kosher, Jain — whichever apply
- `amenityFeature` list: parking, outdoor seating, rooftop, private dining, pet friendly
- Speciality or signature dishes listed in `hasMenuItem` with descriptions — agents cite these in recommendations
- Live music or regular events: add as `Event` children with schedule if recurring
- Franchising available: add as plain text and in `llms.txt` — agents match "franchise opportunity" queries

---

## Multi-Location Chain Schema Pattern

For chains like Just Loaf with 6+ locations, create one schema block per location:

```json
[
  {
    "@type": "Restaurant",
    "name": "Just Loaf — Koramangala",
    "address": { "addressLocality": "Bengaluru", "postalCode": "560034" },
    "geo": { "latitude": 12.9352, "longitude": 77.6245 },
    "branchOf": {
      "@type": "Restaurant",
      "name": "Just Loaf",
      "url": "https://justloaf.in"
    }
  },
  {
    "@type": "Restaurant",
    "name": "Just Loaf — Calicut",
    "address": { "addressLocality": "Kozhikode", "postalCode": "673001" },
    "geo": { "latitude": 11.2588, "longitude": 75.7804 },
    "branchOf": {
      "@type": "Restaurant",
      "name": "Just Loaf",
      "url": "https://justloaf.in"
    }
  }
]
```

Each branch must have: own `address`, `geo`, `telephone`, `openingHoursSpecification`. Agents match the nearest branch to the user's location — a single entity for the whole chain fails this match.

---

## Co-Located Multiple Brands

When two brands share one address (Just Loaf + Daily Bakehouse at Koramangala):

```json
[
  {
    "@type": "Restaurant",
    "name": "Just Loaf — Koramangala",
    "servesCuisine": ["Burgers", "American Breakfast"],
    "geo": { "latitude": 12.9352, "longitude": 77.6245 }
  },
  {
    "@type": "CafeOrCoffeeShop",
    "name": "Daily Bakehouse",
    "servesCuisine": ["Specialty Coffee", "Artisan Bakery"],
    "geo": { "latitude": 12.9352, "longitude": 77.6245 },
    "containedInPlace": {
      "@type": "Restaurant",
      "name": "Just Loaf — Koramangala"
    }
  }
]
```

Same `geo`, different schema entities, `containedInPlace` relationship to signal physical co-location.

---

## Booking Flow Notes

Restaurant booking is the highest delegation use case — users trust agents completely here.

- Table booking form needs: `date`, `time`, `party_size`, `name`, `phone` — nothing more
- Don't require account creation for a reservation — this breaks agent flows
- Remove CAPTCHAs from booking forms — replace with honeypot fields
- Send confirmation via SMS + email with full restaurant address and Google Maps link embedded
- If using a third-party reservation widget (Dineout, EazyDiner, Resy), embed within page — never redirect mid-flow
- If reservations not accepted (`acceptsReservations: false`), provide a clear alternative in schema — walk-in only, phone order, or online delivery link
- For breakfast-serving restaurants: confirm in booking that the time slot requested falls within breakfast service hours

---

## llms.txt additions for restaurants

```
## Cuisine
- Type: [list cuisines]
- Veg only / Non-veg / Both
- Halal: Yes/No
- Jain options: Yes/No
- Vegan options: Yes/No

## Hours
- Open: [days and times]
- Breakfast service: [start time] (if applicable)
- Closed: [day if applicable]

## Dining
- Reservations: Yes/No
- Walk-in: Yes/No
- Outdoor seating: Yes/No
- Pet friendly: Yes/No
- Private dining: Yes/No

## Price
- Range: [$ / $$ / $$$ or explicit range per person]
- Signature dishes: [2-3 dish names with prices]

## Locations
- [Location name]: [address], [phone]
- [Location name]: [address], [phone]

## Franchise
- Franchising available: Yes/No [link if yes]
```
