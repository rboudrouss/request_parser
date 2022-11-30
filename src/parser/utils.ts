import { TextEncoder, TextDecoder } from "util";

export const encoder = new TextEncoder();
export const decoder = new TextDecoder();

export const getString = (
  index: number,
  length: number,
  dataView: DataView
) => {
  const bytes = Uint8Array.from({ length }, (_, i) =>
    dataView.getUint8(index + i)
  );
  const decodedString = decoder.decode(bytes);
  return decodedString;
};
