import { sequence, Uint } from "../parser";
import { tag } from "./utils";

const macToStr = (mac: number[]) => {
  const hexMac = mac.map((dec) => dec.toString(16));
  return hexMac.join("-")
};

export const MAC_parser = (name: string) =>
  sequence(Array.from({ length: 6 }, () => Uint(8))).map(tag(name, macToStr));
export const IP4_parser = (name: string) =>
  sequence(Array.from({ length: 4 }, () => Uint(8))).map(
    tag(name, (x) => x.join("."))
  );

export const IP6_parser = (name: string) =>
  sequence(Array.from({ length: 8 }, () => Uint(16))).map(
    tag(name, (x) => x.map((e) => (e ? e.toString(16) : "")).join(":"))
  );
