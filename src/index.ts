import {
  cleanInput,
  convertToBin,
  ethernet_parser,
  ip4_parser,
  readBinF,
  readF,
  tcp_parser,
  writeBinF,
} from "./headerP";
import {
  Bit,
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


let parser = sequence(tup(ethernet_parser, ip4_parser, tcp_parser));

let data = readBinF("data/http.pcap");
writeBinF(data,"data/temp/http.pcap")

let result = parser.run(data);

console.log(result.result, result.bitIndex);
