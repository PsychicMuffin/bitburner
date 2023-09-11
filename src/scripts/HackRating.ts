import {NS} from "@ns";

export function calculateHackRating(ns: NS, host: string): number {
  const maxMoney = ns.getServerMaxMoney(host);
  const percentMoneyHacked = calculatePercentMoneyHacked(ns, host);
  const hackingXp = calculateHackingXp(ns, host);
  const hackChance = calculateHackChance(ns, host);
  const hackTime = calculateHackTime(ns, host);

  const moneyRate = maxMoney * percentMoneyHacked * hackChance / hackTime;

  const averageXpGain = (hackingXp * hackChance) + ((hackingXp / 4) * (1 - hackChance));
  const xpRate = averageXpGain / hackTime;

  // We use xp gain as a multiplier as it unlocks better servers, and we weight by max money as
  // that realistically increases success odds by reducing over-hacking chance drastically
  return moneyRate * (xpRate / 100) * (maxMoney / 1000000);
}

function calculateHackingXp(ns: NS, host: string) {
  const initialSecurity = ns.getServerBaseSecurityLevel(host);
  const xpGain = 3 + (initialSecurity * .3);
  return xpGain * ns.getPlayer().mults.hacking_exp;
}

function calculatePercentMoneyHacked(ns: NS, host: string) {
  const currentHackSkill = ns.getHackingLevel();
  const minSecurity = ns.getServerMinSecurityLevel(host);
  const reqHackSkill = ns.getServerRequiredHackingLevel(host);

  const difficultyMult = (100 - minSecurity) / 100;
  const skillMult = (currentHackSkill - (reqHackSkill - 1)) / currentHackSkill;
  const personalMult = ns.getPlayer().mults.hacking_money;

  return difficultyMult * skillMult * personalMult / 240;
}

function calculateHackChance(ns: NS, host: string) {
  const currentHackSkill = ns.getHackingLevel();
  const reqHackSkill = ns.getServerRequiredHackingLevel(host);
  const minSecurity = ns.getServerMinSecurityLevel(host);

  const difficultyMult = (100 - minSecurity) / 100;
  const skillMult = 1.75 * currentHackSkill;
  const skillChance = (skillMult - reqHackSkill) / skillMult;
  const personalMulti = ns.getPlayer().mults.hacking_chance;

  return difficultyMult * skillChance * personalMulti;
}

function calculateHackTime(ns: NS, host: string) {
  const currentHackSkill = ns.getHackingLevel();
  const reqHackSkill = ns.getServerRequiredHackingLevel(host);
  const minSecurity = ns.getServerMinSecurityLevel(host);

  const difficultyMult = reqHackSkill * minSecurity;
  const skillFactor = (2.5 * difficultyMult + 500) / (currentHackSkill + 50);
  const personalMult = ns.getPlayer().mults.hacking_speed;
  return (5 * skillFactor) / personalMult;
}

export type RatedServer = { name: string, rating: number };