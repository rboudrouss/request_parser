import {
  cleanInput,
  convertToBin,
  ethernet_parser,
  http_parser,
  ip4_parser,
  readBinF,
  readF,
  tcp_parser,
  writeBinF,
} from "./headerP";
import {
  Bit,
  everythingUntil,
  Int,
  logState,
  RawString,
  sequence,
  str,
  succeed,
  tup,
  Uint,
  Zero,
} from "./parser";

let parser = sequence(
  tup(
    ethernet_parser,
    ip4_parser,
    tcp_parser,
    http_parser
  )
);

let data = readBinF("data/http.pcap");

let result = parser.run(data);

console.log(result.result, result.bitIndex, result.error);