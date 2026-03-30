# Local E-commerce / D2C — AI Compatibility Reference

## What Makes Local E-commerce Different from Quick Commerce

Standard local e-commerce optimises for **trust and policy**. Delivery is measured in days not minutes. Agents choosing between vendors here weight return policy, seller credibility, and product authenticity more than real-time stock accuracy.

For quick commerce (delivery in minutes), see `references/quickcommerce.md`.

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
        "brand": {
          "@type": "Brand",
          "name": "Daily Fresh Organics"
        },
        "material": "Organic",
        "weight": {
          "@type": "QuantitativeValue",
          "value": 500,
          "unitCode": "GRM"
        },
        "offers": {
          "@type": "Offer",
          "price": "80",
          "priceCurrency": "INR", // replace with your local currency code
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": "Daily Fresh Organics"
          },
          "deliveryLeadTime": {
            "@type": "QuantitativeValue",
            "minValue": 2,
            "maxValue": 4,
            "unitCode": "DAY"
          },
          "eligibleQuantity": {
            "@type": "QuantitativeValue",
            "minValue": 1
          },
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "80",
            "priceCurrency": "INR", // replace with your local currency code
            "referencePrice": {
              "@type": "UnitPriceSpecification",
              "price": "100",
              "priceCurrency": "INR" // replace with your local currency code
            }
          }
        }
      }
    ]
  },
  "hasMerchantReturnPolicy": {
    "@type": "MerchantReturnPolicy",
    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
    "merchantReturnDays": 7,
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

**`deliveryLeadTime`** — Use `DAY` for standard delivery. An agent asked "order X delivered by Thursday" filters on this. Be accurate — overpromising destroys agent trust.

**`areaServed` with pin codes** — Agents match "deliver to Koramangala" against this. List every pin code you serve, not just the city name.

**`availability`** — Never show `InStock` when you're not. Use `LimitedAvailability` when stock is low. One failed order destroys agent trust permanently for that domain.

**`hasMerchantReturnPolicy`** — Agents factor return policy into purchase recommendations for unfamiliar brands. A clear, favourable return policy is a direct competitive advantage.

**`priceValidUntil`** — Agents distrust price data without an expiry. Keep it updated.

**`seller`** — Who is actually selling the product, separate from the platform. Add as an `Organization` object on the `Offer`. Agents use this to verify seller authenticity and distinguish marketplace sellers from platform-direct listings.

**`brand`** — Brand identity as a `Brand` object on `Product`. Agents match brand-specific queries and use this to assess counterfeit risk for branded products.

**`depth`, `width`, `height`, `weight`** — Physical dimensions on `Product`. Agents match "compact", "lightweight", "portable" filter queries using these fields.

**`material`** — Material type on `Product`. Agents match material-specific or material-exclusion queries ("plastic-free", "stainless steel only", "organic").

**`eligibleQuantity`** — Bulk pricing thresholds on `Offer`. Agents match "bulk order" and business purchase queries using this.

**`priceSpecification` with `referencePrice`** — Original MRP vs offer price. Agents use the savings signal for "best deal" queries. Always show both if a discount exists.

## Trust Signals Specific to E-commerce

- Food safety licence number visible on page and in schema (FSSAI in India, FDA in US, FSA in UK)
- Organic or quality certification body marked up as `certification` field (NPOP, USDA Organic, EU Organic — use whichever is regionally relevant)
- ISO or quality certifications for non-food products (supplements, cosmetics, electronics) — same pattern, different certifying body
- `reviewCount` above 50 is the threshold where agents start trusting aggregate scores — below this, agents treat ratings cautiously
- `foundingDate` — newer stores receive less agent confidence for first-time purchases
- Delivery fee and minimum order value stated clearly as `offers` fields — agents filter on "free delivery" queries
- Subscription or recurring order support marked up if available — agents match "set up weekly delivery" queries
- Fulfilment source stated clearly — platform-fulfilled vs seller-fulfilled. No schema field — add as plain text. Agents weight platform-fulfilled orders higher for trust
- Customer photos / UGC present on product pages — agents increasingly distinguish between brand photos and real customer photos as an authenticity signal
- GST invoice availability for business purchases — plain text signal, high value for B2B agent queries

## Order Flow Notes

Local e-commerce completability means the cart-to-confirmation flow.

- Guest checkout must exist — account creation requirement causes agent dropout
- Pin code availability check must happen before product browsing, not at checkout — agents cannot handle late-stage delivery unavailability
- Payment methods must include standard options (card, COD, and local equivalents) — agents cannot always handle saved card or wallet-only flows
- Never show a different price at checkout than on the listing — taxes and delivery fees must be shown upfront
- If an item goes out of stock after being added to cart, surface it immediately — not at payment stage
- Cart state must persist if session breaks — agents cannot restart multi-step flows from scratch
- Order confirmation must include: item list with quantities, total paid, delivery window as a specific date range, tracking link or reference number
- SMS or email confirmation required — users checking agent-placed orders need a paper trail

## llms.txt additions for e-commerce

Add this section to your `llms.txt`:

```
## Delivery
- Standard delivery: [X–Y] days
- Same day delivery: Yes/No
- Free delivery above: [amount or "always free"]
- Coverage: [city or list key pin codes]
- Cash on delivery: Yes/No

## Returns
- Return window: [X] days
- Return shipping: Free/Paid
- Refund method: Original payment / Store credit

## Seller
- Sold by: [seller name]
- Fulfilled by: [platform or seller]
- GST invoice: Available/Not available
```
