import Parser from "./parser";
import { sequence } from "./pComb";
import { updateError, updatePS, updateResult } from "./pState";
import { ParsingFunction } from "./types";
import { encoder, getString } from "./utils";

export const str = (s: string) => {
  if (!(s && typeof s === "string"))
    throw new TypeError(
      `[str] must be called with a string with strict positive length, got ${s}`
    );

  let es = encoder.encode(s);

  return new Parser(((PS) => {
    if (PS.error) return PS;
    const { index, dataView } = PS;
    const remains = dataView.byteLength - index;
    if (!remains)
      return updateError(PS, `[str] Expected '${s}' got End Of Input`);

    if (remains < es.byteLength) {
      let sai = getString(index, remains, dataView);

      return updateError(PS, `[str] Expected '${s}' got '${sai}'`);
    }
    let sai = getString(index, es.byteLength, dataView);

    return s === sai
      ? updatePS(PS, s, index + es.byteLength)
      : updateError(PS, `[str] Expected '${s}' got '${sai}'`);
  }) as ParsingFunction<string, null>);
};

export const peekInt: Parser<unknown, unknown> = new Parser(function peek$state(
  state
) {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    return updatePS(state, dataView.getUint8(index), index);
  }
  return updateError(
    state,
    `ParseError (position ${index}): Unexpected end of input.`
  );
});

// FIXME index is on byte not bits
export const Bit = new Parser((s) => {
  if (s.isError) return s;


  if (s.index >= s.dataView.byteLength) {
    return updateError(s, `Bit: Unexpected end of input`);
  }

  const byte = s.dataView.getUint8(s.index);
  const bitOffset = 7 - (s.index % 8);

  const result = (byte & (1 << bitOffset)) >> bitOffset;
  return updatePS(s, result, s.index +1);
});

// export const Uint = n => sequence(Array.from({length:n}, () => Bit))
