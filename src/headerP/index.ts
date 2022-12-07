import {
  readUntilI,
  succeed,
  Zero,
  fail,
  Uint,
  coroutine,
  getIndex,
  sequence,
  peekInt,
  peekUInts,
} from "../parser";
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

// TODO find a way to not excecute tcp if ip failed but stil executing the rest
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
  .chain((x) =>
    x
      ? Uint(32)
          .map(tag("CRC checksum"))
          .map((res) => (res ? [...x, res] : x))
      : succeed(x)
  )
  .chain((x) => {
    // Unsuported Data
    if (!x || !x[1]) return succeed(x);

    let ip_result = x[1] as any[];
    return readUntilI(ip_result[4].value + 14) // HACK hard typed ethernet header size
      .map(tag("Unsuported Data"))
      .map((res) => (res ? [...x, res] : x));
  });

// TODO make this code cleaner / find a better way
export const header_parser2 = coroutine((run) => {
  let ethernet_frame = run(ethernet_parser);
  let ip_frame = null;
  let tcp_frame = null;
  let http_frame = null;
  let unknown_data = null;
  let peek = null;

  const { index, bitIndex } = run(getIndex);

  if (ethernet_frame[3].value !== 0x800)
    return [
      ethernet_frame,
      run(
        peekUInts(16)
          .map((x) => x.map((e) => e.toString(16)))
          .map(tag("Peek next bytes", () => "For debug only"))
      ),
    ];

  ip_frame = run(ip4_parser);
  if (ip_frame[9].value === 0x6) {
    tcp_frame = run(tcp_parser);
    if (tcp_frame[1].value === 80) http_frame = run(http_parser);
  }

  let size = ip_frame[4].value as number;
  unknown_data = run(
    readUntilI(size + index)
      .map((x) => (x ? x.map((e) => e.toString(16)).join("") : x))
      .map(tag("Unsuported data"))
  );

  peek = run(
    peekUInts(16)
      .map((x) => x.map((e) => e.toString(16)))
      .map(tag("Peek next bytes", () => "For debug only"))
  );

  if (http_frame)
    return [
      ethernet_frame,
      ip_frame,
      tcp_frame,
      http_frame,
      unknown_data,
      peek,
    ];
  if (tcp_frame)
    return [ethernet_frame, ip_frame, tcp_frame, unknown_data, peek];
  return [ethernet_frame, ip_frame, unknown_data, peek];
});
