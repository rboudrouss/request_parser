import { exit } from "process";
import {
  filter,
  filter_dict,
  header_parsers,
  human_str,
  readF,
  TCPLayerT,
  to_arrow,
  writeF,
} from "./headerP";

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
  let result = header_parsers.run(data);
  if (result.isError) throw new Error(result.error as string);

  let parsed = result.result;

  let file_index: number | undefined = undefined;
  let log_to_file = false;
  let human = false;
  let human_msg = "";

  if (process.argv.includes("-o")) {
    file_index = process.argv.indexOf("-o") + 1;
    log_to_file = true;
  }

  if (process.argv.includes("-F")) {
    let f_index = process.argv.indexOf("-F");
    let filobj = process.argv
      .slice(f_index + 1)
      .map((e) => e.toLowerCase().split("="));
    if (filobj) parsed = filter(filobj, parsed);
  }

  if (process.argv[2].toUpperCase().startsWith("A")) {
    if (process.argv.includes("-h")) {
      human = true;
      human_msg = parsed.map((header) => human_str(header)).join("\n");
    }
    if (
      log_to_file &&
      file_index &&
      typeof process.argv[file_index] !== "undefined"
    )
      writeF(
        human
          ? human_msg
          : JSON.stringify(
              parsed.map((e) => e.slice(1)),
              null,
              2
            ),
        process.argv[file_index]
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

  let msg = parsed.map((l) => to_arrow(l[0], l[3])).join("\n");

  if (
    log_to_file &&
    file_index &&
    typeof process.argv[file_index] !== "undefined"
  )
    writeF(msg, process.argv[file_index]);
  else console.log(msg);
  return;
}

cli();
