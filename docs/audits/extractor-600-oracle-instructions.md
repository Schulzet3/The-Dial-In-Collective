# Independent 600-coffee source oracle

This is a source-review protocol, not an extractor-generated expectation set.
The owner requested at least 200 distinct U.S. roasters and three distinct
coffees per roaster, with no API keys or additional incurred costs.

## Fixed membership

Each reviewer freezes the first 50 currently eligible roasters from their
assigned eligibility review, using its exact `selected_urls`. Freeze IDs before
resolving additional earlier nulls. Root selects 50 further eligible businesses,
including broader storefront platforms. Keep all exclusions and unavailable
sources. Do not replace a source because the extractor performs poorly on it.

## Independence and completeness

Read every selected public HTML page and its exact public product endpoint.
Review identity, visible product specifications and story, structured product
properties, accessible image text, recipe sections, and purchase options. Refer
to original markup when a label, control, hidden panel, variant, or neighboring
product makes the packet ambiguous. Neither the production parser nor its
per-coffee output may be used to produce expectations. Raw-source scripts can
assist reading and indexing, but each case needs actual reviewer inspection.

Record individually meaningful published facts. Keeping an entire description
as one quote does not excuse missing its variety, origin, producer, process,
harvest, altitude, tasting notes, recipe, or other concrete information. Preserve
raw words and units. Distinguish ambiguous source claims from absent fields.
Never invent a producer from a name, harvest from a URL, roast from bag color,
or tasting note from a mention of growing conditions. Generic roaster history,
recommendation cards, navigation, and shipping policies are not coffee facts.

Image pixels, videos, linked PDFs, JavaScript-only panels, and unavailable URLs
must have explicit reviewed, blocked, or not-reviewed status. An accessible-text
review is not proof that image-only or rendered content contains no additional
facts. Record identifiable unexamined sources for a later no-cost follow-up.

## JSON shape

The output is an array of case records. Use the capture's actual `id` as
`case_id`; immutable packets own source URLs, hashes, response statuses and
sizes. Evidence quotes must occur in the identified captured source after
whitespace normalization. For JSON values, a faithful stringified scalar or
array is acceptable. `locator` explains the context when needed.

```json
{
  "case_id": "roaster-id__product-hash",
  "roaster_id": "roaster-id",
  "source_url": "https://official.example/products/coffee",
  "reviewed_sources": [
    {"capture_id": "page", "kind": "html", "status": "reviewed"},
    {"capture_id": "product-endpoint", "kind": "product_json", "status": "reviewed"}
  ],
  "canonical": {
    "variety": {
      "value": "Bourbon Ají",
      "evidence": [{"capture_id": "page", "quote": "Variety: Bourbon Ají"}]
    }
  },
  "additional_facts": [
    {
      "label": "Drying duration", "value": "18 days", "context": "Current coffee",
      "evidence": [{"capture_id": "page", "quote": "dried for 18 days"}]
    }
  ],
  "ambiguities": [],
  "not_observed_fields": [],
  "blocked": [],
  "review": {
    "annotator": "reviewer-id", "locked_at": "ISO-8601 UTC",
    "extractor_outputs_seen": false
  }
}
```

Canonical keys: `name`, `roaster`, `release_label`, `origin`, `roast_level`,
`elevation_m`, `process`, `variety`, `producer`, `tasting_notes`.
`value` is the expected substantive published value. Optional `accepted_values`
may list genuinely equivalent spellings or approved enum representations, with
an explanation; it must not dilute missing components or resolve contradictions.
When no approved canonical representation exists, retain the literal value as
a supplementary fact and record that limitation.

An ambiguity has `field_or_label`, `alternatives` with values and evidence,
`reason`, and `expected: "withhold"` or `"review_separately"`. Product variants
and brewing methods must keep their own context; never combine measurements
from different alternatives into a synthetic recipe or price.

Freeze the completed oracle and its SHA-256 before comparing extracted results.
Any later correction to an oracle needs its own source-backed correction log;
an extraction mismatch alone is not grounds to weaken the expectation.
