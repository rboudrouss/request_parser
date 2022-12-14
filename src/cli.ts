import { exit } from "process";
import { TaggedTemplateExpression } from "typescript";
import header_parser, {
  ethernet_result,
  filter,
  filter_dict,
  header_type,
  IPLayerT,
  readF,
  taged_value,
  TCPLayerT,
  tcp_flagE,
  tcp_flagsM,
  writeF,
} from "./headerP";
import { many } from "./parser";

function layer_str(
  data: IPLayerT | TCPLayerT | ethernet_result | null,
  name?: string | null
): string {
  if (!data) return "";
  let msg = "";
  if (name && name !== null) msg += `layer ${name} :\n`;
  else msg += "unknown layer :\n";

  data.map((element) => {
    let o: any;
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

function human_str(data: header_type): string {
  let msg = "";

  let filterI: filter_dict = data[0];
  if (filterI.index)
    msg += `------- frame n°${filterI.index
      .toString()
      .padStart(3, "0")} ------\n`;

  msg += data
    .slice(1)
    .map((layer, i, _) => layer_str(layer as any, filterI.layers[i]))
    .join("\n");

  return msg;
}

// TODO maybe make relative ack & seq numbers ?
export default function cli() {
  if (process.argv.length < 4) {
    console.log(
      "Please indicate the trace file as `node cli.js <a/f> <input file> [-F <vos filtres>] [-o <output file>] [-h]`.",
      "\na is for analyse, f is for FLECHE, read README for more info"
    );
    exit(1);
  }

  let data = readF(process.argv[3]);
  let result = many(header_parser)
    .map((x) =>
      x.map((e, i) => {
        e[0].index = i;
        return e;
      })
    )
    .run(data);
  if (result.isError) throw new Error(result.error as string);

  let parsed = result.result;

  let last_parm_index: number | undefined = undefined;
  let log_to_file = false;
  let human = false;
  let human_msg = "";

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

  if (process.argv.includes("-h")) {
    human = true;
    human_msg = parsed.map((header) => human_str(header)).join("\n");
  }

  if (process.argv[2].toUpperCase().startsWith("A")) {
    if (
      log_to_file &&
      last_parm_index &&
      typeof process.argv[last_parm_index + 1] !== "undefined"
    )
      writeF(
        human
          ? human_msg
          : JSON.stringify(
              parsed.map((e) => e.slice(1)),
              null,
              2
            ),
        process.argv[last_parm_index + 1]
      );
    else
      console.log(
        human
          ? human_msg
          : JSON.stringify(
              parsed.map((e) => e.slice(1)),
              null,
              2
            )
      );
    return;
  }

  let msg = parsed
    .map((l) => {
      if (!l || !l[0] || !l[1]) return "no data parsed";

      let filter_info = l[0];

      let index = filter_info.index
        ? filter_info.index.toString().padStart(3, "0")
        : 0;

      let ethernet_frame: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[1] as any;

      let source_mac = ethernet_frame[1].description;
      let dest_mac = ethernet_frame[0].description;

      if (!l[2])
        return `${index}: ${source_mac} ---> ${dest_mac} : Insuported Internet layer (not ipv4)`;

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
        return `${index}: ${ip_source} --> ${ip_dest} : Unsuported Transport layer (not tcp)`;

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
        if (tcp_flags[i]) act_flags.push(tcp_flagE[tcp_flagsM[i]]);

      let source_port = tcp_layer[0].value.toString().padStart(6);
      let dest_port = tcp_layer[1].value.toString().padStart(6);

      return `${index}: ${ip_source} --> ${ip_dest} : ${source_port} -----> ${dest_port} : [ ${act_flags.join(
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
