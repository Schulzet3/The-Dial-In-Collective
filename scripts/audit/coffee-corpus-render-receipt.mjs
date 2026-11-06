import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// A prior success is reusable only when it belongs to this selection and its
// saved evidence still exists and agrees with the recorded byte/hash receipt.
export async function isReusableRenderReceipt(receipt, packet, dir) {
  if (receipt?.status !== 'render_captured' || receipt.case_id !== packet.id ||
      receipt.source_url !== packet.source_url || receipt.not_production_transport_acceptance !== true) return false;
  try {
    const data = JSON.parse(await fs.readFile(path.join(dir, 'rendered-source.json'), 'utf8'));
    if (typeof data?.visible_text !== 'string' || receipt.text_characters !== data.visible_text.length) return false;
    if (receipt.dom_truncated === true) return true; // HTML intentionally omitted above the size cap.
    if (receipt.dom_truncated !== false || !Number.isSafeInteger(receipt.dom_bytes) ||
        !/^[0-9a-f]{64}$/.test(receipt.dom_sha256 ?? '')) return false;
    const html = await fs.readFile(path.join(dir, 'rendered.html'));
    return html.length === receipt.dom_bytes &&
      crypto.createHash('sha256').update(html).digest('hex') === receipt.dom_sha256;
  } catch {
    return false; // Missing, partial or malformed capture evidence must be recaptured.
  }
}
