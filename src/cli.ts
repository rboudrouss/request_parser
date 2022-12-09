import { exit } from "process";
import header_parser, { filter, readF, tcp_flagsM, writeF } from "./headerP";
import { many } from "./parser";

// TODO maybe make relative ack & seq numbers ?
export default function cli() {
  if (process.argv.length < 4) {
    console.log(
      "Please indicate the trace file as `node cli.js <a/f> <input file> [-F <vos filtres>] [-o <output file>]`.",
      "\na is for analyse, f is for FLECHE, read README for more info"
    );
    exit(1);
  }

  let data = readF(process.argv[3]);
  let result = many(header_parser).run(data);
  if (result.isError) throw new Error(result.error as string);

  let parsed = result.result;

  let last_parm_index: number | undefined = undefined;
  let log_to_file = false;

  if (process.argv.includes("-o")) {
    last_parm_index = process.argv.indexOf("-o");
    log_to_file = true;
  }

  let filobj: (string | string[])[] = process.argv
    .slice(4, last_parm_index)
    ?.map((e) => e.toLowerCase().split("="));

  if (typeof filobj !== "undefined" && filobj.length !== 0) {
    if (filobj[0][0] !== "-f") console.log("unknown parameter", filobj[0]);
    else parsed = filter(filobj.slice(1) as string[][], parsed);
  }
  if (process.argv[2].toUpperCase().startsWith("A")) {
    if (
      log_to_file &&
      last_parm_index &&
      typeof process.argv[last_parm_index + 1] !== "undefined"
    )
      writeF(
        JSON.stringify(parsed, null, 2),
        process.argv[last_parm_index + 1]
      );
    else console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  let msg = parsed
    .map((l) => {
      if (!l || !l[0] || !l[1]) return "no data parsed";

      let filter_info = l[0];

      let ethernet_frame: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[1] as any;

      let source_mac = ethernet_frame[1].description;
      let dest_mac = ethernet_frame[0].description;

      if (!l[2])
        return `${source_mac} ---> ${dest_mac} : Insuported Internet layer (not ipv4)`;

      let ip_frame: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[2] as any;

      let ip_source: string = "";
      let ip_dest: string = "";

      if (filter_info.layers[1] === "ipv4") {
        ip_source = ip_frame[11].description.padStart(15);
        ip_dest = ip_frame[12].description.padStart(15);
      } else if (filter_info.layers[1] == "ipv6") {
        ip_source = ip_frame[7].description.padStart(15);
        ip_dest = ip_frame[8].description.padStart(15);
      } else if (filter_info.layers[1] === "arp") {
        let sourceh = ip_frame[5].description.padStart(15);
        let sourcep = ip_frame[6].description.padStart(15);
        let destp = ip_frame[8].description.padStart(15);
        return `${sourcep} -->    BROADCAST    : who has ${destp}? tell ${sourceh}`;
      }

      if (!l[3])
        return `${ip_source} --> ${ip_dest} : Unsuported Transport layer (not tcp)`;

      let tcp_layer: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[3] as any;

      let tcp_flags: {
        name: string;
        value: number | number[];
        description: string;
      }[] = (tcp_layer[6].value as any).map((e: any) => e.value);

      let act_flags: string[] = [];
      for (let i = 0; i < tcp_flagsM.length; i++)
        if (tcp_flags[i]) act_flags.push(tcp_flagsM[i]);

      let source_port = tcp_layer[0].value.toString().padStart(6);
      let dest_port = tcp_layer[1].value.toString().padStart(6);

      return `${ip_source} --> ${ip_dest} : ${source_port} -----> ${dest_port} : [ ${act_flags.join(
        ", "
      )} ] Seq=${tcp_layer[2].value} Ack=${tcp_layer[3].value}`;
    })
    .join("\n");

  if (
    log_to_file &&
    last_parm_index &&
    typeof process.argv[last_parm_index + 1] !== "undefined"
  )
    writeF(msg, process.argv[last_parm_index + 1]);
  else console.log(msg);
  return;
}

cli();
