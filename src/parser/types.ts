export enum InputTypes {
    STRING = 'string',
    // ARRAY_BUFFER = 'arrayBuffer',
    // TYPED_ARRAY = 'typedArray',
    DATA_VIEW = 'dataView',
    NUMBER = 'number'
}

export type TypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Uint8ClampedArray
    | Float32Array
    | Float64Array;

export type InputType = string | DataView | number // | ArrayBuffer | TypedArray;

export type ParserState<R, D> = {
    dataView: DataView;
    inputType: InputType;
} & InternalResultType<R, D>;

export type InternalResultType<R, D> = {
    target: InputType;
    isError: boolean;
    error: string|null;
    index: number;
    result: R;
    data: D;
};

export type ParsingFunction<R,D> =
    (PS:ParserState<unknown,unknown>) => ParserState<R,D>