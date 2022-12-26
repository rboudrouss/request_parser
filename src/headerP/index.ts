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
import http_formater from "./applicationLayer";
import internetDictParser, { InternetType } from "./internetLayer";
import ethernetParser, { ethernetType } from "./physicalLayer/ethernet";
import transportDictParser, { TransportType } from "./transportLayer";
import { tag, taged_value, tcp_flagE } from "./utils";

export * from "./utils";
export * from "./basicP";
export * from "./applicationLayer";
export * from "./physicalLayer";
export * from "./internetLayer";
export * from "./transportLayer";

export interface filter_dict {
  mac: [string, string];
  layers: [string | null, string | null, string | null, string | null];
  startIndex: number;
  size?: number;
  msg?: string;
  ip?: [string, string] | [string, string, string, string];
  port?: [string, string];
  http?: true;
  index?: number;
  tcp_flags?: tcp_flagE[];
}

export type header_type = [
  filter_dict,
  ethernetType,
  InternetType | null,
  TransportType | null,
  [taged_value<string[] | null>],
  [taged_value<string> | null]
];

// TODO make this code cleaner / find a better way
// TODO fait trop à la va vite, ce code est vraiment pas propre
const header_parser = coroutine((run): header_type => {
  let ethernet_frame = run(ethernetParser);
  let internetL: InternetType | null = null;
  let transportL: TransportType | null = null;
  let is_http = false;
  let unknown_data: taged_value<string[] | null> | null = null;
  let peek: taged_value<string> | null = null;
  let size = 0;
  let protocol: number | undefined = undefined;
  let filter_info: filter_dict = {
    mac: [
      ethernet_frame[1].description as string,
      ethernet_frame[0].description as string,
    ],
    layers: ["ethernet", null, null, null],
    startIndex: -1,
  };

  const { index } = run(getIndex);
  filter_info.startIndex = index - 14; // HACK hardcoded

  let ethertype = ethernet_frame[2].value;

  let internetComp = internetDictParser[ethertype];
  if (!internetComp) {
    console.log("Error, Internet protocol not supported. Cannot continue");
    run(fail("header_parser: Unsupported Internet protocol"));
  }

  let { name, parser, infoF, canHaveLayer, toMsg } = internetComp;
  internetL = run(parser);
  let info = infoF(internetL);
  size = info.size;
  filter_info.size = size + 14; // HACK hardcoded ethernet length
  protocol = info.protocol;
  filter_info.ip = [info.sourceIP, info.destIP];
  filter_info.layers[1] = name;
  filter_info.msg = toMsg ? toMsg(internetL) : undefined;

  if (canHaveLayer && protocol) {
    let transportComp = transportDictParser[protocol];
    if (transportComp) {
      let { name, parser, infoF, toMsg } = transportComp;
      transportL = run(parser);
      filter_info.layers[2] = name;
      let info = infoF(transportL);
      if (info) {
        filter_info["port"] = [info.sourceP, info.destP];
        filter_info.tcp_flags = info.flags ? [...info.flags] : undefined;
        is_http =
          name === "tcp" &&
          (Number(info.sourceP) === 80 || Number(info.destP) === 80);
      } else
        console.log(
          "gotta need to implemente more info of the ",
          name,
          " protocol"
        );
      filter_info.msg = toMsg ? toMsg(transportL) : undefined;
    } else console.log("Not supported transport layer");
  }

  unknown_data = run(
    (filter_info.size ? readUntilI(filter_info.size + index) : succeed(null))
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

    return [filter_info, ethernet_frame, internetL, transportL, [data], [peek]];
  }

  return [
    filter_info,
    ethernet_frame,
    internetL,
    transportL,
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
