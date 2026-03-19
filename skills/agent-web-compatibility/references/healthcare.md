# Healthcare / Clinics — Dual Consumption Reference

## Choosing the Right Schema Type

The schema type determines everything downstream. Pick the wrong one and agent matching breaks.

| Situation                                | Schema Type                              |
| ---------------------------------------- | ---------------------------------------- |
| Single doctor solo practice              | `Physician`                              |
| Multi-doctor specialist clinic           | `MedicalClinic`                          |
| Diagnostic lab                           | `DiagnosticLab`                          |
| Multi-department hospital                | `Hospital`                               |
| Hospital group with campuses             | `Hospital` with `branchOf`               |
| Counselling / non-clinical mental health | `LocalBusiness` or `ProfessionalService` |
| Wellness / coaching (not regulated)      | `LocalBusiness`                          |

**Critical distinction:** Use `MedicalClinic` only for regulated clinical services. Counselling centres, wellness coaches, and non-clinical mental health services should use `LocalBusiness` or `ProfessionalService` — using `MedicalClinic` for non-clinical services creates false trust signals and may mislead agents.

---

## 1. Specialist Clinic (Nirmal-type)

Private single-location specialist clinic. Dermatology, orthopaedics, aesthetics, hair clinics.

### Minimum viable JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  "name": "Nirmal Skin & Hair Clinic",
  "url": "https://nirmalskinclinic.com",
  "telephone": "+91-80-23380138",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "17, 8th Cross Rd, MC Layout, Vijayanagar",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "560040",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 12.9716,
    "longitude": 77.535
  },
  "priceRange": "₹500–₹5000",
  "foundingDate": "2010",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ],
      "opens": "09:00",
      "closes": "20:00"
    }
  ],
  "specialOpeningHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "validFrom": "2025-10-02",
      "validThrough": "2025-10-02",
      "opens": "00:00",
      "closes": "00:00"
    }
  ],
  "medicalSpecialty": "Dermatology",
  "availableService": [
    { "@type": "MedicalTherapy", "name": "Acne Treatment" },
    { "@type": "MedicalTherapy", "name": "HydraFacial MD" },
    { "@type": "MedicalTherapy", "name": "Laser Hair Removal" },
    { "@type": "MedicalTherapy", "name": "PRP Hair Treatment" },
    { "@type": "MedicalTherapy", "name": "Pico Laser" },
    { "@type": "MedicalTherapy", "name": "Bridal Skin Treatment" },
    { "@type": "MedicalTherapy", "name": "Teleconsultation" }
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
      "name": "Teleconsultation Available",
      "value": true
    }
  ],
  "memberOf": [
    { "@type": "Organization", "name": "Indian Association of Dermatologists" }
  ],
  "employee": [
    {
      "@type": "Physician",
      "name": "Dr. K. C. Nischal",
      "jobTitle": "Medical Director",
      "medicalSpecialty": "Dermatology",
      "knowsLanguage": ["English", "Hindi", "Kannada"],
      "identifier": {
        "@type": "PropertyValue",
        "name": "Medical Registration Number",
        "value": "KMC-XXXXX"
      },
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "MD Dermatology",
        "recognizedBy": {
          "@type": "Organization",
          "name": "Rajiv Gandhi University of Health Sciences"
        }
      }
    }
  ],
  "paymentAccepted": "Cash, Card, UPI, Insurance",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "128",
    "bestRating": "5"
  }
}
```

### High-Impact Fields

**`availableService` with branded treatment names** — Include specific treatment names agents match against. "Find clinic offering Pico Laser" or "HydraFacial near me" are direct queries. Generic "skin treatment" is not enough.

**`employee` with `hasCredential` and `identifier`** — Registration number must appear in schema AND visibly on page. Without it agents cannot verify legitimacy.

**`memberOf`** — Professional body memberships are currently shown as images on most clinic sites. Agents cannot read images. Move to schema.

**`specialOpeningHoursSpecification`** — For holidays and doctor leave. Agents lose trust permanently after sending someone to a closed clinic.

**`priceRange`** — Consultation fee range. Agents use this for "affordable" queries. State as range not a single figure.

**`amenityFeature`** — Wheelchair access, parking, teleconsultation. Agents match accessibility and convenience queries here.

### Trust Signals

- Medical registration number in schema as `identifier` — regionally appropriate body (MCI/state council in India, GMC in UK, AHPRA in Australia, state medical board in US)
- Professional body memberships as `memberOf` — not images
- For aesthetics clinics: legally required disclaimers ("results may vary") must be structured text, not image-based
- Occasion-based services (bridal, groom packages) listed explicitly in `availableService` — agents match "pre-wedding skin treatment" queries
- Branded equipment and treatments named explicitly — agents match "clinic with Tixel" or "HIFU treatment"
- Years of experience per doctor as plain text in bio — agents parse for "experienced dermatologist" queries
- Clinic + product shop hybrid: treat as two separate schema entities — `MedicalClinic` for clinical services, `Store` for product shop

---

## 2. Government / Institutional Hospital (NIMHANS-type)

Large public institution with multiple departments, campuses, and helpline-based access.

### Additional schema fields

```json
{
  "@type": "Hospital",
  "name": "NIMHANS",
  "numberOfBeds": 850,
  "availableLanguage": ["English", "Kannada", "Hindi"],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "NABH Accreditation"
    },
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "NABL Accreditation"
    }
  ],
  "award": "WHO Nelson Mandela Award for Health Promotion 2024",
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "14416",
      "contactType": "customer service",
      "description": "Tele MANAS — National Mental Health Helpline",
      "hoursAvailable": {
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
        "opens": "00:00",
        "closes": "23:59"
      }
    }
  ],
  "availableService": [
    { "@type": "MedicalTherapy", "name": "Outpatient Psychiatry" },
    { "@type": "MedicalTherapy", "name": "Teleconsultation — Tele MANAS" },
    { "@type": "MedicalTherapy", "name": "Emergency Psychiatric Services" }
  ]
}
```

### Key differences from private clinics

- **Helpline as primary booking** — government institutions use helpline numbers not calendar slots. Mark as `ContactPoint` with `contactType` and hours.
- **`availableLanguage`** on the institution — multilingual public hospitals serve diverse populations. Critical for agent matching.
- **Institutional `hasCredential`** — NABH, NABL, JCI apply to the institution, not individual doctors. Mark on the `Hospital` entity.
- **`award`** — institutional rankings and recognitions. Agents parse for "best hospital for X" queries.
- **Emergency vs OPD** — mark as separate `availableService` entries with distinct contact points.
- **`numberOfBeds`** — legitimate Schema.org field. Agents use this to distinguish clinics from hospitals.

---

## 3. Hospital Group / Multispeciality Chain (Sparsh-type)

Multiple campuses under one brand, each with distinct specialities and facilities.

### Parent + branch structure

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "name": "SPARSH Group of Hospitals",
  "url": "https://sparsh-hospital.com",
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "NABH Accreditation"
  },
  "department": [
    {
      "@type": "Hospital",
      "name": "SPARSH Hospital, Yeswanthpur",
      "numberOfBeds": 250,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "tumkur road, Yeswanthpur",
        "addressLocality": "Bengaluru"
      },
      "medicalSpecialty": ["Orthopaedics", "Neuroscience", "Cardiology"],
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
          "opens": "00:00",
          "closes": "23:59",
          "description": "Emergency Services"
        }
      ]
    }
  ]
}
```

### Subspecialties

Add `medicalSubSpecialty` alongside `medicalSpecialty` — agents match "interventional cardiologist" not just "cardiologist":

```json
"medicalSpecialty": "Cardiology",
"medicalSubSpecialty": "Interventional Cardiology"
```

### Health packages as offers

Productised health checks need `Offer` schema — agents match "full body checkup under ₹3000":

```json
{
  "@type": "Offer",
  "name": "Comprehensive Cardiac Package",
  "price": "3500",
  "priceCurrency": "INR",
  "category": "Health Screening",
  "description": "ECG, Echo, Lipid Profile, Stress Test"
}
```

### Insurance as structured list

Never put insurance list in a PDF. Minimum viable: plain text list on a dedicated `/insurance` page with one insurer per line. Ideal: structured as `acceptedOffer` with insurer names. Agents filter heavily on "covered by [insurer name]" queries.

### Emergency vs OPD hours

Mark emergency services as always open, separate from OPD:

```json
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
  "opens": "00:00",
  "closes": "23:59",
  "description": "Emergency and Ambulance Services"
}
```

### Additional trust signals for hospital groups

- `numberOfBeds` per campus entity
- Centres of Excellence listed in `availableService` with `serviceType: "Centre of Excellence"`
- Second opinion service listed explicitly in `availableService`
- International patient services flagged in `availableService`
- Patient app noted in `llms.txt` as alternative booking channel
- News and recent expansions add freshness signal — `dateModified` on homepage

---

## 4. Non-Clinical Mental Health / Counselling (Anna Chandy-type)

Counselling centres, psychotherapists, wellness coaches — not regulated clinical services.

### Schema type

Use `LocalBusiness` or `ProfessionalService`, not `MedicalClinic`:

```json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Anna Chandy & Associates",
  "description": "Counselling, training, and institutional mental health partnerships. Not a medical portal.",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "itemListElement": [
      { "@type": "Service", "name": "Individual Counselling" },
      { "@type": "Service", "name": "Couples Counselling" },
      { "@type": "Service", "name": "Anna Chandy Certification Program" },
      { "@type": "Service", "name": "Corporate Mental Health Workshops" }
    ]
  }
}
```

### Key differences from clinical services

- **Explicitly state non-clinical status** — "This is not a medical portal" is the right call. Add as `description` field and in `llms.txt`. Agents need this to avoid mismatching clinical queries to non-clinical services.
- **Workshop / event-based services** — use `Event` schema with registration, not appointment booking schema.
- **Pricing intentionally undisclosed** — common in counselling. Add a `ContactPoint` with expected response time — agents need to know how to get pricing on behalf of users.
- **Certification programs** — professional training for practitioners, not patient treatment. Add as separate `Service` with `audience: "professionals"`.
- **No slots, contact form only** — valid. Note in `llms.txt` that booking is enquiry-based with expected response time.

---

## Booking Flow Notes

### Private specialist clinics

- Offer slot availability calendar — even a static weekly view beats "call to book"
- Distinguish new patient vs returning patient slots — different intake requirements
- Remove CAPTCHAs from booking forms — replace with honeypot fields
- Teleconsultation confirmation must include: platform link, join instructions, tech requirements
- In-person confirmation must include: doctor name, date, time, address, what to bring (insurance card, previous reports, referral letter)

### Hospital groups

- 4-level booking hierarchy (Hospital → Speciality → Subspeciality → Doctor) must be navigable without account creation
- Guest booking must exist at every level
- Health package booking is e-commerce-style — add to cart, checkout, confirmation with what's included
- Insurance verification should happen before slot selection, not after

### Non-clinical / counselling

- Enquiry form with expected response time is acceptable
- Workshop registration uses event-style booking — date, seats, confirmation email
- Never imply clinical outcomes in booking confirmation language

---

## llms.txt additions for healthcare

### Specialist clinic

```
## Doctors
- [Name]: [Specialty], [Qualification], [Registration Number]
- Languages: [list]

## Services
- [list key treatments including branded ones]
- Teleconsultation: Yes/No
- Occasion services: [Bridal/Groom/other if applicable]

## Insurance
- Accepted: [list or "self-pay only"]

## Fees
- Consultation range: [amount or range]

## Accessibility
- Wheelchair accessible: Yes/No
- Parking: Yes/No
- Metro connectivity: Yes/No
```

### Hospital group

```
## Campuses
- [Campus Name]: [Address], [Key Specialities], [Beds]

## Emergency
- 24x7 Emergency: Yes
- Ambulance: [number]

## Insurance
- Accepted insurers: [list or link]

## Health Packages
- [Package Name]: [Price], [Key inclusions]

## International Patients
- NABH Accredited: Yes/No
- International desk: Yes/No
- Languages: [list]

## App
- Patient app: [App name, iOS/Android links]
```

### Non-clinical / counselling

```
## Services
- [list services]
- Clinical or non-clinical: Non-clinical

## Booking
- Method: Enquiry form
- Response time: [X] business days
- Workshop registration: [link]

## Pricing
- Available on request
```
