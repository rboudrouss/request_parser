// FIXME make it detected better
const http_formater = (data: string): string[] => {
  if (!data) return [data];

  let tdata = data
    .split("")
    .reduce((acc: string[][], _, i, arr) => {
      if (i % 2 == 0) acc.push(arr.slice(i, i + 2));
      return acc;
    }, [])
    .map((s) => Number(`0x${s[0]}${s[1]}`))
    .map((n) => String.fromCharCode(n))
    .join("");
  return tdata.includes("HTTP") || tdata.includes("http")
    ? tdata.split("\r\n")
    : tdata.split("\n");
};

export default http_formater;
