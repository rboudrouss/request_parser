import Parser, { Bit, sequence, succeed, tup, Uint, Zero } from "../parser";
import { tag, taged_value } from "./utils";

export type tcp_result = [
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<[0, 0, 0]>,
  taged_value<
    [
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>,
      taged_value<number>
    ]
  >,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number[]> | null
];

const tcp_parser = sequence(
  tup(
    Uint(16).map(tag("Source Port")), // source port
    Uint(16).map(tag("Destination Port")), // dest port
    Uint(32).map(tag("Sequence Number")), // Sequence number
    Uint(32).map(tag("ACK number")), // ACK number
    Uint(4).map(tag("Data offset")), // data offset
    sequence<[0, 0, 0], unknown>(tup(Zero, Zero, Zero)).map(
      tag("Reserved zeros")
    ), // 3 reserved bits, should be 0
    sequence(
      tup(
        // Flags
        Bit.map(tag("NS")), // NS
        Bit.map(tag("CWR")), // CWR
        Bit.map(tag("ECE")), // ECE
        Bit.map(tag("URG")), // URG
        Bit.map(tag("ACK")), // ACK
        Bit.map(tag("PSH")), // PSH
        Bit.map(tag("RST")), // RST
        Bit.map(tag("SYN")), // SYN
        Bit.map(tag("FIN")) // FIN
      )
    ).map(tag("Flags")),
    Uint(16).map(tag("Window size")), // Window Size
    Uint(16).map(tag("CheckSum")), // Checksum
    Uint(16).map(tag("Urgen Pointer")) // urgent pointer
  )
).chain((x): Parser<tcp_result> => {
  // Unsuported TCP options
  if (x && x[4].value > 5) {
    return sequence(
      tup(...Array.from({ length: x[4].value - 5 }, () => Uint(32)))
    )
      .map(tag("Unsuported TCP options"))
      .map((res) => [...x, res]);
  }
  return succeed([...x, null]);
});

export default tcp_parser;

export type icmp_result = [
  taged_value<number>,
  taged_value<number>,
  taged_value<number>
];

export const icmp_parser = sequence<icmp_result, unknown>(
  tup(
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
    Uint(32).map(tag("rest of header"))
  )
);

export type TCPLayerT = tcp_result | icmp_result;
