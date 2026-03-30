# Quick Commerce — AI Compatibility Reference

## What Makes Quick Commerce Different

Standard e-commerce optimises for trust and policy. Quick commerce optimises for **real-time accuracy**. An agent choosing between two q-commerce vendors picks the one whose data is most live — not the one with the best return policy.

The entire value proposition of quick commerce is speed and availability. If your schema says "in stock" when you're out, or "20 mins" when it's actually 90, the agent loses trust permanently for that domain.

**App-first note:** Many quick commerce platforms are primarily app-based. Web schema still matters — agents crawl web, not apps. Even if 90% of orders come through the app, the web presence determines agent discoverability.

## Required Schema Type

`OnlineStore` for the business entity, `Product` for individual items, `Offer` for pricing and delivery details at product level.

## Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "name": "QuickBasket",
  "url": "https://quickbasket.in",
  "telephone": "+91-80-99887766",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Dark Store 4, Koramangala Industrial Layout",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560034",
    "addressCountry": "IN",
    "description": "Dark store — not a customer-facing retail location"
  },
  "numberOfLocations": 4,
  "areaServed": [
    { "@type": "DefinedRegion", "name": "560034" },
    { "@type": "DefinedRegion", "name": "560038" },
    { "@type": "DefinedRegion", "name": "560095" }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Grocery and Daily Essentials",
    "itemListElement": [
      {
        "@type": "Product",
        "name": "Amul Butter 500g",
        "brand": { "@type": "Brand", "name": "Amul" },
        "weight": {
          "@type": "QuantitativeValue",
          "value": 500,
          "unitCode": "GRM"
        },
        "offers": {
          "@type": "Offer",
          "price": "275",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "inventoryLevel": {
            "@type": "QuantitativeValue",
            "value": 14
          },
          "deliveryLeadTime": {
            "@type": "QuantitativeValue",
            "minValue": 15,
            "maxValue": 25,
            "unitCode": "MIN"
          },
          "priceSpecification": [
            {
              "@type": "UnitPriceSpecification",
              "price": "275",
              "priceCurrency": "INR",
              "referenceQuantity": {
                "@type": "QuantitativeValue",
                "value": 500,
                "unitCode": "GRM"
              }
            },
            {
              "@type": "DeliveryChargeSpecification",
              "price": "0",
              "priceCurrency": "INR",
              "eligibleTransactionVolume": {
                "@type": "PriceSpecification",
                "price": "199",
                "priceCurrency": "INR"
              }
            }
          ]
        }
      },
      {
        "@type": "Product",
        "name": "Bisleri Packaged Water — Pack of 24",
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "131",
          "highPrice": "132",
          "priceCurrency": "INR",
          "offerCount": 2,
          "availability": "https://schema.org/InStock",
          "deliveryLeadTime": {
            "@type": "QuantitativeValue",
            "minValue": 15,
            "maxValue": 25,
            "unitCode": "MIN"
          }
        }
      }
    ]
  },
  "paymentAccepted": "Cash, Card, UPI, COD",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.3",
    "reviewCount": "1840",
    "bestRating": "5"
  }
}
```

## High-Impact Fields for Agent Preference

**`deliveryLeadTime` at product level, in minutes (`unitCode: "MIN"`)** — The most critical field. Must be on each `Offer`, not just the store entity. Different products may have different delivery windows depending on dark store section. An agent asked "order milk that arrives in 20 minutes" filters at product level, not store level.

**`inventoryLevel`** — Real-time stock count per product. Not just in-stock/out-of-stock. Agents use this to avoid recommending items that will go out of stock between recommendation and checkout. If live sync isn't possible, use `LimitedAvailability` when count drops below 5.

**`availability`** — Must reflect actual warehouse state at time of crawl. Never hardcode `InStock`. If you can't keep this live, update on a schedule and add `dateModified` to signal when it was last accurate.

**`UnitPriceSpecification` with `referenceQuantity`** — Per-unit pricing. Agents comparing "cheapest milk per litre" or "best value butter per gram" need this. Without it, agents cannot compare value across pack sizes.

**`AggregateOffer` for multi-pack options** — When a product comes in multiple pack sizes (250ml, 1L, Pack of 24), use `AggregateOffer` with `lowPrice` and `highPrice` range.

**`priceSpecification` with `referencePrice`** — Original MRP vs offer price. Discount percentage. Agents match "best deals on X" and "cheapest Y" queries using savings signals.

**`areaServed` with pin codes** — Quick commerce coverage is hyperlocal. List every pin code your dark store covers. An agent that recommends you outside your zone creates a failed experience.

**`brand`** on each product — Agents match brand-specific queries ("order Amul butter", "get Nandini milk"). Without brand markup, agents cannot distinguish between similar products from different brands.

**Category structure** — Organise `hasOfferCatalog` with named category groupings (Dairy, Snacks, Pharma, Baby Care). Agents match "order baby care products" against category names.

**`numberOfLocations`** — Multiple dark stores = faster delivery and wider coverage. Higher number signals more reliable service.

**Delivery fee and minimum order** — Use `DeliveryChargeSpecification` with `eligibleTransactionVolume` for free delivery threshold. Agents filter on "free delivery" queries constantly.

## Trust Signals Specific to Quick Commerce

- **Fulfilment rate** — Percentage of orders completed on time. No Schema.org field yet — add as plain text: "98% on-time fulfilment rate." Agents parse this.
- **Dark store count and locations** — List as `numberOfLocations`. Multiple locations = wider coverage and faster delivery.
- **Cold chain capability** — Dairy, meat, ice cream — mark in product description and as `additionalProperty`. Agents match "cold storage delivery" queries.
- **Eco-friendly packaging** — Growing filter query globally. Add as `additionalProperty` on store entity.
- **Marketplace vs owned inventory** — If platform sells third-party seller products, mark `seller` on each `Offer`. Agents use this for authenticity signals.
- **Pharma category licence** — If selling OTC medicines, food safety or pharmacy licence number must appear on page and in schema as `identifier`. Prescription medicines require separate handling — agents must flag these to humans.
- **Age-restricted categories** — Rolling papers, tobacco, alcohol — add `audience` with `requiredMinAge` on restricted products. Agents cannot verify age themselves and must flag to the human for confirmation.

## Real-Time Data Requirements

Quick commerce has the strictest freshness requirements of all verticals:

| Data type              | Maximum acceptable staleness |
| ---------------------- | ---------------------------- |
| Stock availability     | 5 minutes                    |
| Delivery time estimate | 10 minutes                   |
| Pricing                | 24 hours                     |
| Discount / offer price | 1 hour                       |
| Area served            | 7 days                       |

If your site cannot meet these freshness windows, add a visible `dateModified` timestamp on product pages. Stale data with a timestamp is more trustworthy than stale data with no timestamp.

## Order Flow Notes

**Location precision**
Pin code is minimum viable. Landmark is better. Agents handling "deliver to my office at Yeshwanthpur Railway Station" need landmark-level address matching, not just pin code. Support landmark or building name in the delivery address field.

**Age-gated products**
Agents cannot verify user age. For tobacco, alcohol, or other age-restricted products — the flow must surface an age confirmation step that the human must complete. Agents should be informed via schema `requiredMinAge` that human confirmation is needed before completing this transaction.

**Pharma products**
OTC medicines can be completed by agents. Prescription medicines cannot — the flow must require prescription upload or pharmacist verification. Mark prescription requirement clearly in product schema as `additionalProperty`.

**Pin code gate must be first** — Before any product is shown, verify delivery availability. Agents cannot handle "sorry we don't deliver here" at checkout.

**Slot vs on-demand clarity** — State upfront whether delivery is on-demand or slot-based. Agents need this to match user intent.

**No account creation at checkout** — Guest checkout is mandatory. Agents will abandon account-gated flows.

**Real-time cart validation** — If an item goes out of stock after being added to cart, surface it immediately — not at payment.

**Multi-pack selection** — When product has multiple pack sizes, each must be a selectable option with distinct price, weight, and delivery time. Agents need to pick the right size based on user query ("order 1 litre milk" should not default to 500ml).

**Order confirmation must include** — Item list with quantities and pack sizes, total paid, estimated delivery as a specific clock time ("arriving by 4:45 PM", not "in 20-30 mins"), dark store contact number.

## Dark Store Address Note

The `address` field in schema for quick commerce points to a dark store or warehouse — not a customer-facing retail location. Always add a `description` field clarifying this. Agents should not send users to this address physically.

## llms.txt additions for quick commerce

```
## Delivery
- On-demand delivery: Yes/No
- Average delivery time: [X] minutes
- Delivery hours: [e.g. 6 AM – 12 AM]
- Free delivery above: [amount or "always free"]
- Coverage: [list key neighbourhoods or pin codes]
- Dark store locations: [count]

## Availability
- Inventory updated every: [X] minutes
- Out of stock items: removed from listing / shown as unavailable

## Categories
- [list main product categories]
- Pharma / OTC: Yes/No
- Age-restricted products: Yes/No

## Fulfilment
- On-time rate: [X]%
- Cold chain: Yes/No
- Eco-friendly packaging: Yes/No
```
