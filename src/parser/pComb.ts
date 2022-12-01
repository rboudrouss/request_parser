import Parser, { PairedParsers, PairedResults, ParserTuple } from "./parser";
import ParserState from "./pState";
import { encoder, getString } from "./utils";

/** Takes an array of parsers and composes them left to right, so each parser's return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain. */
export const pipe = <R extends any[], D>(parsers: ParserTuple<R, D>) =>
  new Parser((s) => {
    for (const parser of parsers)
      s = parser.pf(s as ParserState<unknown, unknown>);
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
