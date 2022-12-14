import { readFileSync, writeFileSync } from "fs";
import { header_type } from ".";

export interface taged_value<T> {
  name: string;
  value: T;
  description: string | null;
}

// HACK
const reHexDigits = /^[0-9a-fA-F]+/;

export function filter(o: string[][], data: header_type[]): any {
  let cond_parm = ["arp", "ipv4", "ipv6", "tcp", "http", "icmp"];
  let arg_parm: { [key: string]: (x: header_type, e: string) => boolean } = {
    source_ip: (x, e) => Boolean(x[0].ip && x[0].ip[0] === e),
    dest_ip: (x, e: string) => Boolean(x[0].ip && x[0].ip[1] === e),
    ip: (x, e: string) => arg_parm.source_ip(x, e) || arg_parm.dest_ip(x, e),
    source_mac: (x, e: string) => x[0].mac && x[0].mac[0] === e,
    dest_mac: (x, e: string) => x[0].mac && x[0].mac[1] === e,
    mac: (x, e: string) => arg_parm.dest_mac(x, e) || arg_parm.source_mac(x, e),
    source_port: (x, e: string) => Boolean(x[0].port && x[0].port[0] === e),
    dest_port: (x, e: string) => Boolean(x[0].port && x[0].port[1] === e),
    port: (x, e: string) =>
      arg_parm.source_port(x, e) || arg_parm.dest_port(x, e),
    index: (x, e: string) => x[0].index?.toString() == e,
    max_index: (x, e: string) => Number(x[0].index).toString() <= e,
    min_index: (x, e: string) => Number(x[0].index).toString() >= e,
  };

  for (const e of o) {
    let length = data.length;
    for (let i = 0; i < length; )
      // si e[0] est un paramètre unique qui n'a pas besoin de valeur additionnel.
      // Genre un protocole arp/ipv4/tcp
      if (cond_parm.includes(e[0]) && !data[i][0].layers.includes(e[0])) {
        data.splice(i, 1);
        length--;
      }
      // si e[0] est un paramètre qui a besoin d'un second paramètre
      // typiquement ip/port/mac/index
      else if (
        e[0] in arg_parm &&
        typeof e[1] !== "undefined" &&
        !arg_parm[e[0]](data[i], e[1])
      ) {
        data.splice(i, 1);
        length--;
      }
      // si e[0] est un flag TCP
      else if (
        e[0] in tcp_flagE &&
        !data[i][0].tcp_flags.includes(
          tcp_flagE[e[0] as any] as unknown as tcp_flagE
        )
      ) {
        data.splice(i, 1);
        length--;
      } else i++;
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
  tcp_flagE.psh,
  tcp_flagE.rst,
  tcp_flagE.syn,
  tcp_flagE.fin,
];
