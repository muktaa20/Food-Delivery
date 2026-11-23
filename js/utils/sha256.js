/**
 * SHA-256 for plain-HTTP pages (such as testing on a phone over the LAN),
 * where browsers don't provide crypto.subtle. Output matches crypto.subtle.
 */
const K = new Uint32Array(64);
{
  const isPrime = (n) => {
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  for (let n = 2, i = 0; i < 64; n++) {
    if (isPrime(n)) K[i++] = Math.floor((Math.cbrt(n) % 1) * 2 ** 32);
  }
}

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/** @param {Uint8Array} bytes @returns {string} lowercase hex digest */
export function sha256Hex(bytes) {
  const h = Uint32Array.of(
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  );

  // Padding: 0x80, zeros, then the 64-bit big-endian bit length.
  const length = (((bytes.length + 8) >>> 6) + 1) * 64;
  const data = new Uint8Array(length);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(length - 8, Math.floor(bytes.length / 2 ** 29));
  view.setUint32(length - 4, bytes.length << 3);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < length; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = w[t - 16] + s0 + w[t - 7] + s1;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((value, i) => (h[i] += value));
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}
