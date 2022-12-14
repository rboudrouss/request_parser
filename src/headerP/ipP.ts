import Parser, {
  Bit,
  sequence,
  succeed,
  Uint,
  Zero,
  tup,
  addIndex,
} from "../parser";
import { IP4_parser, IP6_parser, MAC_parser } from "./basicP";
import { tag, taged_value } from "./utils";

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

export type ip4_result = [
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

const ip4h_parser = sequence(
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
).chain((x): Parser<ip4_result, unknown> => {
  // Unsuported IP options
  if (x && x[1].value > 5) {
    return sequence(
      tup(...Array.from({ length: x[1].value - 5 }, () => Uint(32)))
    )
      .map(tag("Unsuported IP options"))
      .map((res) => [...x, res]);
  }

  return succeed([...x, null]);
});

export default ip4h_parser;

export type ip6h_result = [
  taged_value<number>,
  taged_value<[taged_value<number>, taged_value<number>]>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number[]>,
  taged_value<number[]>
];

export const ip6h_parser = sequence<ip6h_result, unknown>(
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

export type ARP_result = [
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number[]>,
  taged_value<number[]>,
  taged_value<number[]>,
  taged_value<number[]>
];

export const ARP_parser = sequence(
  tup(
    Uint(16).map(
      tag("Hardware type", (x) => (x===1 ? "ethernet" : "unknown"))
    ),
    Uint(16).map(
      tag("Protocol type", (x) => (x===0x800 ? "ipv4" : "unknown"))
    ),
    Uint(8).map(tag("hardware address length")),
    Uint(8).map(tag("protocol address length")),
    Uint(16).map(tag("operation"))
  )
).chain((x): Parser<ARP_result, unknown> => {
  if (x[0].value===1 && x[1].value === 0x800)
    return sequence(
      tup(
        MAC_parser("Sender Hardware Address"),
        IP4_parser("Sender Protocol Address"),
        MAC_parser("Target Hardware Address"),
        IP4_parser("Target Protocol Address")
      )
    ).chain((res) => addIndex(18).map(() => [...x, ...res]));
  else {
    return sequence(
      tup(
        sequence(tup(...Array.from({ length: x[2].value }, () => Uint(8)))).map(
          tag("Sender Hardware Adress")
        ),
        sequence(tup(...Array.from({ length: x[3].value }, () => Uint(8)))).map(
          tag("Sender Protocole Adress")
        ),
        sequence(tup(...Array.from({ length: x[2].value }, () => Uint(8)))).map(
          tag("Target Hardware Adress")
        ),
        sequence(tup(...Array.from({ length: x[3].value }, () => Uint(8)))).map(
          tag("Target Protocol Adress")
        )
      )
    ).chain((res) =>
      addIndex(
        (x[2].value + x[3].value) * 2 > 38
          ? 0
          : 38 - (x[2].value + x[3].value) * 2
      ).map(() => [...x, ...res])
    );
  }
});

export type IPLayerT = ip4_result | ip6h_result | ARP_result;
