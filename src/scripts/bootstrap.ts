import Lodash from "/lib/lodash";
import {NS} from "@ns";
import {findServers} from "scripts/find_servers";
import {startHacks} from "scripts/start_hacks";

export async function main(ns: NS) {
  const serverList = await findServers(ns);
  let nukedHosts: string[] = [];
  while (true) {
    const newNukedHosts = nukeServers(ns, serverList);
    if (!Lodash.isEqual(nukedHosts, newNukedHosts)) {
      ns.print("nuked hosts updated; starting fresh scripts");
      nukedHosts = newNukedHosts;
      await startHacks(ns, newNukedHosts);
    }
    await ns.sleep(60000);
  }
}

function getPortOpeners(ns: NS): PortOpener[] {
  const portOpeners: PortOpener[] = [];
  if (ns.fileExists("BruteSSH.exe", "home")) {
    portOpeners.push(ns.brutessh);
  }
  if (ns.fileExists("FTPCrack.exe", "home")) {
    portOpeners.push(ns.ftpcrack);
  }
  if (ns.fileExists("relaySMTP.exe", "home")) {
    portOpeners.push(ns.relaysmtp);
  }
  if (ns.fileExists("HTTPWorm.exe", "home")) {
    portOpeners.push(ns.httpworm);
  }
  if (ns.fileExists("SQLInject.exe", "home")) {
    portOpeners.push(ns.sqlinject);
  }
  return portOpeners;
}

function nukeServers(ns: NS, serverList: string[]) {
  const hackingSkill = ns.getHackingLevel();
  const portOpeners = getPortOpeners(ns);
  const nukedHosts: string[] = [];
  serverList.forEach(host => {
    const rootAccess = ns.hasRootAccess(host);
    const minHackingSkill = ns.getServerRequiredHackingLevel(host);
    const minOpenPorts = ns.getServerNumPortsRequired(host);
    if (rootAccess) {
      nukedHosts.push(host);
    } else if (hackingSkill >= minHackingSkill && minOpenPorts <= portOpeners.length) {
      nukeServer(ns, portOpeners, host);
      nukedHosts.push(host);
    }
  });
  return nukedHosts;
}

function nukeServer(ns: NS, portOpeners: PortOpener[], host: string) {
  portOpeners.forEach(portOpener => portOpener(host));
  ns.nuke(host);
}

type PortOpener = (host: string) => void;