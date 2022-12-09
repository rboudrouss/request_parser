import {
  readUntilI,
  succeed,
  coroutine,
  getIndex,
  peekUInts,
  possibly,
  fail,
} from "../parser";
import { tag, tcp_flagsM } from "./utils";

import ethernet_parser from "./ethernetP";
import http_formater from "./httpP";
import ip4h_parser, { ARP_parser, ip6h_parser } from "./ipP";
import tcp_parser from "./tcpP";

export * from "./utils";
export * from "./ipP";
export * from "./ethernetP";
export * from "./httpP";
export * from "./tcpP";

const toStringNumL = (l: number[]) => l.map((e) => e.toString()).join(",");

// TODO make this code cleaner / find a better way
// TODO fait trop à la va vite, ce code est vraiment pas propre
const header_parser = coroutine((run) => {
  let ethernet_frame = run(ethernet_parser);
  let ip_frame: any = null;
  let tcp_frame = null;
  let is_http = false;
  let unknown_data = null;
  let peek = null;
  let size = 0;
  let protocol = -1;
  let filter_info: { [key: string]: any } = {
    mac: [ethernet_frame[1].description, ethernet_frame[0].description],
    layers: ["ethernet", null, null, null],
  };

  const { index, bitIndex } = run(getIndex);

  if (ethernet_frame[2].value === 0x800) {
    // protocol is ipv4
    ip_frame = run(ip4h_parser);
    protocol = ip_frame[9].value as number;
    size = ip_frame[4].value as number;
    filter_info["ip"] = [ip_frame[11].description, ip_frame[12].description];
    filter_info.layers[1] = "ipv4";
  } else if (ethernet_frame[2].value === 0x86dd) {
    // protocol is ipv6
    ip_frame = run(ip6h_parser) as any;
    protocol = ip_frame[4].value as number; // HACK
    size = ip_frame[3].value as number;
    filter_info["ip"] = [ip_frame[6].description, ip_frame[7].description];
    filter_info.layers[1] = "ipv6";
  } else if (ethernet_frame[2].value === 0x0806) {
    // protocol is ARP
    ip_frame = run(ARP_parser);
    let sourceh = ip_frame[5];
    let sourcep = ip_frame[6];
    let desth = ip_frame[7];
    let destp = ip_frame[8];
    if (ip_frame[0].value == 1 && ip_frame[1].value === 0x800)
      filter_info["ip"] = [
        sourceh.description,
        sourcep.description,
        desth.description,
        destp.description,
      ];
    else
      filter_info["ip"] = [
        toStringNumL(sourcep.value as number[]),
        toStringNumL(destp.value as number[]),
        toStringNumL(sourceh.value as number[]),
        toStringNumL(desth.value as number[]),
      ];
    filter_info.layers[1] = "arp";
  } else {
    console.log("Error, Internet protocol not supported. Cannot continue");
    run(fail("header_parser: Unsupported Internet protocol"));
  }
  if (protocol === 0x6) {
    tcp_frame = run(tcp_parser);
    is_http = tcp_frame[0].value === 80 || tcp_frame[1].value === 80;
    filter_info["port"] = [tcp_frame[0].value.toString(), tcp_frame[1].value.toString()];
    filter_info.layers[2] = "tcp";

    let tcp_flags = (tcp_frame[6].value as any[]).map(e => e.value) as number[]
    for (let i = 0; i<tcp_flagsM.length; i++)
      if(tcp_flags[i] === 1)
        filter_info[tcp_flagsM[i].toLowerCase()] = true
  }

  unknown_data = run(
    (size ? readUntilI(size + index) : succeed(null))
      .map((x) =>
        x ? x.map((e) => e.toString(16).padStart(2, "0")).join("") : x
      )
      .map(tag("Data"))
  );

  peek = run(
    possibly(
      peekUInts(16)
        .map((x) => x.map((e) => e.toString(16).padStart(2, "0")))
        .map(tag("Peek next bytes", () => "For debug only"))
    )
  );

  is_http &&=
    unknown_data.value
      ?.split("")
      ?.reduce((acc: string[][], _, i, arr) => {
        if (i % 2 == 0) acc.push(arr.slice(i, i + 2));
        return acc;
      }, [])
      ?.map((s) => Number(`0x${s[0]}${s[1]}`))
      ?.map((n) => String.fromCharCode(n))
      ?.join("")
      ?.includes("HTTP") ?? false;

  // HACK
  if (is_http) {
    filter_info["http"] = is_http;
    filter_info.layers[3] = "http";
  }

  if (is_http)
    return [
      filter_info,
      ethernet_frame,
      ip_frame,
      tcp_frame,
      unknown_data.value ? http_formater(unknown_data.value) : unknown_data,
      peek,
    ];
  return [filter_info, ethernet_frame, ip_frame, tcp_frame, unknown_data, peek];
});

export default header_parser;
