import {
  Bit,
  sequence,
  succeed,
  Uint,
  Zero,
  tup,
  addIndex,
} from "../parser";
import { IP4_parser, IP6_parser, MAC_parser } from "./basicP";
import { tag } from "./utils";

// FIXME important typer ça correctement

const protocol_dict: { [key: number]: string } = {
  0: "HOPOPT",
  1: "ICMP",
  2: "IGMP",
  3: "GGP",
  4: "IP-in-IP",
  5: "ST",
  6: "TCP",
  7: "CBT",
  8: "EGP",
  9: "IGP",
  11: "NVP-II",
  16: "chaos",
  17: "UDP",
  18: "MUX",
};

const ip4h_parser = sequence([
  Uint(4).map(
    tag("ip version", (x) => {
      if (x === 4) return "ipv4";
      console.log("Warning: ethernet says it's ipv4 but got version", x);
      return `ipv${x} whatever this is`;
    })
  ), // ip version
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
  Uint(8).map(tag("Protocol", (x) => protocol_dict[x] ?? "unknown")), // Protocol
  Uint(16).map(tag("header CheckSumm")), // header CheckSum
  IP4_parser("Source IP Adress"), // source IP
  IP4_parser("Destination IP Adress"), // Dest IP
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

export default ip4h_parser;

export const icmp_parser = sequence([
  Uint(8).map(
    tag("Type", (x) => {
      return (
        {
          0: "echo reply",
          3: "destionation unreachable",
          5: "redirect message",
          8: "echo request",
          9: "router advertisement",
          10: "router solicitation",
          11: "time exceeded",
          12: "bad ip header",
          13: "timestamp",
          14: "timestamp reply",
          42: "extended echo request",
          43: "extended echo reply",
        }[x] ?? "unknown"
      );
    })
  ),
  Uint(8).map(tag("code")),
  Uint(32).map(tag("rest of header")),
]);

export const ip6h_parser = sequence(
  tup(
    Uint(4).map(
      tag("version", (x) => {
        if (x === 4) return "ipv4";
        console.log("Warning: ethernet says it's ipv6 but got version", x);
        return `ipv${x} whatever this is`;
      })
    ),
    sequence([
      Uint(6).map(tag("differentiated services field")),
      Uint(2).map(tag("Explicit Congestion Notification")),
    ]).map(tag("Traffic class")),
    Uint(20).map(tag("Flow label")),
    Uint(16).map(tag("paylod length")),
    Uint(8).map((tag("Protocol"), (x) => protocol_dict[x] ?? "unknown")),
    Uint(8).map(tag("Hop limit")),
    IP6_parser("source adress"),
    IP6_parser("destination adress")
  )
);

export const ARP_parser = sequence([
  Uint(16).map(tag("Hardware type", (x) => (x == 1 ? "ethernet" : "unknown"))),
  Uint(16).map(tag("Protocol type", (x) => (x == 0x800 ? "ipv4" : "unknown"))),
  Uint(8).map(tag("hardware address length")),
  Uint(8).map(tag("protocol address length")),
  Uint(16).map(tag("operation")),
]).chain((x) => {
  if (x[0].value == 1 && x[1].value === 0x800)
    return sequence([
      MAC_parser("Sender Hardware Address"),
      IP4_parser("Sender Protocol Address"),
      MAC_parser("Target Hardware Address"),
      IP4_parser("Target Protocol Address"),
    ])
      .map((res) => [...x, ...res])
      .chain((res2) => addIndex(18).map(() => res2));
  else {
    console.log("ARP is supported only for ipv4 to MAC");
    return fail("ARP_parser: ARP is supported only for ipv4 to MAC");
  }
});
