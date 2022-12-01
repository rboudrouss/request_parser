import Parser, { ParsingFunction } from "./parser";
import { sequence } from "./pComb";
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


export function choice(parsers: Parser<any>[]): Parser<any> {

  if (parsers.length === 0) throw new Error(`List of parsers can't be empty.`)

  return new Parser(function choice$state(state) {
    if (state.isError) return state;

    let error = null;
    for (const parser of parsers) {
      const out = parser.pf(state);

      if (!out.isError) return out;

      if (error === null || (error && out.index > error.index)) {
        error = out;
      }
    }

    return error as ParserState<any, any>;
  });
};

// between :: Parser e a s -> Parser e b s -> Parser e c s -> Parser e b s
export function between<L, T, R>(leftParser: Parser<L>): (rightParser: Parser<R>) => (parser: Parser<T>) => Parser<T> {
  return function between$rightParser(rightParser) {
    return function between$parser(parser) {
      return sequence(tup(leftParser, parser, rightParser)).map(([_, x]) => x);
    };
  };
};

// everythingUntil :: Parser e a s -> Parser e String s
export function everythingUntil(parser: Parser<any>): Parser<number[]> {
  return new Parser(state => {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.pf(nextState);

      if (out.isError) {
        const { index, dataView } = nextState;

        if (dataView.byteLength <= index) {
          return nextState.updateError(
            `ParseError 'everythingUntil' (position ${nextState.index}): Unexpected end of input.`,
          );
        }

        const val = dataView.getUint8(index);
        if (val) {
          results.push(val);
          nextState = nextState.updateByteIndex(1).updateResult(val)
        }
      } else {
        break;
      }
    }

    return nextState.updateResult(results);
  });
};

// everyCharUntil :: Parser e a s -> Parser e String s
export const everyCharUntil = (parser: Parser<any>) => everythingUntil(parser)
  .map(results => decoder.decode(Uint8Array.from(results)));

// anythingExcept :: Parser e a s -> Parser e Char s
export const anythingExcept = function anythingExcept(parser: Parser<any>): Parser<number> {
  return new Parser(function anythingExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.pf(state);
    if (out.isError) {
      return state.updateByteIndex(1).updateResult(dataView.getUint8(index))
    }

    return state.updateError(
      `ParseError 'anythingExcept' (position ${index}): Matched '${out.result}' from the exception parser`,
    );
  });
};

// anyCharExcept :: Parser e a s -> Parser e Char s
export const anyCharExcept = function anyCharExcept(parser: Parser<any>): Parser<number> {
  return new Parser(function anyCharExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.pf(state);
    if (out.isError) {
      if (index < dataView.byteLength) {
        const charWidth = getNextCharWidth(index, dataView);
        if (index + charWidth <= dataView.byteLength) {
          const char = getUtf8Char(index, charWidth, dataView);
          return state.updateByteIndex(charWidth).updateResult(char)
        }
      }
      return state.updateError(
        `ParseError 'anyCharExcept' (position ${index}): Unexpected end of input`,
      );
    }

    return state.updateError(
      `ParseError 'anyCharExcept' (position ${index}): Matched '${out.result}' from the exception parser`,
    );
  });
};

