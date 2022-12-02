import Parser, { ParsingFunction } from "./parser";
import { everythingUntil, sequence } from "./pComb";
import ParserState from "./pState";
import {
  decoder,
  encoder,
  getCharacterLength,
  getNextCharWidth,
  getString,
  getUtf8Char,
  tup,
} from "./utils";

/* doesn't support the bitOffset <!>*/
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

export const peekInt = new Parser<number, unknown>((state) => {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    return state.updateResult(dataView.getUint8(index));
  }
  return state.updateError(
    `ParseError (position ${index}): Unexpected end of input.`
  );
});

export const fail = (e: string) => new Parser((s) => s.updateError(e));

export const succeed = <T>(e: T) => new Parser((s) => s.updateResult(e));

export const char = function char(c: string): Parser<string> {
  if (!c || getCharacterLength(c) !== 1) {
    throw new TypeError(
      `char must be called with a single character, but got ${c}`
    );
  }

  return new Parser(function char$state(state) {
    if (state.isError) return state;

    const { index, dataView } = state;
    if (index < dataView.byteLength) {
      const charWidth = getNextCharWidth(index, dataView);
      if (index + charWidth <= dataView.byteLength) {
        const char = getUtf8Char(index, charWidth, dataView);
        return char === c
          ? state.updateByteIndex(index + charWidth).updateResult(c)
          : state.updateError(
              `ParseError (position ${index}): Expecting character '${c}', got '${char}'`
            );
      }
    }
    return state.updateError(
      `ParseError (position ${index}): Expecting character '${c}', but got end of input.`
    );
  });
};

export const anyChar: Parser<string> = new Parser(function anyChar$state(
  state
) {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    const charWidth = getNextCharWidth(index, dataView);
    if (index + charWidth <= dataView.byteLength) {
      const char = getUtf8Char(index, charWidth, dataView);
      return state.updateByteIndex(index + charWidth).updateResult(char);
    }
  }
  return state.updateError(
    `ParseError (position ${index}): Expecting a character, but got end of input.`
  );
});

// everyCharUntil :: Parser e a s -> Parser e String s
export const everyCharUntil = (parser: Parser<any>) =>
  everythingUntil(parser).map((results) =>
    decoder.decode(Uint8Array.from(results))
  );

// anyCharExcept :: Parser e a s -> Parser e Char s
export const anyCharExcept = function anyCharExcept(
  parser: Parser<any>
): Parser<number> {
  return new Parser(function anyCharExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.pf(state);
    if (out.isError) {
      if (index < dataView.byteLength) {
        const charWidth = getNextCharWidth(index, dataView);
        if (index + charWidth <= dataView.byteLength) {
          const char = getUtf8Char(index, charWidth, dataView);
          return state.updateByteIndex(charWidth).updateResult(char);
        }
      }
      return state.updateError(
        `ParseError 'anyCharExcept' (position ${index}): Unexpected end of input`
      );
    }

    return state.updateError(
      `ParseError 'anyCharExcept' (position ${index}): Matched '${out.result}' from the exception parser`
    );
  });
};
