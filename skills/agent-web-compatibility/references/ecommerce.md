# Local E-commerce / D2C — Dual Consumption Reference

## Required Schema Type

`Store` for physical + online, `OnlineStore` for pure digital, `Product` for individual items.

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "name": "Daily Fresh Organics",
  "url": "https://dailyfreshorganics.in",
  "telephone": "+91-80-11223344",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Warehouse 3, KIADB Industrial Area",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560058",
    "addressCountry": "IN"
  },
  "areaServed": [
    { "@type": "City", "name": "Bengaluru" },
    { "@type": "DefinedRegion", "name": "560001" },
    { "@type": "DefinedRegion", "name": "560034" },
    { "@type": "DefinedRegion", "name": "560038" }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Organic Vegetables and Fruits",
    "itemListElement": [
      {
        "@type": "Product",
        "name": "Organic Tomatoes",
        "offers": {
          "@type": "Offer",
          "price": "80",
          "priceCurrency": "INR",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock",
          "deliveryLeadTime": {
            "@type": "QuantitativeValue",
            "minValue": 2,
            "maxValue": 4,
            "unitCode": "HUR"
          }
        }
      }
    ]
  },
  "hasMerchantReturnPolicy": {
    "@type": "MerchantReturnPolicy",
    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
    "merchantReturnDays": 1,
    "returnMethod": "https://schema.org/ReturnByMail",
    "returnFees": "https://schema.org/FreeReturn"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "203",
    "bestRating": "5"
  }
}
```

## High-Impact Fields for Agent Preference

**`deliveryLeadTime`** — The most important field for local e-commerce. An agent asked "order X that can be delivered today" filters entirely on this. Use `HUR` (hours) not `DAY` for same-day operations.

**`areaServed` with pin codes** — Agents match "deliver to Koramangala" against this. List every pin code you serve, not just the city name.

**`availability`** — Never show `InStock` when you're not. One failed order destroys agent trust permanently for that domain. Use `LimitedAvailability` when stock is low.

**`hasMerchantReturnPolicy`** — Agents factor return policy into purchase recommendations for unfamiliar brands. A clear, favourable return policy is a competitive advantage.

**`priceValidUntil`** — Agents know to distrust price data without an expiry. Keep it updated.

## Trust Signals Specific to E-commerce

- FSSAI number for food products (visible + in schema)
- Organic certification body (NPOP, PGS-India) as `certification` field
- Customer review count — `reviewCount` above 50 is the threshold where agents start trusting aggregate scores
- Founding year as `foundingDate` — newer stores get less agent confidence for first purchases

## Booking / Order Flow Notes

Local e-commerce "completability" means the cart-to-confirmation flow.

- Pin code check must happen before product browsing, not at checkout — agents don't handle late-stage delivery unavailability well
- Guest checkout must exist — account creation requirement causes agent dropout
- Payment methods: UPI and COD must be available — agents can't always handle saved card flows
- Order confirmation must include: item list with quantities, total, delivery window as specific time range (not "2-4 days"), tracking link placeholder
- SMS confirmation is required — many users check agent-placed orders via SMS, not email
