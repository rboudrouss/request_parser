import Parser from "./parser";
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
  }) as ParsingFunction<null, string>);
};
