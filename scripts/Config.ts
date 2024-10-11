import { system, world } from "@minecraft/server";

/** TODO: there is some stuff missing from this. */
class CobblemonConfig {
  maxPokemonLevel = 100;
  maxPokemonFriendShip = 255;
  defaultBoxCount = 30;
  preventCompletePartyDeposit = false;
  allowExperienceFromPVP = true;
  experienceShareMultiplier = 0.5;
  luckyEggMultiplier = 1.5;
  experienceMultiplier = 2;
  mainCharacter = "";
}

/** Do not Use this until after worldInitialize */
let config = new CobblemonConfig();
let worldInit = false;

world.beforeEvents.worldInitialize.subscribe(x => {
  worldInit = true;
  let worldConfig = world.getDynamicProperty("cobblemon_config");
  (() => {
    if (typeof worldConfig != "string") {
      return;
    }
    let newConfObj = JSON.parse(worldConfig);
    if (typeof newConfObj === "object") {
      Object.assign(config, newConfObj);
    }
  })();
  world.setDynamicProperty("cobblemon_config", JSON.stringify(config));
})

/** Gets the currently loaded config.
 * @throws Errors if the world has yet to initialize.
 */
export function getConfig() {
  if (!worldInit)
    throw new Error("The config was accessed before the world was initialized.");
  return config;
}

export function updataConfig(conf: CobblemonConfig) {
  config = conf;
  world.setDynamicProperty("cobblemon_config", JSON.stringify(config))
}