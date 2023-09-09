import {NS} from "@ns";

export async function main(ns: NS) {
  const host: string = <string>ns.args[0];
  const targetSecurityLevel = ns.getServerMinSecurityLevel(host) + 2;
  const targetMoneyAvailable = ns.getServerMaxMoney(host) * .9;

  while (true) {
    if (ns.getServerSecurityLevel(host) > targetSecurityLevel) {
      await ns.weaken(host);
    } else if (ns.getServerMoneyAvailable(host) < targetMoneyAvailable) {
      await ns.grow(host);
    } else {
      await ns.hack(host);
    }
  }
}