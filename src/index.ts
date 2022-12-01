import { Bit, RawString, sequence, str, tup, Uint } from "./parser";

console.log("test");

let parser = sequence(
  tup(Uint(4), Uint(2), Uint(2), RawString("yah"), Uint(8))
);
console.log(parser.run("nyah~~a"));
