import { readFileSync, writeFileSync } from "fs";

// HACK
const reHexDigits = /^[0-9a-fA-F]+/;

export const convertToBin = (data: string): Uint8Array => {
  if (!reHexDigits.test(data))
    throw new Error("convertToBin: got data that is not hexadecimal");

  let numArray = data
    .split("")
    .reduce((acc: string[][], _, i, arr) => {
      if (i % 2 == 0) acc.push(arr.slice(i, i + 2));
      return acc;
    }, [])
    .map((s) => Number(`0x${s[0]}${s[1]}`));

  return new Uint8Array(numArray);
};

// cleaning the offset, the hex-visualisation, and the spaces
export const cleanInput = (data: string): string => {
  return data
    .split("\n")
    .map((s) => s.slice(5, Math.min(s.length, 54)))
    .join("")
    .replace(/\s/g, "");
};

// Use it only if executed by <ts->node <!>
export const readF = (s: string): Uint8Array => {
  return convertToBin(cleanInput(readFileSync(s).toString()));
};

// HACK on passe par un string pour être sur qu'on l'interpréte comme on veut
// HACK le .slice(39) c'est parce que wireshark ignore les 39 premiers bytes pour je ne sais quelle raison
export const readBinF = (s: string): Uint8Array => {
  return convertToBin(
    readFileSync(s)
      .toString("hex")
      .slice(39 * 2 + 2)
  );
};

export const writeBinF = (data: Uint8Array, s: string): void => {
  let dataView = new DataView(data.buffer);
  writeFileSync(s, dataView, "binary");
};

export const tag =
  <T>(name: string, descFN?: (x: T) => string) =>
  (value: T) => {
    return {
      name,
      value,
      description: descFN ? descFN(value) : null,
    };
  };