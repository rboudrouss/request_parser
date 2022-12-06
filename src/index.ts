import {
  cleanInput,
  convertToBin,
  readBinF,
  readF,
  writeBinF,
} from "./headerP";
import {
  Bit,
  Int,
  logState,
  RawString,
  sequence,
  str,
  succeed,
  tup,
  Uint,
  Zero,
} from "./parser";


const MAC_parser = sequence(Array.from({ length: 6 }, () => Uint(8)))
const IP_parser = sequence(Array.from({ length: 4 }, () => Uint(8)))

let ethernet_parser = sequence([
  MAC_parser, // source MAC
  MAC_parser, // dest MAC
  Uint(16), // type
]);

let ip4_parser = sequence([
  Uint(4), // ip version
  Uint(4), // IHL (Internet Header Length)
  Uint(6), // DSCP
  Uint(2), // ECN
  Uint(16), // Total length
  Uint(16), // Identification
  sequence([
    // Flags
    Zero, // reserved must be a 0
    Bit, // Don't fragment
    Bit, // more Fragments
  ]),
  Uint(13), // Fragment Offset
  Uint(8), // Time to live
  Uint(8), // Protocol
  Uint(16), // header CheckSum
  IP_parser, // source IP
  IP_parser, // Dest IP
]);

let tcp_parser = sequence([
    Uint(16), // source port
    Uint(16), // dest port
    Uint(32), // Sequence number
    Uint(32), // ACK number
    Uint(4), // data offset
    sequence(Array.from({length:3}, () => Zero)), // 3 reserved bits, should be 0
    sequence([ // Flags
    Bit, // NS
    Bit, // CWR
    Bit, // ECE
    Bit, // URG
    Bit, // ACK
    Bit, // PSH
    Bit, // RST
    Bit, // SYN
    Bit, // FIN
    ]),
    Uint(16), // Window Size
    Uint(16), // Checksum
])

let parser = sequence(tup(ethernet_parser, ip4_parser, tcp_parser));

let data = readBinF("data/http.pcap");
writeBinF(data,"data/temp/http.pcap")

let result = parser.run(data);

console.log(result.result, result.bitIndex);
