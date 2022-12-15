import React, { useState } from "react";
import {
  cleanInput,
  convertToBin,
  header_parsers,
  header_type,
  to_arrow,
} from "./headerP";

function App() {
  let [data, setData] = useState("");
  let [read, setRead] = useState(false);
  let [result, setResult] = useState<header_type[] | null>(null);
  console.log("uwu");

  let showFile = async (e: any) => {
    console.log("oowow");
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
      setData(e.target?.result as string);
      console.log("OWO");
      let parsed = header_parsers.run(
        convertToBin(cleanInput(e.target?.result as string))
      );
      console.log(parsed);
      if (parsed.isError) alert(parsed.error);
      else {
        setRead(true);
        setResult(parsed.result);
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  return (
    <div>
      <input type="file" onChange={showFile} />
        {read && result ? result.map((e) => <p>{to_arrow(e[0], e[3])}</p>) : "No Data"}
    </div>
  );
}

export default App;
