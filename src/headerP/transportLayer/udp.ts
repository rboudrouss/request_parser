import { sequence, tup, Uint } from "../../parser";
import { tag, taged_value } from "../utils";
import { transportComp, transportInfo } from "./utils";

export type udpType = [
  taged_value<number>,
  taged_value<number>,
  taged_value<number>,
  taged_value<number>
];

export const udpParser = sequence<udpType, unknown>(
  tup(
    Uint(16).map(tag("Source Port")),
    Uint(16).map(tag("dest port")),
    Uint(16).map(tag("Longueur")),
    Uint(16).map(tag("Somme de contrôle"))
  )
);

export const udpInfo = (frame: udpType): transportInfo => {
  return {
    sourceP: frame[0].value.toString(),
    destP: frame[1].value.toString(),
  };
};

const udpComp: transportComp<udpType> = {
  name: "udp",
  infoF: udpInfo,
  parser: udpParser,
  toMsg: () => "UDP",
};

export default udpComp;
