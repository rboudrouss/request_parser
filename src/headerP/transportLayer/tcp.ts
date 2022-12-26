import { taged_value, tag, tcp_flagsM, tcp_flagE } from "../utils";
import Parser, { sequence, tup, Uint, Zero, Bit, succeed } from "../../parser";
import { transportComp, transportInfo } from "./utils";

export type tcpType = [
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

export const tcpParser = sequence(
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
).chain((x): Parser<tcpType> => {
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

export const tcpInfo = (frame: tcpType): transportInfo => {
  let out = [];
  let tcp_flags = frame[6].value.map((e) => e.value);
  for (let i = 0; i < tcp_flagsM.length; i++)
    if (tcp_flags[i] === 1) out.push(tcp_flagsM[i]);
  return {
    sourceP: frame[0].value.toString(),
    destP: frame[1].value.toString(),
    flags: out,
  };
};

export const tcpToArrow = (frame: tcpType) => {
  const { sourceP, destP, flags } = tcpInfo(frame);

  let act_flags = flags ? flags.map((x) => tcp_flagE[x].toUpperCase()) : [];

  let seq_N = frame[2].value;
  let ack_N = frame[3].value;

  return `${sourceP.padStart(5, " ")} -----> ${destP.padStart(5, " ")} : [ ${act_flags.join(
    ", "
  )} ] Seq=${seq_N} Ack=${ack_N}`;
};

const tcpComp: transportComp<tcpType> = {
  name: "tcp",
  parser: tcpParser,
  infoF: tcpInfo,
  toMsg: tcpToArrow,
};

export default tcpComp;
