import { addIndex, everythingUntil, RawString } from "../parser";

const http_parser = everythingUntil(RawString("\x0D\x0A\x0D\x0A"))
  .map((x) =>
    x
      .map((e) => String.fromCharCode(e))
      .join("")
      .split("\r\n")
  )
  .chain((x) => addIndex(4).map(() => x));

export default http_parser;
