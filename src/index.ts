import {
  header_parser,
  header_parser2,
  readBinF,
  readF,
  writeF,
} from "./headerP";
import { many, many1, sequence, tup } from "./parser";

let data = readBinF("data/http-chunked-gzip.pcap");

// TODO, make an offset in parserState for readUntilI works for others, or use correctly the data field ?
let result = many(header_parser2).run(data);

console.log(result.result);

writeF(JSON.stringify(result.result), "data/temp/example.json")