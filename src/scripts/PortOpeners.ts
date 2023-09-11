import {NS} from "@ns";

const portOpeners: PortOpener[] = [
  {
    filename: "BruteSSH.exe",
    nsCommand: (ns: NS) => ns.brutessh,
  },
  {
    filename: "FTPCrack.exe",
    nsCommand: (ns: NS) => ns.ftpcrack,
  },
  {
    filename: "relaySMTP.exe",
    nsCommand: (ns: NS) => ns.relaysmtp,
  },
  {
    filename: "HTTPWorm.exe",
    nsCommand: (ns: NS) => ns.httpworm,
  },
  {
    filename: "SQLInject.exe",
    nsCommand: (ns: NS) => ns.sqlinject,
  },
];

export function getPortOpeners(ns: NS): NsPortOpener[] {
  return portOpeners
    .filter(po => ns.fileExists(po.filename, "home"))
    .map(po => po.nsCommand(ns));
}

export function buyPortOpeners(ns: NS): boolean {
  return false;//TODO: requires something 4

  // ns.singularity.purchaseTor();
  // let boughtSomething = false;
  // portOpeners.filter(po => !ns.fileExists(po.filename, "home")).forEach(po => {
  //   if (ns.singularity.purchaseProgram(po.filename)) {
  //     boughtSomething = true;
  //   }
  // });
  // return boughtSomething;
}

export type NsPortOpener = (host: string) => void;

export type PortOpener = {
  filename: string,
  nsCommand: (ns: NS) => NsPortOpener,
}