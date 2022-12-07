import {
  header_parser,
  readBinF,
  readF,
} from "./headerP";
import { many, sequence, tup } from "./parser";

let data = readBinF("data/http-chunked-gzip.pcap");

// TODO, make an offset in parserState for readUntilI works for others, or use correctly the data field ?
let result = many(header_parser).run(data);

console.log(result.result, result.bitIndex, result.error);
