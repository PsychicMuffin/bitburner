import {NS} from "@ns";
import Lodash from "lib/lodash";
import {calculateHackRating, RatedServer} from "scripts/HackRating";
import {getPortOpeners, NsPortOpener} from "scripts/PortOpeners";

const WEAKEN_SCRIPT = "scripts/weaken.js";
const GROW_SCRIPT = "scripts/grow.js";
const HACK_SCRIPT = "scripts/hack.js";

const HACK_OFFSET_TIMER = 10000;

const WEAKEN_RATIO = .12;
const HACK_RATIO = .03;

export function getHackableServers(ns: NS): ServerAndPath[] {
  const purchasedServers = ns.getPurchasedServers();
  const servers: ServerAndPath[] = [];
  ns.scan("home")
    .filter(host => !purchasedServers.includes(host))
    .forEach(host => scanHost(["home", host]));
  return servers;

  function scanHost(path: string[]) {
    const prev = path[path.length - 2];
    const host = path[path.length - 1];
    servers.push({host, path});
    ns.scan(host)
      .filter(neighbor => neighbor !== prev)
      .forEach(neighbor => scanHost([...path, neighbor]));
  }
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

export function nukeServer(ns: NS, portOpeners: NsPortOpener[], host: string) {
  portOpeners.forEach(portOpener => portOpener(host));
  ns.nuke(host);
}

export async function startHacks(ns: NS, hosts: string[], targetHost: string) {
  for (const host of hosts) {
    killScripts(ns, host);
    const availableRam = ns.getServerMaxRam(host);
    if (availableRam > ns.getScriptRam(WEAKEN_SCRIPT)) {
      ns.scp(WEAKEN_SCRIPT, host, "home");
      ns.scp(GROW_SCRIPT, host, "home");
      ns.scp(HACK_SCRIPT, host, "home");
      await startHacksForServer(ns, availableRam, host, targetHost);
    }
  }
}

export async function startHacksForHome(ns: NS, targetHost: string) {
  killScripts(ns, "home");
  const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
  await startHacksForServer(ns, .99 * availableRam, "home", targetHost);
}

export async function startHacksForServer(ns: NS, ram: number, host: string, targetHost: string) {
  const threads = calculateThreads(ns, ram);

  const divisions = 10;
  const weakenThreads = divideThreads(threads.weakenThreads, divisions);
  const growThreads = divideThreads(threads.growThreads, divisions);
  const hackThreads = divideThreads(threads.hackThreads, divisions);

  const threadArray: Threads[] = [];
  for (let i = 0; i < divisions; i++) {
    threadArray.push({
      weakenThreads: weakenThreads[i],
      growThreads: growThreads[i],
      hackThreads: hackThreads[i],
    });
  }

  for (const threads of threadArray) {
    if (threads.weakenThreads > 0) {
      ns.exec(WEAKEN_SCRIPT, host, threads.weakenThreads, targetHost);
    }
    if (threads.growThreads > 0) {
      ns.exec(GROW_SCRIPT, host, threads.growThreads, targetHost);
    }
    if (threads.hackThreads > 0) {
      ns.exec(HACK_SCRIPT, host, threads.hackThreads, targetHost);
    }
    await ns.sleep(HACK_OFFSET_TIMER / divisions);
  }
}

export function calculateThreads(ns: NS, ram: number): Threads {
  const remainingHackRatio = HACK_RATIO / (1 - WEAKEN_RATIO);

  const weakenRam = ns.getScriptRam(WEAKEN_SCRIPT);
  const growRam = ns.getScriptRam(GROW_SCRIPT);
  const hackRam = ns.getScriptRam(HACK_SCRIPT);

  let remainingRam = ram;

  const weakenThreads = Math.max(1, Math.floor((remainingRam * WEAKEN_RATIO) / weakenRam));
  remainingRam -= weakenThreads * weakenRam;

  const hackThreads = Math.max(1, Math.floor((remainingRam * remainingHackRatio) / hackRam));
  remainingRam -= hackThreads * hackRam;

  const growThreads = Math.floor(remainingRam / growRam);

  return {weakenThreads, growThreads, hackThreads};
}

export function divideThreads(threads: number, divisions: number): number[] {
  const size = Math.floor(threads / divisions);
  const threadArray: number[] = Array(divisions - 1);
  threadArray.fill(size, 0, divisions - 1);
  threadArray.push(threads - (threadArray.length * size));
  return threadArray;
}

export function killScripts(ns: NS, host: string) {
  ns.scriptKill(WEAKEN_SCRIPT, host);
  ns.scriptKill(GROW_SCRIPT, host);
  ns.scriptKill(HACK_SCRIPT, host);
}

export type ServerAndPath = {
  host: string,
  path: string[]
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