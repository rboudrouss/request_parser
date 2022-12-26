import { sequence, Uint, tup } from "../../parser";
import { MAC_parser } from "../basicP";
import { tag, taged_value } from "../utils";

export type ethernetType = [
  taged_value<number[]>,
  taged_value<number[]>,
  taged_value<number>
];

const ethernetParser = sequence<ethernetType, unknown>(
  tup(
    MAC_parser("Destination Mac Adress"), // dest MAC
    MAC_parser("Source Mac Adress"), // source MAC
    Uint(16).map(tag("Type")) // type
  )
);

export default ethernetParser;
