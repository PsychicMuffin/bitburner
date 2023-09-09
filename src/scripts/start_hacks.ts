import { NS } from "@ns";

const HACK_SCRIPT = "scripts/hack.js"

export async function startHacks(ns: NS, nukedHosts: string[]) {
  const scriptRam = ns.getScriptRam(HACK_SCRIPT);
  nukedHosts.forEach(host => {
    const serverRam = ns.getServerMaxRam(host);
    const threads = Math.floor(serverRam / scriptRam);
    if (threads >= 1) {
      ns.scp(HACK_SCRIPT, host, "home");
      ns.killall(host);
      ns.exec(HACK_SCRIPT, host, threads, host);
    }
  })
}