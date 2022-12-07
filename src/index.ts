import header_parser from "./headerP";
import { readF, writeF } from "./headerP";
import { many } from "./parser";

let data = readF("data/txt/http2.txtcap");

console.log(data);

let result = many(header_parser).run(data);

console.log(result.result);

writeF(JSON.stringify(result.result), "data/temp/exampletxt.json");
