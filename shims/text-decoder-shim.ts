// Lightweight TextDecoder shim to ensure utf-16le is supported in Metro/Expo
// Placed outside `app/` so expo-router doesn't treat it as a route.
(function () {
  try {
    if (typeof TextDecoder === "function") {
      // Check whether utf-16le is supported
      try {
        // @ts-ignore
        new TextDecoder("utf-16le");
        return; // supported — nothing to do
      } catch {
        // fall through to patch
      }
    }
  } catch (e) {
    // ignore
  }

  const nativeTextDecoder =
    (typeof TextDecoder === "function" && TextDecoder) || null;

  function decodeUtf16Le(input: ArrayBuffer | Uint8Array) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    let result = "";
    for (let i = 0; i < bytes.length; i += 2) {
      const lo = bytes[i] || 0;
      const hi = bytes[i + 1] || 0;
      const code = (hi << 8) | lo;
      result += String.fromCharCode(code);
    }
    return result;
  }

  // Minimal TextDecoder replacement that supports utf-16le and delegates other encodings.
  // It mirrors the simple interface used by libraries: `new TextDecoder(enc).decode(buf)`.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.TextDecoder = function TextDecoderShim(encoding?: string) {
    const enc = (encoding || "utf-8").toLowerCase();

    if (enc === "utf-16le" || enc === "utf-16") {
      return {
        decode(input: ArrayBuffer | Uint8Array) {
          return decodeUtf16Le(input as any);
        },
      } as any;
    }

    // Delegate to native decoder when available for other encodings
    if (nativeTextDecoder) {
      return new nativeTextDecoder(encoding as any);
    }

    // Fallback: very small utf-8 decoder
    return {
      decode(input: ArrayBuffer | Uint8Array) {
        const bytes =
          input instanceof ArrayBuffer ? new Uint8Array(input) : input;
        let s = "";
        for (let i = 0; i < bytes.length; i++)
          s += String.fromCharCode(bytes[i]);
        try {
          // try to interpret as utf-8
          // eslint-disable-next-line no-undef
          // @ts-ignore
          return decodeURIComponent(escape(s));
        } catch {
          return s;
        }
      },
    } as any;
  } as any;
})();
