import { taged_value, tag } from "../utils";
import { sequence, tup, Uint } from "../../parser";
import { icmpTypes, transportComp } from "./utils";

export type icmpType = [
  taged_value<number>,
  taged_value<number>,
  taged_value<number>
];

export const icmpParser = sequence<icmpType, unknown>(
  tup(
    Uint(8).map(
      tag("Type", (x) => {
        return icmpTypes[x] ?? "unknown";
      })
    ),
    Uint(8).map(tag("code")),
    Uint(32).map(tag("rest of header"))
  )
);

const icmpComp: transportComp<icmpType> = {
  name: "icmp",
  parser: icmpParser,
  infoF: () => null,
};

export default icmpComp;
