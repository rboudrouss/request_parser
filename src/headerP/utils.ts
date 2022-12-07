<<<<<<< HEAD
import { readFileSync, writeFileSync } from "fs";
import {
  header_type,
  filter_dict,
  TransportType,
  InternetType,
  ethernetType,
  internet_supported,
  application_supported,
  physical_supported,
  transport_supported,
} from ".";

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

export interface taged_value<T> {
  name: string;
  value: T;
  description: string | null;
}
=======
>>>>>>> 6858648 (get reacted)

// HACK repeated regex, found in parser/ too
const reHexDigits = /^[0-9a-fA-F]+/;

export type toArrowT = (
  msg: string | undefined,
  macS: string,
  macD: string,
  index?: string,
  ipS?: string,
  ipD?: string
) => string;

export const defaultToArrow: toArrowT = (msg, macS, macD, index, ipS, ipD) => {
  if (!msg) msg = "Unsuported Layer";
  let indexS = index ? index.padStart(3, "0") : "000";

  if (ipS && ipD)
    return `${indexS}: ${ipS.padStart(15, " ")} ---> ${ipD.padStart(
      15,
      " "
    )} : ${msg}`;

  return `${indexS}: ${macS.padStart(15, " ")} ---> ${macD.padStart(
    15,
    " "
  )} : ${msg}`;
};

export function to_arrow(filtD: filter_dict, startIndex?: boolean) {
  let index = startIndex
    ? filtD.startIndex.toString(16)
    : filtD.index?.toString();
  if (!filtD.ip)
    return defaultToArrow(filtD.msg, filtD.mac[0], filtD.mac[1], index);
  return defaultToArrow(
    filtD.msg,
    filtD.mac[0],
    filtD.mac[1],
    index,
    filtD.ip[0],
    filtD.ip[1]
  );
}

export function filter(o: string[][], data: header_type[]): any {
  let out: header_type[] = [];
  let cond_parm = [
    ...internet_supported,
    ...application_supported,
    ...physical_supported,
    ...transport_supported,
  ];
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
    index: (x, e: string) => x[0].index === Number(e),
    max_index: (x, e: string) => (x[0].index ? x[0].index <= Number(e) : true),
    min_index: (x, e: string) => (x[0].index ? x[0].index >= Number(e) : true),
  };

  for (const e of o) {
    // si e[0] est un paramètre unique qui n'a pas besoin de valeur additionnel.
    // Genre un protocole arp/ipv4/tcp
    for (const frame of data)
      if (cond_parm.includes(e[0]) && !frame[0].layers.includes(e[0])) continue;
      // si e[0] est un paramètre qui a besoin d'un second paramètre
      // typiquement ip/port/mac/index
      else if (
        e[0] in arg_parm &&
        typeof e[1] !== "undefined" &&
        !arg_parm[e[0]](frame, e[1])
      )
        continue;
      // si e[0] est un flag TCP
      else if (
        e[0] in tcp_flagE &&
        !frame[0].tcp_flags?.includes(
          tcp_flagE[e[0] as any] as unknown as tcp_flagE
        )
      )
        continue;
      else out.push(frame);
  }

  return out;
}

export function layer_str(
  data: InternetType | TransportType | ethernetType | null,
  name?: string | null
): string {
  if (!data) return "";
  let msg = "";
  if (name && name !== null) msg += `layer ${name} :\n`;
  else msg += "unknown layer :\n";

  data.map((element) => {
    if (!element) return;
    msg += "\t";

    if (element.name.toLowerCase() === "flags") {
      let flags: taged_value<number>[] = element.value as taged_value<number>[];
      msg += "Flags: ";
      msg += flags
        .map((element2) =>
          element2.value === 1 ? element2.name.toUpperCase() + " " : ""
        )
        .join("");
      msg += "\n";
    } else {
      if (element.value === null) return;
      if (name === "http")
        msg += (element.value as unknown as string[]).join("\n\t") + "\n";
      else
        msg +=
          element.name +
          ": " +
          (!element.description || element.description === null
            ? element.value.toString()
            : element.description) +
          "\n";
    }
  });
  return msg;
}

export function human_str(data: header_type, start_index?: boolean): string {
  let msg = "";

  let filterI: filter_dict = data[0];
  let index = start_index ? filterI.startIndex : filterI.index;
  if (index)
    msg += `------- frame n°${index.toString().padStart(3, "0")} ------\n`;

  msg += data
    .slice(1)
    .map((layer, i, _) => layer_str(layer as any, filterI.layers[i]))
    .join("\n");

  return msg;
}

export const convertToBin = (data: string): Uint8Array => {
  if (!reHexDigits.test(data))
    throw new Error("convertToBin: got data that is not hexadecimal");

  let numArray = data
    .split("")
    .reduce((acc: string[][], _, i, arr) => {
      if (i % 2 === 0) acc.push(arr.slice(i, i + 2));
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

<<<<<<< HEAD
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

=======
>>>>>>> 6858648 (get reacted)
export const tag =
  <T>(name: string, descFN?: (x: T) => string) =>
  (value: T): taged_value<T> => {
    return {
      name,
      value,
      description: descFN ? descFN(value) : null,
    };
  };
