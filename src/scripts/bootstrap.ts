import {NS} from "@ns";
import {buyPortOpeners} from "scripts/PortOpeners";
import {
  getBestHackTarget,
  getHackableServers,
  getNukedServers,
  purchaseAndUpgradeServers,
  startHacks, startHacksForHome,
} from "scripts/Servers";

export async function main(ns: NS) {
  const hackableServers = getHackableServers(ns);
  let currentBestHackTarget = "";
  while (true) {
    buyPortOpeners(ns);
    const newOrUpgradedServers = purchaseAndUpgradeServers(ns);
    const hackTargets = getNukedServers(ns, hackableServers);
    const bestHackTarget = getBestHackTarget(ns, hackTargets);
    if (bestHackTarget === currentBestHackTarget) {
      //Nothing has changed, so we deploy to new or upgraded servers only
      await startHacks(ns, newOrUpgradedServers, bestHackTarget);
      await ns.sleep(10000);
    } else {
      //Best server to hack has changed, so we re-deploy to everything
      currentBestHackTarget = bestHackTarget;
      await startHacksForHome(ns, bestHackTarget);
      await startHacks(ns, ns.getPurchasedServers(), bestHackTarget);
      await startHacks(ns, hackTargets, bestHackTarget);
    }
  }
}

