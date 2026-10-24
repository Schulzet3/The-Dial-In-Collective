# Review image-only coffee information locally

The optional companion reads the app's **Download Source Review** JSON and explicitly selected local images. It uses the installed Tesseract executable and Pillow, makes no network requests, and writes a separate human-readable review package. It does not install software, fetch the roaster page, import an account backup, send images anywhere, change the application, or fill/approve coffee fields.

## Use

You need Python 3, Pillow, Tesseract, and an installed text language such as `eng`. The bounded runner uses POSIX resource limits: run it on Linux, macOS with a compatible installed Tesseract, or WSL. The verified environment is recorded in the accompanying tests; other local installations may differ. Missing tools/languages cause a clear stop, never a download.

1. In the New Coffee form, run **Autofill From URL**, then **Download Source Review**.
2. Save an image from the actual product page, or take a screenshot/photo showing the label. Confirm the product and release yourself. The helper cannot establish that a selected image belongs to the exported coffee.
3. From the repository directory, run the command below. The output directory must not already exist.

```bash
python3 scripts/audit/coffee-source-review-local.py \
  --review /absolute/path/Coffee_Source_Review.json \
  --image /absolute/path/coffee-label.png \
  --output /absolute/path/new-coffee-image-review
```

Repeat `--image` for up to four distinct images. PNG, JPEG and single-frame WebP are supported. PDF, SVG, animated images, remote URLs, links and device inputs are rejected. `--psm 11` is the default for scattered bag-label text; try a **new output directory** with `--psm 6` for one compact paragraph. `--language eng+spa` works only if both text languages are already installed. No language is downloaded.

4. Open `review.html` locally. It contains the original suggestions, image previews, OCR transcripts, word confidences and the complete validated source export. It uses no JavaScript, external styles, remote images or links, and its policy blocks network connections.
5. Compare every candidate fact against the original image and current product page/bag. Pay particular attention to accents, cultivar names, numbers, units, ranges and old-release imagery. Resolve contradictions or leave the field blank. Enter reviewed facts manually in the existing app form if appropriate.

## Files and provenance

- `review.json`: separate `coffee_local_image_review` schema, untouched original export content, its byte hash, selected image hashes, processed image hashes, engine/model versions and hashes, raw OCR text, confidence per word, bounding boxes, and pending-human-review status.
- `review.html`: safe, readable, self-contained review with local image previews. All source/OCR text is escaped. Confidence is recognition confidence, **not** factual certainty or proof of current product identity.
- `image-01.ocr.png` (and subsequent numbers): the exact normalized pixels sent to Tesseract, with image metadata removed. Transparency is placed on white; EXIF orientation is applied; oversized accepted images are downsampled.
- `image-01.ocr.txt` and `.ocr.tsv`: complete bounded raw text and word-position/confidence outputs when OCR succeeds. Their hashes are recorded. Empty OCR is explicitly distinguished from processing failure.

Nothing is auto-accepted. OCR never creates a new `field_suggestions` map; the original export's suggestions remain nested as original evidence. The review output is **not** an application import/backup file. The selected filename and image preview may contain private information; share the package only intentionally. Output files use owner-only permissions where supported.

## Limits and failures

The helper accepts a source export of at most 512,000 bytes and up to four images of 12,000,000 bytes / 16 million pixels each, with a 10,000-pixel maximum side. OCR receives at most four million pixels / a 3,000-pixel side. Each local OCR process has a 40-second wall-clock limit, a 35-second CPU limit, 768 MiB address-space limit and a bounded output file size. Image decoding is also bounded by the accepted byte/dimension/pixel limits.

OCR text is limited to 100,000 bytes per image, TSV to one million bytes, and words to 5,000. Combined JSON and HTML have separate three-million/five-million-byte limits. Oversized evidence is rejected, not silently truncated. Processing failure remains an explicit unreviewed image; it cannot become a coffee fact. Exit status is `0` for completed/empty OCR, `1` when an image could not be processed, or `2` for input/setup/output failure.

Only the local normalized PNG path, fixed output paths and validated installed-language/segmentation options reach Tesseract. No shell or inherited proxy/model-path configuration is used. The installed Tesseract/Pillow and operating system are trusted dependencies; this helper is not an operating-system network sandbox. It contains no network operation, and its tests prevent Python sockets/DNS and verify that the OCR subprocess receives no remote URL. Existing system packages are not updated.

## Verify locally

```bash
python3 -m unittest discover -s tests -p 'coffee_source_review_local_test.py' -v
```

The suite checks the export trust boundary, unchanged identity/conflicts, hashes, real local OCR, malformed/oversized/animated images, file and word limits, duplicate inputs, safe report rendering, failure handling and subprocess timeout. The real OCR check is explicitly skipped if Tesseract is unavailable. These are local helper checks, not evidence that every label is readable or that every browser/device is supported.

## Purchase source records

The app export can include `json`, `projection`, and `reference` records. A `json` record is the original value at its `source_path`; concatenate its zero-based `part` fragments first. A `projection` contains only the original properties shown in its JSON value and must not be mistaken for the complete object. Other properties may be retained at child paths. A `reference` identifies an exactly repeated value at another path within the same source URL and locator. Resolve only retained records; do not fetch a reference. Missing fragments, missing referenced values, or a truncation flag mean completeness is unproven.

For selected WooCommerce form attributes, `source_locator` identifies the actual `form[data-product_variations][data-product_id="…"]` and paths are relative to the decoded JSON array in that attribute. These are HTML-attribute records, not endpoint JSON. The local image-review helper preserves these markers for inspection and does not treat a projection, reference, OCR result, or source suggestion as an approved coffee fact.

A repeated textual fact can have up to three `supporting_sources`, each an explicit public HTTPS URL and source type observed for that same fact. These preserve attribution without repeating the entire description. They are references only: the helper validates and displays them but never fetches them. General coffee FAQ guidance and public page metadata have distinct section labels and do not automatically become current-lot specifications.
