import {NS} from "@ns";
import {buyPortOpeners} from "scripts/PortOpeners";
import {
  getBestHackTarget,
  getHackableServers,
  getNukedServers,
  purchaseAndUpgradeServers,
  startHacks,
  startHacksForHome,
} from "scripts/Servers";

export async function main(ns: NS) {
  const hackableServers = getHackableServers(ns).map(server => server.host);
  let currentBestHackTarget = "";
  while (true) {
    buyPortOpeners(ns);
    const newOrUpgradedServers = purchaseAndUpgradeServers(ns);
    const hackTargets = getNukedServers(ns, hackableServers);
    const bestHackTarget = getBestHackTarget(ns, hackTargets);
    if (bestHackTarget !== currentBestHackTarget) {
      //Best target has changed, so we re-deploy to everything
      currentBestHackTarget = bestHackTarget;
      await startHacksForHome(ns, bestHackTarget);
      await startHacks(ns, ns.getPurchasedServers(), bestHackTarget);
      await startHacks(ns, hackTargets, bestHackTarget);
    } else if (newOrUpgradedServers.length > 0) {
      //Best target hasn't changed, but we have new servers to deploy to
      await startHacks(ns, newOrUpgradedServers, bestHackTarget);
    } else {
      //Nothing has changed, so we pause before running again
      await ns.sleep(10000);
    }
  }
}

