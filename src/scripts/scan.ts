import {getHackableServers} from "/scripts/Servers";
import {NS} from "@ns";

export async function main(ns: NS) {
  getHackableServers(ns)
    .forEach(server => ns.tprint(`${server.host} => ${server.path}`));
}