import { Bit, Int, RawString, sequence, str, tup, Uint } from "./parser";

console.log("test");

let parser = sequence(tup(
  Uint(6),
  RawString("\x9EXZ"),
  Int(10),
  str("~a")
));

console.log(parser.run("nyah~~a"));
