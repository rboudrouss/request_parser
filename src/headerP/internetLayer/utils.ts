import Parser from "../../parser";
import { toArrowT } from "../utils";

export interface internetInfo {
  sourceIP: string;
  destIP: string;
  size: number;
  protocol?: number;
  sourceMAC?: string;
  destMAC?: string;
}

export interface layerComp<T> {
  name: string;
  parser: Parser<T>;
  infoF: (frame: T) => internetInfo;
  canHaveLayer: boolean;
  toMsg?: (frame: T) => string;
}

export const protocol_dict: { [key: number]: string } = {
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
