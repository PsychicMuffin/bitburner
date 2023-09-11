import {NS} from "@ns";

export async function main(ns: NS) {
  const host: string = <string>ns.args[0];
  while (true) {
    await ns.weaken(host);
  }
}