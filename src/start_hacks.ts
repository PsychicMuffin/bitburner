import { NS } from "@ns";

export async function main(ns: NS) {
  const nukedServers: string[] = JSON.parse(ns.read("nuked_servers.txt"));
}