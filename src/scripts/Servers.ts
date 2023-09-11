import {NS} from "@ns";
import Lodash from "lib/lodash";
import {calculateHackRating, RatedServer} from "scripts/HackRating";
import {getPortOpeners, NsPortOpener} from "scripts/PortOpeners";

const HACK_SCRIPT = "scripts/hack.js";
const HACK_OFFSET_TIMER = 10000;

export function getHackableServers(ns: NS): string[] {
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

export function purchaseAndUpgradeServers(ns: NS): string[] {
  const purchasedServers = ns.getPurchasedServers();
  const newOrUpgradedServers: string[] = [];
  while (purchasedServers.length < ns.getPurchasedServerLimit()) {
    const name = ns.purchaseServer(`purchased-server`, 8);
    if (Lodash.isEmpty(name)) {
      break; //ran out of money
    }
    newOrUpgradedServers.push(name);
  }
  while (true) {
    const upgradedServer = upgradeLowestRamServer(ns);
    if (Lodash.isEmpty(upgradedServer)) {
      break; //no more servers to upgrade
    }
    if (!newOrUpgradedServers.includes(upgradedServer)) {
      newOrUpgradedServers.push(upgradedServer);
    }
  }
  return newOrUpgradedServers;
}

export function upgradeLowestRamServer(ns: NS) {
  const purchasedServers = ns.getPurchasedServers();
  if (purchasedServers.length > 0) {
    const servers: PurchasedServer[] = purchasedServers.map(host => ({
      host: host,
      ram: ns.getServerMaxRam(host),
    }));
    servers.sort((a, b) => a.ram - b.ram);
    const lowestRamServer = servers[0];
    if (lowestRamServer.ram < ns.getPurchasedServerMaxRam()) {
      if (ns.upgradePurchasedServer(lowestRamServer.host, lowestRamServer.ram * 2)) {
        return lowestRamServer.host;
      }
    }
  }
  return "";
}

export function getNukedServers(ns: NS, serverList: string[]) {
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

export function getBestHackTarget(ns: NS, serverList: string[]) {
  const bestServers: RatedServer[] = [];
  serverList.forEach(host => {
    bestServers.push({name: host, rating: calculateHackRating(ns, host)});
  });
  bestServers.sort((a, b) => b.rating - a.rating);
  return bestServers[0].name;
}

export async function startHacks(ns: NS, nukedHosts: string[], targetHost: string) {
  const scriptRam = ns.getScriptRam(HACK_SCRIPT);
  for (const host of nukedHosts) {
    const serverRam = ns.getServerMaxRam(host);
    const threads = Math.floor(serverRam / scriptRam);
    if (threads >= 1) {
      ns.killall(host);
      ns.scp(HACK_SCRIPT, host, "home");
      ns.exec(HACK_SCRIPT, host, threads, targetHost);
      await ns.sleep(HACK_OFFSET_TIMER);
    }
  }
}

export function nukeServer(ns: NS, portOpeners: NsPortOpener[], host: string) {
  portOpeners.forEach(portOpener => portOpener(host));
  ns.nuke(host);
}

export type PurchasedServer = {
  host: string,
  ram: number
}