import Parser from "./parser";
import { sequence } from "./pComb";
import { fail, succeed } from "./pGen";

export const Bit = new Parser<number, unknown>((s) => {
  if (s.isError) return s;

  if (s.index >= s.dataView.byteLength)
    return s.updateError(`Bit: Unexpected end of input`);

  const byte = s.dataView.getUint8(s.index);

  const result = (byte & (1 << (7 - s.bitOffset))) >> (7 - s.bitOffset);
  return s.updateBitIndex(1).updateResult(result);
});

export const One = new Parser<number, unknown>((s) => {
  if (s.isError) return s;

  if (s.index >= s.dataView.byteLength)
    return s.updateError(`One: Unexpected end of input`);

  const byte = s.dataView.getUint8(s.index);
  const result = (byte & (1 << (7 - s.bitOffset))) >> (7 - s.bitOffset);
  return result
    ? s.updateBitIndex(1).updateResult(result)
    : s.updateError(`One: Expected '1' got '0'`);
});

export const Zero = new Parser<number, unknown>((s) => {
  if (s.isError) return s;

  if (s.index >= s.dataView.byteLength)
    return s.updateError(`Zero: Unexpected end of input`);

  const byte = s.dataView.getUint8(s.index);
  const result = (byte & (1 << (7 - s.bitOffset))) >> (7 - s.bitOffset);
  return !result
    ? s.updateBitIndex(1).updateResult(result)
    : s.updateError(`Zero: Expected '1' got '0'`);
});

/* n number of bits */
export const Uint = (n: number): Parser<number, unknown> => {
  if (n < 1) throw new Error(`Uint: n must be larger than 0, got '${n}'`);

  if (n > 32) throw new Error(`Uint: n must be less than 32, git '${n}'`);

  return sequence(Array.from({ length: n }, () => Bit)).map((bits) =>
    bits.reduce((acc, bit, i) => {
      return acc + Number(BigInt(bit) << BigInt(n - 1 - i));
    }, 0)
  );
};

export const Int = (n: number): Parser<number, unknown> => {
  if (n < 1) throw new Error(`Uint: n must be larger than 0, got '${n}'`);

  if (n > 32) throw new Error(`Uint: n must be less than 32, git '${n}'`);

  return sequence(Array.from({ length: n }, () => Bit)).map((bits) => {
    if (bits[0] == 0)
      return bits.reduce((acc, bit, i) => {
        return acc + Number(BigInt(bit) << BigInt(n - 1 - i));
      }, 0);
    else {
      return -(
        1 +
        bits.reduce((acc, bit, i) => {
          return acc + Number(BigInt(!bit) << BigInt(n - 1 - i));
        }, 0)
      );
    }
  });
};

export const RawString = (s: string) => {
  if (s.length < 1)
    throw new Error(`RawString: s must be at least 1 character`);

  const byteParsers = s
    .split("")
    .map((c) => c.charCodeAt(0))
    .map((n) => {
      return Uint(8).chain((res): Parser<string, unknown> => {
        if (!res) throw new Error(`RawString: got an undefined`);
        if (res === n) return succeed(String.fromCharCode(n));
        return fail(
          `RawString: expected the character '${String.fromCharCode(
            n
          )} but got '${String.fromCharCode(res)}'`
        );
      });
    });
  return sequence(byteParsers).map((res) => res?.join(""));
};
