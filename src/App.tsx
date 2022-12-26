import React, { useState } from "react";
import { render } from "react-dom";
import {
  cleanInput,
  convertToBin,
  filter,
  header_parsers,
  header_type,
  to_arrow,
} from "./headerP";

function Arrows(props: { data: header_type[] | null }) {
  return props.data === null ? (
    <p>No Data</p>
  ) : (
    <>
      {props.data.map((e) => (
        <p>{to_arrow(e[0])}</p>
      ))}
    </>
  );
}

function App() {
  // let [data, setData] = useState("");
  let [read, setRead] = useState(false);
  let [result, setResult] = useState<header_type[] | null>(null);
  let [filtered, setFiltered] = useState<header_type[] | null>(null);
  console.log("app is weady uwu");

  let showFile = async (e: any) => {
    e.preventDefault();
    console.log("Dwetected a chwange OWO");
    const reader = new FileReader();
    reader.onload = async (e) => {
      // setData(e.target?.result as string);
      let parsed = header_parsers.run(
        convertToBin(cleanInput(e.target?.result as string))
      );
      console.log(parsed);
      if (parsed.isError) {
        console.log("owo niowo, thewe is an ewor 0///0");
        console.log(parsed.error);
        alert(parsed.error);
      } else {
        setRead(true);
        setResult(parsed.result);
        setFiltered(parsed.result);
        console.log("File wread awnd pawsed successfuwly UwU");
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  let filterInp = async (e: any) => {
    e.preventDefault();

    console.log(
      "target",
      e.target.value,
      (e.target.value as string).split(" ").map((a) => a.split("="))
    );
    if (result) {
      setFiltered(
        filter(
          (e.target.value as string).split("\n").map((a) => a.split("=")),
          result
        )
      );
    } else console.log("woops, no data cannot filter");
  };

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()}>
        <input type="file" onChange={showFile} />
        <input
          type="text"
          onKeyDown={(e) => e.key === "Enter" && filterInp(e)}
        />
      </form>
      <Arrows data={filtered} />
    </div>
  );
}

export default App;
