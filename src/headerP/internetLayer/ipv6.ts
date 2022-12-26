import { tag, taged_value } from "../utils";
import { sequence, tup, Uint } from "../../parser";
import { IP6_parser } from "../basicP";
import { layerComp, protocol_dict } from "./utils";

export type ip6Type = [
  taged_value<number>,
  taged_value<[taged_value<number>, taged_value<number>]>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number[]>,
  taged_value<number[]>
];

export const ip6Parser = sequence<ip6Type, unknown>(
  tup(
    Uint(4).map(
      tag("version", (x) => {
        if (x === 4) return "ipv4";
        console.log("Warning: ethernet says it's ipv6 but got version", x);
        return `ipv${x} whatever this is`;
      })
    ),
    sequence(
      tup(
        Uint(6).map(tag("differentiated services field")),
        Uint(2).map(tag("Explicit Congestion Notification"))
      )
    ).map(tag("Traffic class")),
    Uint(20).map(tag("Flow label")),
    Uint(16).map(tag("paylod length")),
    Uint(8).map(tag("Protocol", (x) => protocol_dict[x] ?? "unknown")),
    Uint(8).map(tag("Hop limit")),
    IP6_parser("source adress"),
    IP6_parser("destination adress")
  )
);

export const ip6Info = (frame: ip6Type) => {
  return {
    sourceIP: frame[6].description as string,
    destIP: frame[7].description as string,
    size: frame[2].value,
    protocol: frame[4].value,
  };
};

const ip6Comp: layerComp<ip6Type> = {
  name: "ipv6",
  infoF: ip6Info,
  parser: ip6Parser,
  canHaveLayer: true,
};

export default ip6Comp;
