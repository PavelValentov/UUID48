'use strict';

const crypto = require('crypto');

const _state = {
  lastMs: 0n,
  seq12: 0,
};

const _nowMs = () => BigInt(Date.now());
const _waitNextMs = (currentMs) => {
  let t = _nowMs();
  while (t <= currentMs) t = _nowMs();
  return t;
};

const _packUuidV7 = (ts48, seq12, randTail8) => {
  const buf = Buffer.allocUnsafe(16);

  // 48-bit timestamp (big-endian)
  buf[0] = Number((ts48 >> 40n) & 0xffn);
  buf[1] = Number((ts48 >> 32n) & 0xffn);
  buf[2] = Number((ts48 >> 24n) & 0xffn);
  buf[3] = Number((ts48 >> 16n) & 0xffn);
  buf[4] = Number((ts48 >> 8n) & 0xffn);
  buf[5] = Number(ts48 & 0xffn);

  // version (7) and high 4 bits of seq12
  buf[6] = 0x70 | ((seq12 >> 8) & 0x0f);

  // low 8 bits of seq12
  buf[7] = seq12 & 0xff;

  // 62 random bits with RFC 4122 variant (10xxxxxx)
  randTail8[0] = (randTail8[0] & 0x3f) | 0x80;
  randTail8.copy(buf, 8);

  return buf;
};

const _toBase64Url = (buf) =>
  buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * Generates a UUIDv7-like 128-bit ID:
 * - 48-bit Unix ms timestamp
 * - version 7 nibble
 * - 12-bit monotonic sequence (per ms)
 * - variant (RFC 4122)
 * - 62 random tail bits
 * Encoded as Base64URL (22 chars).
 */
const generateV7Base64Url = () => {
  let ts = _nowMs();
  if (ts === _state.lastMs) {
    _state.seq12 = (_state.seq12 + 1) & 0x0fff;
    if (_state.seq12 === 0) ts = _waitNextMs(ts);
  } else {
    _state.seq12 = crypto.randomInt(0, 0x1000);
  }
  _state.lastMs = ts;

  const tail = crypto.randomBytes(8);
  const bytes = _packUuidV7(ts, _state.seq12, tail);
  return _toBase64Url(bytes);
};

module.exports = {
  generateV7Base64Url,
};
