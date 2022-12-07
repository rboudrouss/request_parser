import {
  Bit,
  everythingUntil,
  RawString,
  readUntilI,
  sequence,
  succeed,
  Uint,
  Zero,
} from "../parser";

export * from "./utils";

export const MAC_parser = sequence(Array.from({ length: 6 }, () => Uint(8)));
export const IP_parser = sequence(Array.from({ length: 4 }, () => Uint(8)));

export const ethernet_parser = sequence([
  MAC_parser, // dest MAC
  MAC_parser, // source MAC
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
]).chain((x) => {
  if (x && x[1] > 5) {
    let n = x[1] as number;
    return sequence(Array.from({ length: n - 5 }, () => Uint(32))).map(
      (res) => [...x, res]
    );
  }

  return succeed(x);
});

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
]).chain((x) => {
  if (x && x[4] > 5) {
    let n = x[4] as number;
    return sequence(Array.from({ length: n - 5 }, () => Uint(32))).map(
      (res) => [...x, res]
    );
  }
  return succeed(x);
});

export const http_parser = everythingUntil(RawString("\x0D\x0A\x0D\x0A")).map(
  (x) =>
    x
      .map((e) => String.fromCharCode(e))
      .join("")
      .split("\r\n")
);

export const header_parser = ethernet_parser
  .chain((x) => {
    if (x && x[2] === 0x800)
      return ip4_parser.map((res) => (res ? [x, res] : x));
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[1]) {
      let ip_result = x[1] as number[];
      if (ip_result[9] === 0x6)
        return tcp_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[2]) {
      let tcp_result = x[2] as number[];
      if (tcp_result[1] == 80)
        return http_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    if (!x || !x[1]) return succeed(x);

    let ip_result = x[1] as number[];
    return readUntilI(ip_result[4]).map((res) => (res ? [...x, res] : x));
  });
