import { tag, taged_value } from "../utils";
import Parser, { Bit, sequence, succeed, tup, Uint, Zero } from "../../parser";
import { IP4_parser } from "../basicP";
import { internetInfo, layerComp, protocol_dict } from "./utils";

export type ip4Type = [
  taged_value<number>, // ip version
  taged_value<number>, // IHL (Internet Header Length)
  taged_value<number>, // DSCP
  taged_value<number>, // ECN
  taged_value<number>, // Total length
  taged_value<number>, // Identification
  taged_value<
    [
      taged_value<0>, // reserved must be a 0
      taged_value<number>, // Don't fragment
      taged_value<number> // more Fragments
    ]
  >, // Flags
  taged_value<number>, // Fragment Offset
  taged_value<number>, // Time to live
  taged_value<number>, // Protocol
  taged_value<number>, // header CheckSum
  taged_value<number[]>, // source IP
  taged_value<number[]>, // Dest IP
  taged_value<number[]> | null // Unsuported IP options
];

export const ip4Parser = sequence(
  tup(
    Uint(4).map(
      tag("ip version", (x) => {
        if (x === 4) return "ipv4";
        console.log("Warning: ethernet says it's ipv4 but got version", x);
        return `ipv${x} whatever this is`;
      })
    ),
    Uint(4).map(tag("IHL")),
    Uint(6).map(tag("DSCP")),
    Uint(2).map(tag("ECN")),
    Uint(16).map(tag("Total Length")),
    Uint(16).map(tag("Identification")),
    sequence(
      tup(
        Zero.map(tag("Reserved")),
        Bit.map(tag("Don't fragment flag")),
        Bit.map(tag("More Fragments flag"))
      )
    ).map(tag("Flags")),
    Uint(13).map(tag("Fragment Offset")),
    Uint(8).map(tag("Time to live")),
    Uint(8).map(tag("Protocol", (x) => protocol_dict[x] ?? "unknown")),
    Uint(16).map(tag("header CheckSumm")),
    IP4_parser("Source IP Adress"),
    IP4_parser("Destination IP Adress")
  )
).chain((x): Parser<ip4Type, unknown> => {
  // Unsuported IP options
  if (x && x[1].value > 5) {
    return sequence(
      tup(...Array.from({ length: x[1].value - 5 }, () => Uint(32)))
    )
      .map(tag("Unsuported IP options"))
      .map((res) => [...x, res]);
  }

  return succeed([...x, null]); // FIXME Null ?
});

export const ip4Info = (frame: ip4Type): internetInfo => {
  return {
    sourceIP: frame[11].description as string,
    destIP: frame[11].description as string,
    size: frame[4].value,
    protocol: frame[9].value,
  };
};

const ip4Comp: layerComp<ip4Type> = {
  name: "ipv4",
  infoF: ip4Info,
  parser: ip4Parser,
  canHaveLayer: true,
};

export default ip4Comp;
