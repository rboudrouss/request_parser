import {
  ethernet_parser,
  http_parser,
  ip4_parser,
  readBinF,
  readF,
  tcp_parser,
} from "./headerP";
import { sequence, tup } from "./parser";

let parser = sequence(
  tup(ethernet_parser, ip4_parser, tcp_parser, http_parser)
);

let data = readF("data/example1.txtcap");

let result = parser.run(data);

console.log(result.result, result.bitIndex, result.error);
