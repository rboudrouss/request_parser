import { sequence, str } from "./parser"

export function tup<T extends any[]>(...data: T) {
    return data;
}

console.log("test")


let parser = sequence(tup(
    str("nyah"),
    str("~~"),
    str(" "),
))
console.log(parser.run("nyah~~"))