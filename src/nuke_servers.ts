import {NS} from "@ns";

export async function main(ns: NS) {
  const serverList: string[] = JSON.parse(ns.read("servers.txt"));
  while (true) {
    nukeServers(ns, serverList);
    await ns.sleep(1000);
  }
}

function getPortOpeners(ns: NS) {
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
  ns.write("nuked_hosts.txt", JSON.stringify(nukedHosts), "w");
}

function nukeServer(ns: NS, portOpeners: PortOpener[], host: string) {
  portOpeners.forEach(portOpener => portOpener(host));
  ns.nuke(host);
}

type PortOpener = (host: string) => void;