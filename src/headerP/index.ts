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
import { tag } from "./utils";

export * from "./utils";

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

export const ethernet_parser = sequence([
  MAC_parser("Destination Mac Adress"), // dest MAC
  MAC_parser("Source Mac Adress"), // source MAC
  Uint(16).map(tag("Type")), // type
]);

export const ip4_parser = sequence([
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

export const tcp_parser = sequence([
  Uint(16).map(tag("Source Port")), // source port
  Uint(16).map(tag("Destination Port")), // dest port
  Uint(32).map(tag("Sequence Number")), // Sequence number
  Uint(32).map(tag("ACK number")), // ACK number
  Uint(4).map(tag("Data offset")), // data offset
  sequence(Array.from({ length: 3 }, () => Zero)).map(tag("Reserved zeros")), // 3 reserved bits, should be 0
  sequence([
    // Flags
    Bit.map(tag("NS")), // NS
    Bit.map(tag("CWR")), // CWR
    Bit.map(tag("ECE")), // ECE
    Bit.map(tag("URG")), // URG
    Bit.map(tag("ACK")), // ACK
    Bit.map(tag("PSH")), // PSH
    Bit.map(tag("RST")), // RST
    Bit.map(tag("SYN")), // SYN
    Bit.map(tag("FIN")), // FIN
  ]).map(tag("Flags")),
  Uint(16).map(tag("Window size")), // Window Size
  Uint(16).map(tag("CheckSum")), // Checksum
  Uint(16).map(tag("Urgen Pointer")), // urgent pointer
]).chain((x) => {
  // Unsuported TCP options
  if (x && x[4].value > 5) {
    let n = x[4].value as number;
    return sequence(Array.from({ length: n - 5 }, () => Uint(32)))
      .map(tag("Unsuported TCP options"))
      .map((res) => [...x, res]);
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
    if (x && x[2].value === 0x800)
      return ip4_parser.map((res) => (res ? [x, res] : x));
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[1]) {
      let ip_result = x[1] as any[]; // HACK
      if (ip_result[9].value === 0x6)
        return tcp_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[2]) {
      let tcp_result = x[2] as any[]; // HACK
      if (tcp_result[1].value == 80)
        return http_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    // Unsuported Data
    if (!x || !x[1]) return succeed(x);

    let ip_result = x[1] as any[];
    return readUntilI(ip_result[4].value + 14) // HACK hard typed ethernet header size
      .map(tag("Unsuported Data"))
      .map((res) => (res ? [...x, res] : x));
  });
