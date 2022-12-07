import { Bit, sequence, succeed, Uint, Zero } from "../parser";
import { tag } from "./utils";

const tcp_parser = sequence([
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

export default tcp_parser;
