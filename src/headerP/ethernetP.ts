import { sequence, Uint } from "../parser";
import { MAC_parser } from "./basicP";
import { tag } from "./utils";

const ethernet_parser = sequence([
  MAC_parser("Destination Mac Adress"), // dest MAC
  MAC_parser("Source Mac Adress"), // source MAC
  Uint(16).map(tag("Type")), // type
]);

export default ethernet_parser;