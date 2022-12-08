import { addIndex, everythingUntil, RawString } from "../parser";

// FIXME make it detected better
const http_formater = (data: string) =>
  data
    .split("")
    .reduce((acc: string[][], _, i, arr) => {
      if (i % 2 == 0) acc.push(arr.slice(i, i + 2));
      return acc;
    }, [])
    .map((s) => Number(`0x${s[0]}${s[1]}`))
    .map((n) => String.fromCharCode(n))
    .join("")
    .split("\r\n");

export default http_formater;
