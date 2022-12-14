import {
  readUntilI,
  succeed,
  coroutine,
  getIndex,
  peekUInts,
  possibly,
  fail,
  many,
} from "../parser";
import { tag, taged_value, tcp_flagE, tcp_flagsM } from "./utils";

import ethernet_parser, { ethernet_result } from "./ethernetP";
import http_formater from "./httpP";
import ip4h_parser, { ARP_parser, ip6h_parser, IPLayerT } from "./ipP";
import tcp_parser, { icmp_parser, TCPLayerT } from "./tcpP";

export * from "./utils";
export * from "./ipP";
export * from "./ethernetP";
export * from "./httpP";
export * from "./tcpP";

const toStringNumL = (l: number[]) => l.map((e) => e.toString()).join(",");

export interface filter_dict {
  mac: [string, string];
  tcp_flags: tcp_flagE[];
  layers: [string | null, string | null, string | null, string | null];
  ip?: [string, string] | [string, string, string, string];
  port?: [string, string];
  http?: true;
  index?: number;
}

export type header_type = [
  filter_dict,
  ethernet_result,
  IPLayerT | null,
  TCPLayerT | null,
  [taged_value<string[] | null>],
  [taged_value<string> | null]
];

// TODO make this code cleaner / find a better way
// TODO fait trop à la va vite, ce code est vraiment pas propre
const header_parser = coroutine((run): header_type => {
  let ethernet_frame = run(ethernet_parser);
  let ip_frame: IPLayerT | null = null;
  let tcp_frame: TCPLayerT | null = null;
  let is_http = false;
  let unknown_data: taged_value<string[] | null> | null = null;
  let peek: taged_value<string> | null = null;
  let size = 0;
  let protocol = -1;
  let filter_info: filter_dict = {
    mac: [
      ethernet_frame[1].description as string,
      ethernet_frame[0].description as string,
    ],
    layers: ["ethernet", null, null, null],
    tcp_flags: [],
  };

  const { index } = run(getIndex);

  if (ethernet_frame[2].value === 0x800) {
    // protocol is ipv4
    ip_frame = run(ip4h_parser);
    protocol = ip_frame[9].value;
    size = ip_frame[4].value;
    filter_info["ip"] = [
      ip_frame[11].description as string,
      ip_frame[12].description as string,
    ];
    filter_info.layers[1] = "ipv4";
  } else if (ethernet_frame[2].value === 0x86dd) {
    // protocol is ipv6
    ip_frame = run(ip6h_parser);
    protocol = ip_frame[4].value;
    size = ip_frame[3].value;
    filter_info["ip"] = [
      ip_frame[6].description as string,
      ip_frame[7].description as string,
    ];
    filter_info.layers[1] = "ipv6";
  } else if (ethernet_frame[2].value === 0x0806) {
    // protocol is ARP
    ip_frame = run(ARP_parser);
    let sourceh = ip_frame[5];
    let sourcep = ip_frame[6];
    let desth = ip_frame[7];
    let destp = ip_frame[8];
    if (ip_frame[0].value === 1 && ip_frame[1].value === 0x800)
      filter_info["ip"] = [
        sourceh.description as string,
        sourcep.description as string,
        desth.description as string,
        destp.description as string,
      ];
    else
      filter_info["ip"] = [
        toStringNumL(sourcep.value),
        toStringNumL(destp.value),
        toStringNumL(sourceh.value),
        toStringNumL(desth.value),
      ];
    filter_info.layers[1] = "arp";
  } else {
    console.log("Error, Internet protocol not supported. Cannot continue");
    run(fail("header_parser: Unsupported Internet protocol"));
  }
  if (protocol === 0x6) {
    tcp_frame = run(tcp_parser);
    is_http = tcp_frame[0].value === 80 || tcp_frame[1].value === 80;
    filter_info["port"] = [
      tcp_frame[0].value.toString(),
      tcp_frame[1].value.toString(),
    ];
    filter_info.layers[2] = "tcp";

    let tcp_flags = tcp_frame[6].value.map((e) => e.value);
    for (let i = 0; i < tcp_flagsM.length; i++)
      if (tcp_flags[i] === 1) filter_info.tcp_flags.push(tcp_flagsM[i]);
  } else if (protocol === 0x1) {
    tcp_frame = run(icmp_parser);
    filter_info.layers[2] = "icmp";
  }

  unknown_data = run(
    (size ? readUntilI(size + index) : succeed(null))
      .map((x) =>
        x ? [x.map((e) => e.toString(16).padStart(2, "0")).join("")] : x
      )
      .map(tag("Data"))
  );

  peek = run(
    possibly(
      peekUInts(16)
        .map((x) => x.map((e) => e.toString(16).padStart(2, "0")).join(""))
        .map(tag("Peek next bytes", () => "For debug only"))
    )
  );

  is_http &&= unknown_data.value
    ? unknown_data.value[0]
        ?.split("")
        ?.reduce((acc: string[][], _, i, arr) => {
          if (i % 2 === 0) acc.push(arr.slice(i, i + 2));
          return acc;
        }, [])
        ?.map((s) => Number(`0x${s[0]}${s[1]}`))
        ?.map((n) => String.fromCharCode(n))
        ?.join("")
        ?.includes("HTTP") ?? false
    : false;

  // HACK
  if (is_http) {
    filter_info["http"] = is_http;
    filter_info.layers[3] = "http";
  }

  if (is_http) {
    let data = unknown_data.value
      ? ({
          name: "http",
          value: http_formater(unknown_data.value[0]),
          description: null,
        } as taged_value<string[]>)
      : unknown_data;

    return [filter_info, ethernet_frame, ip_frame, tcp_frame, [data], [peek]];
  }
  return [
    filter_info,
    ethernet_frame,
    ip_frame,
    tcp_frame,
    [unknown_data],
    [peek],
  ];
});

export const header_parsers = many(header_parser).map((x) =>
  x.map((e, i) => {
    e[0].index = i;
    return e;
  })
);

export default header_parser;
