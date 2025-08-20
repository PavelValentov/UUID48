// uuidv7-web.mjs (ESM, browser-safe, arrow-only, monotonic, Base64URL)

// internal state (per module instance)
const _state = {
  lastMs: 0n,
  seq12: 0,
};

const _nowMs = () => BigInt(Date.now());
const _random12 = () =>
  globalThis.crypto.getRandomValues(new Uint16Array(1))[0] & 0x0fff;
const _randomTail8 = () => {
  const a = new Uint8Array(8);
  globalThis.crypto.getRandomValues(a);
  return a;
};

const _packUuidV7 = (ts48, seq12, randTail8) => {
  const bytes = new Uint8Array(16);

  // 48-bit timestamp (big-endian)
  bytes[0] = Number((ts48 >> 40n) & 0xffn);
  bytes[1] = Number((ts48 >> 32n) & 0xffn);
  bytes[2] = Number((ts48 >> 24n) & 0xffn);
  bytes[3] = Number((ts48 >> 16n) & 0xffn);
  bytes[4] = Number((ts48 >> 8n) & 0xffn);
  bytes[5] = Number(ts48 & 0xffn);

  // version (7) and high 4 bits of seq12
  bytes[6] = 0x70 | ((seq12 >> 8) & 0x0f);

  // low 8 bits of seq12
  bytes[7] = seq12 & 0xff;

  // RFC 4122 variant on next 8 bytes (10xxxxxx)
  const tail = randTail8.slice(0);
  tail[0] = (tail[0] & 0x3f) | 0x80;
  bytes.set(tail, 8);

  return bytes;
};

const _toBase64Url = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Generates a UUIDv7-like 128-bit ID:
 * - 48-bit Unix ms timestamp
 * - version 7 nibble
 * - 12-bit monotonic sequence (per ms)
 * - RFC 4122 variant
 * - 62 random tail bits
 * Encoded as Base64URL (22 chars).
 *
 * Monotonic strategy (non-blocking):
 * on seq overflow within same ms, bump the virtual timestamp by +1 ms.
 */
export const generateV7Base64Url = () => {
  const now = _nowMs();
  let ts = now > _state.lastMs ? now : _state.lastMs;

  if (ts === _state.lastMs) {
    _state.seq12 = (_state.seq12 + 1) & 0x0fff;
    if (_state.seq12 === 0) ts = _state.lastMs + 1n; // avoid busy-wait
  } else {
    _state.seq12 = _random12();
  }

  _state.lastMs = ts;

  const tail = _randomTail8();
  const bytes = _packUuidV7(ts, _state.seq12, tail);
  return _toBase64Url(bytes);
};

export default generateV7Base64Url;
