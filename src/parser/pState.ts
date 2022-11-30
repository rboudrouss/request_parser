import { ParserState } from "./types"

// class ParserState {}

export const updateError = <R, D>(state: ParserState<R, D>, error: string): ParserState<R, D> => ({ ...state, isError: true, error })
export const updateResult = <R, D, R2>(state: ParserState<R, D>, result: R2): ParserState<R2, D> => ({ ...state, result })
export const updateData = <R, D, D2>(state: ParserState<R, D>, data: D2): ParserState<R, D2> => ({ ...state, data })
export const updatePS = <R, D, R2>(state: ParserState<R, D>, result: R2, index: number): ParserState<R2, D> => ({ ...state, index, result })