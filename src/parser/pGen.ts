import Parser, { ParsingFunction } from "./parser";
import { everythingUntil, possibly, sequence } from "./pComb";
import { InputTypes } from "./pState";
import {
  decoder,
  encoder,
  getCharacterLength,
  getNextCharWidth,
  getString,
  getUtf8Char,
  reWhitespaces,
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

export const everyCharUntil = (parser: Parser<any>) =>
  everythingUntil(parser).map((results) =>
    decoder.decode(Uint8Array.from(results))
  );

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

export function regex(re: RegExp): Parser<string> {
  const typeofre = Object.prototype.toString.call(re);
  if (typeofre !== "[object RegExp]") {
    throw new TypeError(
      `regex must be called with a Regular Expression, but got ${typeofre}`
    );
  }

  if (re.toString()[1] !== "^") {
    throw new Error(`regex parsers must contain '^' start assertion.`);
  }

  return new Parser(function regex$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;
    const rest = getString(index, dataView.byteLength - index, dataView);

    if (rest.length >= 1) {
      const match = rest.match(re);
      return match
        ? state.updateResult(
            match[0]
          ).updateByteIndex(
            encoder.encode(match[0]).byteLength
          )
        : state.updateError(
            `ParseError (position ${index}): Expecting string matching '${re}', got '${rest.slice(
              0,
              5
            )}...'`
          );
    }
    return state.updateError(
      `ParseError (position ${index}): Expecting string matching '${re}', but got end of input.`
    );
  });
}
export function skip< D>(parser: Parser<any,  D>): Parser<null,  D> {
  return new Parser(function skip$state(state) {
    if (state.isError) return state;
    const nextState = parser.pf(state);
    if (nextState.isError) return nextState;

    return nextState.updateResult(state.result);
  });
};

export const startOfInput = new Parser<null, string>(function startOfInput$state(state) {
  if (state.isError) return state;
  const { index } = state;
  if (index > 0) {
    return state.updateError(
      `ParseError 'startOfInput' (position ${index}): Expected start of input'`,
    );
  }

  return state;
});

export const endOfInput = new Parser<null, string>(function endOfInput$state(state) {
  if (state.isError) return state;
  const { dataView, index, inputType } = state;
  if (index !== dataView.byteLength) {
    const errorByte = inputType === InputTypes.STRING
      ? String.fromCharCode(dataView.getUint8(index))
      : `0x${dataView.getUint8(index).toString(16).padStart(2, '0')}`;

    return state.updateError(
      `ParseError 'endOfInput' (position ${index}): Expected end of input but got '${errorByte}'`,
    );
  }

  return state.updateResult(null);
});

export const whitespace: Parser<string> = regex(reWhitespaces)
  // Keeping this error even though the implementation no longer uses many1. Will change it to something more appropriate in the next major release.
  .errorMap(
    ({ index }) =>
      `ParseError 'many1' (position ${index}): Expecting to match at least one value`,
  );
export const optionalWhitespace: Parser<string | null> = possibly(whitespace).map(x => x || '');


