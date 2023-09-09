import {NS} from "@ns";

export async function main(ns: NS) {
  const servers: string[] = [];
  scanHost("home");
  const serverList = servers.slice(1);

  function scanHost(host: string) {
    if (!servers.includes(host)) {
      servers.push(host);
      const neighbors = ns.scan(host);
      neighbors.forEach(host => scanHost(host));
    }
  }

  ns.write("servers.txt", JSON.stringify(serverList), "w");
}