import {calculateHackRating, RatedServer} from "/scripts/HackRating";
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
  let currentBestHackTarget: RatedServer = {name: "", rating: 0};
  while (true) {
    buyPortOpeners(ns);
    const newOrUpgradedServers = purchaseAndUpgradeServers(ns);
    const hackTargets = getNukedServers(ns, hackableServers);
    currentBestHackTarget.rating = calculateHackRating(ns, currentBestHackTarget.name);
    const bestHackTarget = getBestHackTarget(ns, hackTargets);
    if (bestHackTarget.rating >= (1.1 * currentBestHackTarget.rating)) {
      //Best target has changed, so we re-deploy to everything
      currentBestHackTarget = {...bestHackTarget};
      await startHacksForHome(ns, bestHackTarget.name);
      await startHacks(ns, ns.getPurchasedServers(), bestHackTarget.name);
    } else if (newOrUpgradedServers.length > 0) {
      //Best target hasn't changed, but we have new servers to deploy to
      await startHacks(ns, newOrUpgradedServers, bestHackTarget.name);
    } else {
      //Nothing has changed, so we pause before running again
      await ns.sleep(10000);
    }
  }
}

