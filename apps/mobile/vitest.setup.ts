import { TextEncoder, TextDecoder } from 'util';

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
  // @ts-expect-error TextDecoder type mismatch across Node versions
  globalThis.TextDecoder = TextDecoder;
}
