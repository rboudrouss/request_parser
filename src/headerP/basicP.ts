import { sequence, Uint } from "../parser";
import { tag } from "./utils";

const macToStr = (mac: number[]) => {
  const hexMac = mac.map((dec) => dec.toString(16));
  const vendor = hexMac.join(":");
  return (
    vendor + "_" + hexMac.slice(3, 6).join(":") + " (" + hexMac.join(":") + ")"
  );
};

export const MAC_parser = (name: string) =>
  sequence(Array.from({ length: 6 }, () => Uint(8))).map(tag(name, macToStr));
export const IP_parser = (name: string) =>
  sequence(Array.from({ length: 4 }, () => Uint(8))).map(
    tag(name, (x) => x.join("."))
  );
