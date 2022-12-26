// ONLY SUPPORTS ETHERNET <!>
import ethernetParser from "./ethernet";

const physicalParser = ethernetParser;
export default physicalParser;

export const physical_supported = ["Ethernet2"];

export * from "./ethernet";
