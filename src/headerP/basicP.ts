import { sequence, Uint, tup } from "../parser";
import { tag } from "./utils";

export const macToStr = (mac: number[]): string => {
  const hexMac = mac.map((dec) => dec.toString(16));
  return hexMac.join("-");
};

export const ip4ToString = (ip: number[]): string => ip.join(".");

export const ip6ToString = (ip: number[]): string =>
  ip.map((e) => (e ? e.toString(16) : "")).join(":");

export const MAC_parser = (name: string) =>
  sequence(tup(...Array.from({ length: 6 }, () => Uint(8)))).map(
    tag(name, macToStr)
  );

export const IP4_parser = (name: string) =>
  sequence(tup(...Array.from({ length: 4 }, () => Uint(8)))).map(
    tag(name, ip4ToString)
  );

export const IP6_parser = (name: string) =>
  sequence(tup(...Array.from({ length: 8 }, () => Uint(16)))).map(
    tag(name, ip6ToString)
  );
