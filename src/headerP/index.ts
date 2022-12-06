import {
  Bit,
  everythingUntil,
  many1,
  RawString,
  sequence,
  Uint,
  Zero,
} from "../parser";

export * from "./utils";

export const MAC_parser = sequence(Array.from({ length: 6 }, () => Uint(8)));
export const IP_parser = sequence(Array.from({ length: 4 }, () => Uint(8)));

export const ethernet_parser = sequence([
  MAC_parser, // source MAC
  MAC_parser, // dest MAC
  Uint(16), // type
]);

export const ip4_parser = sequence([
  Uint(4), // ip version
  Uint(4), // IHL (Internet Header Length)
  Uint(6), // DSCP
  Uint(2), // ECN
  Uint(16), // Total length
  Uint(16), // Identification
  sequence([
    // Flags
    Zero, // reserved must be a 0
    Bit, // Don't fragment
    Bit, // more Fragments
  ]),
  Uint(13), // Fragment Offset
  Uint(8), // Time to live
  Uint(8), // Protocol
  Uint(16), // header CheckSum
  IP_parser, // source IP
  IP_parser, // Dest IP
]);

export const tcp_parser = sequence([
  Uint(16), // source port
  Uint(16), // dest port
  Uint(32), // Sequence number
  Uint(32), // ACK number
  Uint(4), // data offset
  sequence(Array.from({ length: 3 }, () => Zero)), // 3 reserved bits, should be 0
  sequence([
    // Flags
    Bit, // NS
    Bit, // CWR
    Bit, // ECE
    Bit, // URG
    Bit, // ACK
    Bit, // PSH
    Bit, // RST
    Bit, // SYN
    Bit, // FIN
  ]),
  Uint(16), // Window Size
  Uint(16), // Checksum
  Uint(16), // urgent pointer
]);

export const http_parser = everythingUntil(RawString("\x0D\x0A\x0D\x0A")).map(
  (x) =>
    x
      .map((e) => String.fromCharCode(e))
      .join("")
      .split("\r\n")
);
