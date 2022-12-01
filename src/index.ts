import { Bit, sequence, str } from "./parser";

export function tup<T extends any[]>(...data: T) {
  return data;
}

console.log("test");

let parser = sequence(
  tup(
    str("nyah"),
    str("~~"),
    sequence(Array.from({length:8}, () => Bit))
  )
);
console.log(parser.run("nyah~~a"));
