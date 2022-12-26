import arpComp, { arpType } from "./arp";
import ip4Comp, { ip4Type } from "./ipv4";
import ip6Comp, { ip6Type } from "./ipv6";
import { layerComp } from "./utils";

// key : Value of protocol (ethertype) in the Physical layer
const internetDictParser = {
  0x0800: ip4Comp,
  0x0806: arpComp,
  0x86dd: ip6Comp,
} as { [key: number]: layerComp<InternetType> };

export default internetDictParser;

export type InternetType = ip4Type | ip6Type | arpType;

export const internet_supported = Object.entries(internetDictParser).map(
  (e) => e[1].name
);

export * from "./arp";
export * from "./ipv4";
export * from "./ipv6";
export * from "./utils";
