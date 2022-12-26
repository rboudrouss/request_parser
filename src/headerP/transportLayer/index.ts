import icmpComp, { icmpType } from "./icmp";
import tcpComp, { tcpType } from "./tcp";
import udpComp, { udpType } from "./udp";
import { transportComp } from "./utils";

// key : value of protocole
const transportDictParser = {
  0x1: icmpComp,
  0x6: tcpComp,
  0x11: udpComp,
} as { [key: number]: transportComp<TransportType> };

export type TransportType = icmpType | tcpType | udpType;

export default transportDictParser;

export const transport_supported = Object.entries(transportDictParser).map(
  (e) => e[1].name
);

export * from "./utils";
export * from "./icmp";
export * from "./tcp";
export * from "./udp";
