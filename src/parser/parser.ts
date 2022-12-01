import ParserState, { InputType } from "./pState";

export type ParsingFunction<R, D> = (
  PS: ParserState<any, any>
) => ParserState<R, D>;

/** An array of different generic parsers. */
export type ParserTuple<R extends any[], D> = {
  [K in keyof R]: Parser<R[K], D>;
};
/** An array of parsers paired with strings. */
export type PairedParsers<D, R> = { [K in keyof R]: [string, Parser<R[K], D>] };
/** An object of results indexed by string keys. */
export type PairedResults<R> = { [key: string]: R[keyof R] };

export default class Parser<R, D> {
  pf: ParsingFunction<R, D>;

  constructor(pf: ParsingFunction<R, D>) {
    this.pf = pf;
  }

  run(target: InputType): ParserState<R, D> {
    return this.pf(ParserState.init(target));
  }

  map<T>(fn: (x: R) => T): Parser<T, D> {
    const pf = this.pf;
    return new Parser((state) => {
      const newState = pf(state);
      if (newState.isError) return newState as unknown as ParserState<T,D>;
      return newState.updateResult(fn(newState.result));
    });
  }

  tag(s: string): Parser<{ name: string; value: R }, D> {
    return this.map((x) => {
      return {
        name: s,
        value: x,
      };
    });
  }

  chain(fn: (x?: R) => Parser<R, D>): Parser<R, D> {
    const p = this.pf;
    return new Parser((state) => {
      const newState = p(state);
      if (newState.isError) return newState;
      return fn(newState.result).pf(newState);
    });
  }
}
