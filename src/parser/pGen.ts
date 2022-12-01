import Parser, { ParsingFunction } from "./parser";
import ParserState from "./pState";
import { encoder, getString } from "./utils";

export const str = (s: string) => {
  if (!(s && typeof s === "string"))
    throw new TypeError(
      `[str] must be called with a string with strict positive length, got ${s}`
    );

  let es = encoder.encode(s);

  return new Parser(((PS: ParserState<string, null>) => {
    if (PS.error) return PS;
    const { index, dataView } = PS;
    const remains = dataView.byteLength - index;
    if (!remains)
      return PS.updateError(`[str] Expected '${s}' got End Of Input`);

    if (remains < es.byteLength) {
      let sai = getString(index, remains, dataView);

      return PS.updateError(`[str] Expected '${s}' got '${sai}'`);
    }
    let sai = getString(index, es.byteLength, dataView);

    let out =
      s === sai
        ? PS.updateByteIndex(es.byteLength).updateResult(s)
        : PS.updateError(`[str] Expected '${s}' got '${sai}'`);

    console.log("nyah", PS.bitIndex);

    return out;
  }) as ParsingFunction<string, null>);
};

export const peekInt: Parser<unknown, unknown> = new Parser(function peek$state(
  state
) {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    return state.updateResult(dataView.getUint8(index));
  }
  return state.updateError(
    `ParseError (position ${index}): Unexpected end of input.`
  );
});

// FIXME index is on byte not bits
export const Bit = new Parser((s) => {
  if (s.isError) return s;

  if (s.index >= s.dataView.byteLength) {
    return s.updateError(`Bit: Unexpected end of input`);
  }

  const byte = s.dataView.getUint8(s.index);

  const result = (byte & (1 << (7 - s.bitOffset))) >> (7 - s.bitOffset);
  return s.updateBitIndex(1).updateResult(result);
});

// export const Uint = n => sequence(Array.from({length:n}, () => Bit))
