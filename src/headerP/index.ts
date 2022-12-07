import { readUntilI, succeed, Zero } from "../parser";
import { tag } from "./utils";

import ethernet_parser from "./ethernetP";
import http_parser from "./httpP";
import ip4_parser from "./ipP";
import tcp_parser from "./tcpP";

export * from "./utils";
export * from "./ipP";
export * from "./ethernetP";
export * from "./httpP";
export * from "./tcpP";

export const header_parser = ethernet_parser
  .chain((x) => {
    if (x && x[2].value === 0x800)
      return ip4_parser.map((res) => (res ? [x, res] : x));
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[1]) {
      let ip_result = x[1] as any[]; // HACK
      if (ip_result[9].value === 0x6)
        return tcp_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    if (x && x[2]) {
      let tcp_result = x[2] as any[]; // HACK
      if (tcp_result[1].value == 80)
        return http_parser.map((res) => (res ? [...x, res] : x));
    }
    return succeed(x);
  })
  .chain((x) => {
    // Unsuported Data
    if (!x || !x[1]) return succeed(x);

    let ip_result = x[1] as any[];
    return readUntilI(ip_result[4].value + 14) // HACK hard typed ethernet header size
      .map(tag("Unsuported Data"))
      .map((res) => (res ? [...x, res] : x));
  });
