import { sequence, Uint } from "../parser";
import { MAC_parser } from "./basicP";
import { tag } from "./utils";

const ethernet_parser = sequence([
  sequence(Array.from({ length: 16 }, () => Uint(8)))
    .map((x) => x.map((e) => e.toString(16)).join(""))
    .map(tag("Preambule (?)")),
  MAC_parser("Destination Mac Adress"), // dest MAC
  MAC_parser("Source Mac Adress"), // source MAC
  Uint(16).map(tag("Type")), // type
]);

export default ethernet_parser;
