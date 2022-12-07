import {
  readUntilI,
  succeed,
  Uint,
  coroutine,
  getIndex,
  peekUInts,
  possibly,
  fail,
} from "../parser";
import { tag } from "./utils";

import ethernet_parser from "./ethernetP";
import http_formater from "./httpP";
import ip4_parser from "./ipP";
import tcp_parser from "./tcpP";

export * from "./utils";
export * from "./ipP";
export * from "./ethernetP";
export * from "./httpP";
export * from "./tcpP";

// TODO make this code cleaner / find a better way
const header_parser = coroutine((run) => {
  let ethernet_frame = run(ethernet_parser);
  let ip_frame = null;
  let tcp_frame = null;
  let is_http = false;
  let unknown_data = null;
  let peek = null;

  const { index, bitIndex } = run(getIndex);

  if (ethernet_frame[2].value !== 0x800) {
    console.log("Error, not ipv4. Cannot continue");
    run(fail("header_parser: Not ipv4, cannot continue"));
  }

  ip_frame = run(ip4_parser);
  if (ip_frame[9].value === 0x6) {
    tcp_frame = run(tcp_parser);
    is_http = tcp_frame[0].value === 80 || tcp_frame[1].value === 80;
  }

  let size = ip_frame[4].value as number;
  unknown_data = run(
    readUntilI(size + index)
      .map((x) => (x ? x.map((e) => e.toString(16)).join("") : x))
      .map(tag("Unsuported data"))
  );

  peek = run(
    possibly(
      peekUInts(16)
        .map((x) => x.map((e) => e.toString(16)))
        .map(tag("Peek next bytes", () => "For debug only"))
    )
  );

  if (is_http)
    return [
      ethernet_frame,
      ip_frame,
      tcp_frame,
      unknown_data.value ? http_formater(unknown_data.value) : unknown_data,
      peek,
    ];
  return [ethernet_frame, ip_frame, tcp_frame, unknown_data, peek];
});

export default header_parser;
