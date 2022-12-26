import Parser from "../../parser";
import { tcp_flagE } from "../utils";

export interface transportInfo {
  sourceP: string;
  destP: string;
  flags?: tcp_flagE[];
}

export interface transportComp<T> {
  name: string;
  parser: Parser<T>;
  infoF: (frame: T) => transportInfo | null;
  toMsg?: (frame: T) => string;
}

export const icmpTypes: { [key: number]: string } = {
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
};
