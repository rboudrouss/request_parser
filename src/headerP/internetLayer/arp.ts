import { tag, taged_value } from "../utils";
import Parser, { addIndex, sequence, tup, Uint } from "../../parser";
import { MAC_parser, IP4_parser } from "../basicP";
import { internetInfo, layerComp } from "./utils";

const toStringNumL = (l: number[]) => l.map((e) => e.toString()).join(",");

export type arpType = [
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

export const arpParser = sequence(
  tup(
    Uint(16).map(
      tag("Hardware type", (x) => (x === 1 ? "ethernet" : "unknown"))
    ),
    Uint(16).map(
      tag("Protocol type", (x) => (x === 0x800 ? "ipv4" : "unknown"))
    ),
    Uint(8).map(tag("hardware address length")),
    Uint(8).map(tag("protocol address length")),
    Uint(16).map(tag("operation"))
  )
).chain((x): Parser<arpType, unknown> => {
  if (x[0].value === 1 && x[1].value === 0x800)
    return sequence(
      tup(
        MAC_parser("Sender Hardware Address"),
        IP4_parser("Sender Protocol Address"),
        MAC_parser("Target Hardware Address"),
        IP4_parser("Target Protocol Address")
      )
    ).chain((res) => addIndex(18).map(() => [...x, ...res]));
  // HACK harcoded 18
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
        (x[2].value + x[3].value) * 2 > 38 // HACK hardcoded 38
          ? 0
          : 38 - (x[2].value + x[3].value) * 2
      ).map(() => [...x, ...res])
    );
  }
});

export const arpInfo = (frame: arpType): internetInfo => {
  return {
    destIP: frame[8].description ?? toStringNumL(frame[8].value),
    sourceIP: frame[6].description ?? toStringNumL(frame[6].value),
    destMAC: frame[7].description ?? toStringNumL(frame[7].value),
    sourceMAC: frame[5].description ?? toStringNumL(frame[5].value),
    size: Math.max((frame[2].value + frame[3].value) * 2, 38) + 8,
  };
};

export const arpMsg = (frame: arpType): string => {
  const { destIP, sourceMAC } = arpInfo(frame);
  return `who has ${destIP} ? tell ${sourceMAC}`;
};

const arpComp: layerComp<arpType> = {
  name: "arp",
  infoF: arpInfo,
  parser: arpParser,
  canHaveLayer: false,
  toMsg: arpMsg,
};

export default arpComp;
