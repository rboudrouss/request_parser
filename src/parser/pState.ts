import Parser from "./parser";
import { encoder } from "./utils";

export type PSProps<R, D> = {
  dataView: DataView;
  inputType: InputTypes;
  target: InputType;
  isError: boolean;
  error: string | null;
  bitIndex: number;
  result: R;
  data: D;
};

export enum InputTypes {
  STRING = "string",
  // ARRAY_BUFFER = 'arrayBuffer',
  // TYPED_ARRAY = 'typedArray',
  DATA_VIEW = "dataView",
  NUMBER = "number",
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

export type InputType = string | DataView | number; // | ArrayBuffer | TypedArray;

export default class ParserState<R, D> {
  dataView: DataView;
  inputType: InputType;

  target: InputType;
  isError: boolean;
  error: string | null;
  bitIndex: number;
  result: R;
  data: D;

  constructor(PS: PSProps<R, D>) {
    this.dataView = PS.dataView;
    this.inputType = PS.inputType;
    this.target = PS.target;
    this.isError = PS.isError;
    this.error = PS.error;
    this.bitIndex = PS.bitIndex;
    this.result = PS.result;
    this.data = PS.data;
  }

  /* byteIndex <!> */
  get index() {
    return Math.floor(this.bitIndex / 8);
  }

  get byteIndex() {
    return this.index;
  }

  get bitOffset() {
    return this.bitIndex % 8;
  }

  get props() {
    return {
      dataView: this.dataView,
      inputType: this.inputType,
      target: this.target,
      isError: this.isError,
      error: this.error,
      bitIndex: this.bitIndex,
      result: this.result,
      data: this.data,
    } as PSProps<R, D>;
  }

  updateError(e: string) {
    return new ParserState({
      ...this.props,
      error: e,
    });
  }

  updateResult<T>(r: T) {
    return new ParserState({
      ...this.props,
      result: r,
    });
  }
  updateData<D2>(d: D2) {
    return new ParserState({
      ...this.props,
      data: d,
    });
  }

  updateByteIndex(n: number) {
    return new ParserState({
      ...this.props,
      bitIndex: this.bitIndex + n * 8,
    });
  }

  updateBitIndex(n: number) {
    return new ParserState({
      ...this.props,
      bitIndex: this.bitIndex + n,
    });
  }

  static init<D>(
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
    return new ParserState({
      dataView,
      inputType,

      target,
      isError: false,
      error: null,
      result: null,
      data,
      bitIndex: 0,
    });
  }
}
