import {NS} from "@ns";
import Lodash from "lib/lodash";
import {calculateHackRating, RatedServer} from "scripts/HackRating";
import {getPortOpeners, NsPortOpener} from "scripts/PortOpeners";

const WEAKEN_SCRIPT = "scripts/weaken.js";
const GROW_SCRIPT = "scripts/grow.js";
const HACK_SCRIPT = "scripts/hack.js";

const HACK_OFFSET_TIMER = 10000;

//TODO: fix scaling of hack algorithm so this can be removed
const MAX_PURCHASED_SERVER_RAM = 16384;

const WEAKEN_RATIO = .15;
const GROW_RATIO = .8;

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
    if (lowestRamServer.ram < MAX_PURCHASED_SERVER_RAM) {
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

export function nukeServer(ns: NS, portOpeners: NsPortOpener[], host: string) {
  portOpeners.forEach(portOpener => portOpener(host));
  ns.nuke(host);
}

export async function startHacks(ns: NS, nukedHosts: string[], targetHost: string) {
  for (const host of nukedHosts) {
    const availableRam = ns.getServerMaxRam(host);
    if (availableRam > ns.getScriptRam(WEAKEN_SCRIPT)) {
      await startHacksForServer(ns, availableRam, host, targetHost);
    }
  }
}

export async function startHacksForHome(ns: NS, targetHost: string) {
  const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
  await startHacksForServer(ns, availableRam, "home", targetHost);
}

export async function startHacksForServer(ns: NS, ram: number, host: string, targetHost: string) {
  const threads = calculateThreads(ns, ram);
  if (threads.weakenThreads > 0) {
    ns.scriptKill(WEAKEN_SCRIPT, host);
    ns.exec(WEAKEN_SCRIPT, host, threads.weakenThreads, targetHost);
  }
  if (threads.growThreads > 0) {
    ns.scriptKill(GROW_SCRIPT, host);
    ns.exec(GROW_SCRIPT, host, threads.growThreads, targetHost);
  }
  if (threads.hackThreads > 0) {
    ns.scriptKill(HACK_SCRIPT, host);
    ns.exec(HACK_SCRIPT, host, threads.hackThreads, targetHost);
  }
  await ns.sleep(HACK_OFFSET_TIMER);
}

export function calculateThreads(ns: NS, ram: number): Threads {
  const remainingGrowRatio = GROW_RATIO / (1 - WEAKEN_RATIO);

  const weakenRam = ns.getScriptRam(WEAKEN_SCRIPT);
  const growRam = ns.getScriptRam(GROW_SCRIPT);
  const hackRam = ns.getScriptRam(HACK_SCRIPT);

  let remainingRam = ram;

  const weakenThreads = Math.floor((remainingRam * WEAKEN_RATIO) / weakenRam);
  remainingRam -= weakenThreads * weakenRam;

  const growThreads = Math.floor((remainingRam * remainingGrowRatio) / growRam);
  remainingRam -= growThreads * growRam;

  const hackThreads = Math.floor(remainingRam / hackRam);

  return {weakenThreads, growThreads, hackThreads};
}

export type PurchasedServer = {
  host: string,
  ram: number
}

export type Threads = {
  weakenThreads: number,
  growThreads: number,
  hackThreads: number
}