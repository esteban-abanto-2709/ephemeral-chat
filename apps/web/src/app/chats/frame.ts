const prefixBytes = 4;

export function encodeFrame(header: object, data: Blob): Blob {
  const head = new TextEncoder().encode(JSON.stringify(header));
  const prefix = new Uint8Array(prefixBytes);
  new DataView(prefix.buffer).setUint32(0, head.length);
  return new Blob([prefix, head, data]);
}

export function decodeFrame(buffer: ArrayBuffer): {
  header: unknown;
  data: Uint8Array<ArrayBuffer>;
} {
  const size = new DataView(buffer).getUint32(0);
  const start = prefixBytes + size;
  return {
    header: JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, prefixBytes, size))),
    data: new Uint8Array(buffer, start),
  };
}
