import { readFileSync, writeFileSync } from "fs";
import { header_type } from ".";

export interface taged_value<T> {
  name: string;
  value: T;
  description: string | null;
}

// HACK
const reHexDigits = /^[0-9a-fA-F]+/;

// TODO typer ça
export function filter(o: string[][], data: header_type[]): any {
  let cond_parm = ["arp", "ipv4", "ipv6", "tcp", "http", "icmp"];
  let arg_parm: { [key: string]: (x: any, e: string) => boolean } = {
    source_ip: (x: any, e: string) => x[0].layers[1] && x[0].ip[0] === e,
    dest_ip: (x: any, e: string) => x[0].layers[1] && x[0].ip[1] === e,
    ip: (x: any, e: string) =>
      arg_parm.source_ip(x, e) || arg_parm.dest_ip(x, e),
    source_mac: (x: any, e: string) => x[0].layers[1] && x[0].mac[0] === e,
    dest_mac: (x: any, e: string) => x[0].layers[1] && x[0].mac[1] === e,
    mac: (x: any, e: string) =>
      arg_parm.dest_mac(x, e) || arg_parm.source_mac(x, e),
    source_port: (x: any, e: string) => x[0].layers[2] && x[0].port[0] === e,
    dest_port: (x: any, e: string) => x[0].layers[2] && x[0].port[1] === e,
    port: (x: any, e: string) =>
      arg_parm.source_port(x, e) || arg_parm.dest_port(x, e),
    index: (x: any, e: string) => x[0].index == e,
    max_index: (x: any, e: string) => x[0].index <= e,
    min_index: (x: any, e: string) => x[0].index >= e,
  };

  for (const e of o)
    for (let i = 0; i < data.length; )
      if (cond_parm.includes(e[0]) && !data[i][0].layers.includes(e[0])) {
        data.splice(i, 1);
      } else if (
        e[0] in arg_parm &&
        typeof e[1] !== "undefined" &&
        !arg_parm[e[0]](data[i], e[1])
      ) {
        data.splice(i, 1);
      } else if (e[0] in tcp_flagsM && !(e[0] in data[i][0].tcp_flags)) {
        data.splice(i, 1);
      } else {
        i++;
      }

  return data;
}

export const convertToBin = (data: string): Uint8Array => {
  if (!reHexDigits.test(data))
    throw new Error("convertToBin: got data that is not hexadecimal");

  let numArray = data
    .split("")
    .reduce((acc: string[][], _, i, arr) => {
      if (i % 2 == 0) acc.push(arr.slice(i, i + 2));
      return acc;
    }, [])
    .map((s) => Number(`0x${s[0]}${s[1]}`));

  return new Uint8Array(numArray);
};

// cleaning the offset, the hex-visualisation, and the spaces
export const cleanInput = (data: string): string => {
  return data
    .split("\n")
    .map((s) => s.slice(5, Math.min(s.length, 54)))
    .join("")
    .replace(/\s/g, "");
};

// Use it only if executed by <ts->node <!>
export const readF = (s: string): Uint8Array => {
  return convertToBin(cleanInput(readFileSync(s).toString()));
};

export const writeBinF = (data: Uint8Array, s: string): void => {
  let dataView = new DataView(data.buffer);
  writeFileSync(s, dataView, "binary");
};

export const writeF = (data: string, s: string): void => {
  writeFileSync(s, data);
};

export const tag =
  <T>(name: string, descFN?: (x: T) => string) =>
  (value: T): taged_value<T> => {
    return {
      name,
      value,
      description: descFN ? descFN(value) : null,
    };
  };

export enum tcp_flagE {
  "ns",
  "cwr",
  "ece",
  "urg",
  "ack",
  "psh",
  "rst",
  "syn",
  "fin",
}

export const tcp_flagsM: tcp_flagE[] = [
  tcp_flagE.ns,
  tcp_flagE.cwr,
  tcp_flagE.ece,
  tcp_flagE.urg,
  tcp_flagE.ack,
  tcp_flagE.rst,
  tcp_flagE.syn,
  tcp_flagE.fin,
];
