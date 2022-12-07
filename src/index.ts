import {
  header_parser,
  header_parser2,
  readBinF,
  readF,
  writeF,
} from "./headerP";
import { many, many1, sequence, tup } from "./parser";

let data = readF("data/txt/http2.txtcap");

console.log(data)

let result = many(header_parser2).run(data);

console.log(result.result);

writeF(JSON.stringify(result.result), "data/temp/exampletxt.json")