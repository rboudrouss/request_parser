import { Bit, sequence, succeed, Uint, Zero } from "../parser";
import { IP_parser } from "./basicP";
import { tag } from "./utils";

const ip4_parser = sequence([
  Uint(4).map(tag("ip version")), // ip version
  Uint(4).map(tag("IHL")), // IHL (Internet Header Length)
  Uint(6).map(tag("DSCP")), // DSCP
  Uint(2).map(tag("ECN")), // ECN
  Uint(16).map(tag("Total Length")), // Total length
  Uint(16).map(tag("Identification")), // Identification
  sequence([
    // Flags
    Zero.map(tag("Reserved")), // reserved must be a 0
    Bit.map(tag("Don't fragment flag")), // Don't fragment
    Bit.map(tag("More Fragments flag")), // more Fragments
  ]).map(tag("Flags")),
  Uint(13).map(tag("Fragment Offset")), // Fragment Offset
  Uint(8).map(tag("Time to live")), // Time to live
  Uint(8).map(tag("Protocol")), // Protocol
  Uint(16).map(tag("header CheckSumm")), // header CheckSum
  IP_parser("Source IP Adress"), // source IP
  IP_parser("Destination IP Adress"), // Dest IP
]).chain((x) => {
  // Unsuported IP options
  if (x && x[1].value > 5) {
    let n = x[1].value as number;
    return sequence(Array.from({ length: n - 5 }, () => Uint(32)))
      .map(tag("Unsuported IP options"))
      .map((res) => [...x, res]);
  }

  return succeed(x);
});

export default ip4_parser;
