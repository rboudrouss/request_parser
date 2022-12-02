import { isError } from "util";
import Parser, { ParserTuple } from "./parser";
import ParserState from "./pState";
import { tup } from "./utils";

/** Takes an array of parsers and composes them left to right, so each parser's return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain. */
export const pipe = <R extends any[], D>(parsers: ParserTuple<R, D>) =>
  new Parser((s) => {
    for (const parser of parsers) s = parser.pf(s);
    return s;
  }) as Parser<R[typeof parsers.length], D>;

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

export function exactly<R>(n: number): (p: Parser<R>) => Parser<R[]> {
  if (typeof n !== "number" || n <= 0) {
    throw new TypeError(
      `exactly must be called with a number > 0, but got ${n}`
    );
  }
  return (parser) => {
    return new Parser((state) => {
      if (state.isError) return state;

      const results = [];
      let nextState = state;

      for (let i = 0; i < n; i++) {
        const out = parser.pf(nextState);
        if (out.isError) {
          return out;
        } else {
          nextState = out;
          results.push(nextState.result);
        }
      }

      return nextState.updateResult(results);
    }).errorMap(
      ({ index, error }) =>
        `ParseError (position ${index}): Expecting ${n}${error}`
    );
  };
}

export function either<T>(
  parser: Parser<T>
): Parser<{ isError: boolean; value: T }> {
  return new Parser(function either$state(state) {
    if (state.isError) return state;

    const nextState = parser.pf(state);

    return new ParserState({ ...nextState.props, isError: false }).updateResult(
      {
        isError: nextState.isError,
        value: nextState.isError ? nextState.error : nextState.result,
      }
    );
  });
}

export const many = function many<T>(parser: Parser<T>): Parser<T[]> {
  return new Parser(function many$state(state) {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.pf(nextState);

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

export function mapTo<T>(fn: (x: any) => T): Parser<T> {
  return new Parser(function mapTo$state(state) {
    if (state.isError) return state;
    return state.updateResult(fn(state.result));
  });
}

export function errorMapTo<D>(
  fn: (error: string | null, index: number, data: D) => string
): Parser<any, D> {
  return new Parser(function errorMapTo$state(state) {
    if (!state.isError) return state;
    return state.updateError(fn(state.error, state.index, state.data));
  });
}

export function choice(parsers: Parser<any>[]): Parser<any> {
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
}

export function between<L, T, R>(
  leftParser: Parser<L>
): (rightParser: Parser<R>) => (parser: Parser<T>) => Parser<T> {
  return function between$rightParser(rightParser) {
    return function between$parser(parser) {
      return sequence(tup(leftParser, parser, rightParser)).map(([_, x]) => x);
    };
  };
}

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

export const anythingExcept = function anythingExcept(
  parser: Parser<any>
): Parser<number> {
  return new Parser(function anythingExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.pf(state);
    if (out.isError)
      return state.updateByteIndex(1).updateResult(dataView.getUint8(index));

    return state.updateError(
      `ParseError 'anythingExcept' (position ${index}): Matched '${out.result}' from the exception parser`
    );
  });
};

export function sepBy<S, T, D>(
  sepParser: Parser<S, D>
): (valueParser: Parser<T, D>) => Parser<T[]> {
  return function sepBy$valParser(valueParser) {
    return new Parser<T[]>(function sepBy$valParser$state(state) {
      if (state.isError) return state;

      let nextState: ParserState<S | T, D> = state;
      let error = null;
      const results: T[] = [];

      while (true) {
        const valState = valueParser.pf(nextState);
        const sepState = sepParser.pf(valState);

        if (valState.isError) {
          error = valState;
          break;
        } else {
          results.push(valState.result);
        }

        if (sepState.isError) {
          nextState = valState;
          break;
        }

        nextState = sepState;
      }

      if (error) {
        if (results.length === 0) {
          return state.updateResult(results) as ParserState<T[], D>;
        }
        return error;
      }

      return nextState.updateResult(results);
    });
  };
}

export const sepBy1 = function sepBy1<S, T>(
  sepParser: Parser<S>
): (valueParser: Parser<T>) => Parser<T[]> {
  return function sepBy1$valParser(valueParser) {
    return new Parser(function sepBy1$valParser$state(state) {
      if (state.isError) return state;

      const out = sepBy(sepParser)(valueParser).pf(state);
      if (out.isError) return out;
      if (out.result.length === 0) {
        return state.updateError(
          `ParseError 'sepBy1' (position ${state.index}): Expecting to match at least one separated value`
        );
      }
      return out;
    });
  };
};

export function possibly<T, D>(parser: Parser<T, D>): Parser<T | null, D> {
  return new Parser(function possibly$state(state) {
    if (state.isError) return state;

    const nextState = parser.pf(state);
    return nextState.isError ? state.updateResult(null) : nextState;
  });
};

export function skip<D>(parser: Parser<any, D>): Parser<null, D> {
  return new Parser(function skip$state(state) {
    if (state.isError) return state;
    const nextState = parser.pf(state);
    if (nextState.isError) return nextState;

    return nextState.updateResult(state.result);
  });
}
type ParserFn<T> = (_yield:<K>(parser:Parser<K>)=>K)=>T;

export function coroutine<T>(parserFn: ParserFn<T>): Parser<T> {
  return new Parser(function coroutine$state(state) {
    let currentValue;
    let currentState = state;
    
    const run = <T>(parser: Parser<T>) => {
      if (!(parser && parser instanceof Parser)) {
        throw new Error(
          `[coroutine] passed values must be Parsers, got ${parser}.`,
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
    }

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
};

