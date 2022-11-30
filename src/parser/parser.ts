import { updateResult } from "./pState";
import { InputType, InputTypes, ParserState, ParsingFunction } from "./types";
import { encoder } from "./utils";

/** An array of different generic parsers. */
export type ParserTuple<R extends any[], D> = {
  [K in keyof R]: Parser<R[K], D>;
};
/** An array of parsers paired with strings. */
export type PairedParsers<D, R> = { [K in keyof R]: [string, Parser<R[K], D>] };
/** An object of results indexed by string keys. */
export type PairedResults<R> = { [key: string]: R[keyof R] };

export function initialisePS<D>(
  target: InputType,
  data: D | null = null
): ParserState<null, D | null> {
  let dataView: DataView;
  let inputType;

  if (typeof target === "string") {
    dataView = new DataView(encoder.encode(target).buffer);
    inputType = InputTypes.STRING;
  } else if (typeof target === "number") {
    let buffer = new ArrayBuffer(target);
    dataView = new DataView(buffer, 0);
    inputType = InputTypes.NUMBER;
  } else if (target instanceof DataView) {
    dataView = target;
    inputType = InputTypes.DATA_VIEW;
  } else
    throw new Error(
      `Cannot process input. Must be a string, a number, or a DataView. but got ${typeof target}`
    );
  return {
    dataView,
    inputType,

    target,
    isError: false,
    error: null,
    result: null,
    data,
    index: 0,
  };
}

export default class Parser<R, D> {
  pf: ParsingFunction<R, D>;

  constructor(pf: ParsingFunction<R, D>) {
    this.pf = pf;
  }

  run(target: InputType): ParserState<R, D> {
    return this.pf(initialisePS(target));
  }

  map<T>(fn: (x: R) => T): Parser<T, D> {
    const pf = this.pf;
    return new Parser(function Parser$map$state(state): ParserState<T, D> {
      const newState = pf(state);
      if (newState.isError) return newState as unknown as ParserState<T, D>;
      return updateResult(newState, fn(newState.result));
    });
  }

  tag(s: string): Parser<{ name: string; value: R }, D> {
    return this.map((x) => {
      return {
        name: s,
        value: x,
      };
    });
  }// chain :: Parser e a s ~> (a -> Parser e b s) -> Parser e b s
  chain<T2>(fn: (x?: R) => Parser<R,D>): Parser<R,D> {
    const p = this.pf;
    return new Parser(function Parser$chain$state(
      state,
    ): ParserState<R,D> {
      const newState = p(state);
      if (newState.isError) return newState as unknown as ParserState<R,D>;
      return fn(newState.result).pf(newState);
    });
  }
}
