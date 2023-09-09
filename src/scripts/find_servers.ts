import {NS} from "@ns";

export async function findServers(ns: NS): Promise<string[]> {
  const servers: string[] = [];
  scanHost("home");
  function scanHost(host: string) {
    if (!servers.includes(host)) {
      servers.push(host);
      const neighbors = ns.scan(host);
      neighbors.forEach(host => scanHost(host));
    }
  }

  return servers.slice(1);
}