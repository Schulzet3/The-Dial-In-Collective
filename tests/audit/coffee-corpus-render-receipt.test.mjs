import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {isReusableRenderReceipt} from '../../scripts/audit/coffee-corpus-render-receipt.mjs';

test('render audit reuses only source-matched intact evidence, never stale or partial receipts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dic-render-receipt-'));
  try {
    const packet = {id: 'case-one', source_url: 'https://roaster.example/coffee'};
    const html = '<main>coffee</main>';
    const data = {visible_text: 'coffee'};
    const receipt = {status: 'render_captured', case_id: packet.id, source_url: packet.source_url,
      not_production_transport_acceptance: true, text_characters: data.visible_text.length,
      dom_truncated: false, dom_bytes: Buffer.byteLength(html),
      dom_sha256: crypto.createHash('sha256').update(html).digest('hex')};
    await fs.writeFile(path.join(dir, 'rendered-source.json'), JSON.stringify(data));
    await fs.writeFile(path.join(dir, 'rendered.html'), html);
    assert.equal(await isReusableRenderReceipt(receipt, packet, dir), true);
    assert.equal(await isReusableRenderReceipt({...receipt, case_id: 'other'}, packet, dir), false);
    assert.equal(await isReusableRenderReceipt({...receipt, source_url: 'https://other.example/'}, packet, dir), false);
    assert.equal(await isReusableRenderReceipt({...receipt, status: 'unreviewed'}, packet, dir), false);
    assert.equal(await isReusableRenderReceipt({...receipt, not_production_transport_acceptance: false}, packet, dir), false);
    assert.equal(await isReusableRenderReceipt({...receipt, text_characters: 100}, packet, dir), false);
    await fs.writeFile(path.join(dir, 'rendered.html'), 'corrupt');
    assert.equal(await isReusableRenderReceipt(receipt, packet, dir), false);
    await fs.unlink(path.join(dir, 'rendered.html'));
    assert.equal(await isReusableRenderReceipt(receipt, packet, dir), false);
    assert.equal(await isReusableRenderReceipt({...receipt, dom_truncated: true}, packet, dir), true);
    await fs.unlink(path.join(dir, 'rendered-source.json'));
    assert.equal(await isReusableRenderReceipt({...receipt, dom_truncated: true}, packet, dir), false);
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
});
