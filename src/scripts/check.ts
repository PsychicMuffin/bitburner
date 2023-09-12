import {NS} from "@ns";

export async function main(ns: NS) {
  const host: string = <string>ns.args[0];
  const currentMoney = format(ns, ns.getServerMoneyAvailable(host));
  const maxMoney = format(ns, ns.getServerMaxMoney(host));
  const minSecurity = format(ns, ns.getServerMinSecurityLevel(host));
  const reqHacking = format(ns, ns.getServerRequiredHackingLevel(host));
  ns.tprint(`Money: ${currentMoney} / ${maxMoney}\n`)
  ns.tprint(`Min Security: ${minSecurity}\n`)
  ns.tprint(`Req Hacking: ${reqHacking}\n`)
}

function format(ns: NS, number: number) {
  return ns.formatNumber(number, 3, 1000, true);
}