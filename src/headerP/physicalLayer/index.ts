// ONLY SUPPORTS ETHERNET2 <!>
import ethernetParser from "./ethernet2";

const physicalParser = ethernetParser;
export default physicalParser;

export const physical_supported = ["ethernet2"];

export * from "./ethernet2";
