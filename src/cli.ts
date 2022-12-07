import { exit } from "process";
import header_parser, { readF, writeF } from "./headerP";
import { many } from "./parser";

function cli() {
  if (process.argv.length < 4) {
    console.log(
      "You must indicate the trace file as `node cli.ts a/f <input file> <output file>`.",
      "The output file is optionnal. a is for analyse, f is for FLECHE"
    );
    exit(1);
  }

  let data = readF(process.argv[3]);
  let result = many(header_parser).run(data);
  if (result.isError) throw new Error(result.error as string);

  if (process.argv[2].toUpperCase().startsWith("A")) {
    if (process.argv.length >= 5)
      writeF(JSON.stringify(result.result, null, 2), process.argv[4]);
    else console.log(JSON.stringify(result.result, null, 2));
    return;
  }

  let parsed = result.result;
  let msg = parsed
    .map((l) => {
      if (!l || !l[0]) return "no data parsed";

      let ethernet_frame: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[0] as any;

      if (!l[1])
        return `${ethernet_frame[1].description} ---> ${ethernet_frame[0].description} : Insuported Internet layer (not ipv4)`;

      let ip4_frame: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[1] as any;

      if (!l[2])
        return `${ip4_frame[11].description.padStart(
          15
        )} --> ${ip4_frame[12].description.padStart(
          15
        )} : Insuported Transport layer (not tcp)`;

      let tcp_layer: {
        name: string;
        value: number | number[];
        description: string;
      }[] = l[2] as any;

      let tcp_flags: {
        name: string;
        value: number | number[];
        description: string;
      }[] = (tcp_layer[6].value as any).map((e: any) => e.value);

      let tcp_flagsM = [
        "NS",
        "CWR",
        "ECE",
        "URG",
        "ACK",
        "PSH",
        "RST",
        "SYN",
        "FIN",
      ];

      let act_flags: string[] = [];
      for (let i = 0; i < tcp_flagsM.length; i++)
        if (tcp_flags[i]) act_flags.push(tcp_flagsM[i]);

      let source_port = tcp_layer[0].value.toString().padStart(6);
      let dest_port = tcp_layer[0].value.toString().padStart(6);

      return `${ip4_frame[11].description.padStart(
        15
      )} --> ${ip4_frame[12].description.padStart(
        15
      )} : ${source_port} -----> ${dest_port} : [ ${act_flags.join(
        ", "
      )} ] Seq=${tcp_layer[2].value} Ack=${tcp_layer[3].value}`;
    })
    .join("\n");

  if (process.argv.length >= 5) writeF(msg, process.argv[4]);
  else console.log(msg);
  return;
}

cli();
