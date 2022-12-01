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

// FIXME typing
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

