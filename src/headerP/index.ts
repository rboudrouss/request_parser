import { sequence, tup, Uint } from "../parser";

let ethernet = sequence(tup(
    Uint(7)
))