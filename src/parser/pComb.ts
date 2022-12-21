import Parser, { ParserTuple } from "./parser";
import ParserState from "./pState";
import { decoder } from "./utils";

/** Takes an array of parsers, and returns a new parser that matches each of them sequentially, collecting up the results into an array. */
export const sequence = <R extends any[], D>(parsers: ParserTuple<R, D>) =>
  new Parser((s) => {
    if (s.error) return s;
    const results = [];
    let nextState = s;

    for (const parser of parsers) {
      const out = parser.pf(nextState);
      if (out.error) return results ? out.updateResult(results) : out;
      nextState = out;
      results.push(out.result);
    }
    return nextState.updateResult(results);
  }) as Parser<R, D>;

export const many = function many<T>(parser: Parser<T>): Parser<T[]> {
  return new Parser(function many$state(state) {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.pf(nextState);
      console.log(out.index)

      if (out.isError) {
        break;
      } else {
        nextState = out;
        results.push(nextState.result);

        if (nextState.index >= nextState.dataView.byteLength) {
          break;
        }
      }
    }

    return nextState.updateResult(results);
  });
};

export function possibly<T, D>(parser: Parser<T, D>): Parser<T | null, D> {
  return new Parser(function possibly$state(state) {
    if (state.isError) return state;

    const nextState = parser.pf(state);
    return nextState.isError ? state.updateResult(null) : nextState;
  });
}

type ParserFn<T> = (_yield: <K>(parser: Parser<K>) => K) => T;

export function coroutine<T>(parserFn: ParserFn<T>): Parser<T> {
  return new Parser(function coroutine$state(state) {
    let currentValue;
    let currentState = state;

    const run = <T>(parser: Parser<T>) => {
      if (!(parser && parser instanceof Parser)) {
        throw new Error(
          `[coroutine] passed values must be Parsers, got ${parser}.`
        );
      }
      const newState = parser.pf(currentState);
      if (newState.isError) {
        throw newState;
      } else {
        currentState = newState;
      }
      currentValue = currentState.result;
      return currentValue;
    };

    try {
      const result = parserFn(run);
      return currentState.updateResult(result);
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      } else {
        return e as ParserState<any, any>;
      }
    }
  });
}

export const many1 = function many1<T>(parser: Parser<T>): Parser<T[]> {
  return new Parser(function many1$state(state) {
    if (state.isError) return state;

    const resState = many(parser).pf(state);
    if (resState.result.length) return resState;

    return state.updateError(
      `ParseError 'many1' (position ${state.index}): Expecting to match at least one value`
    );
  });
};

export function everythingUntil(parser: Parser<any>): Parser<number[]> {
  return new Parser((state) => {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.pf(nextState);

      if (out.isError) {
        const { index, dataView } = nextState;

        if (dataView.byteLength <= index) {
          return nextState.updateError(
            `ParseError 'everythingUntil' (position ${nextState.index}): Unexpected end of input.`
          );
        }

        const val = dataView.getUint8(index);
        if (val) {
          results.push(val);
          nextState = nextState.updateByteIndex(1).updateResult(val);
        }
      } else {
        break;
      }
    }

    return nextState.updateResult(results);
  });
}
// TODO type return type
export const choice = <R extends any[], D>(parsers: ParserTuple<R, D>) => {
  if (parsers.length === 0) throw new Error(`List of parsers can't be empty.`);

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

export const everyCharUntil = (parser: Parser<any>) => everythingUntil(parser)
  .map(results => decoder.decode(Uint8Array.from(results)));

