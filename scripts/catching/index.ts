import { Entity, Player, RawMessage, system } from "@minecraft/server";
import { CatchRateModifier } from "./CatchRateModifier";
import { ElementalType, PokemonData, StatusEffect } from "../Pokemon";
import { GarunteedModifier } from "./GarunteedMultiplier";
import { battleMap, tryGetBattleFromEntity } from "../battle";
import { MultiplierModifier } from "./MultiplierModifier";
import { LabelModifier } from "./LabelModifier";
import { storePokemonInFirstSpace } from "../pokemonStorage";
import { renderCaptureMessage } from "../language";
import { CatchRateModifiers } from "./StandardModifiers";
import { BaseStatModifier } from "./BaseStatModifier";

export { CatchRateModifier } from "./CatchRateModifier";
export { BaseStatModifier } from "./BaseStatModifier";
export { BattleModifier } from "./BattleModifier";
export { DynamicMultiplierModifier } from "./DynamicMultiplierModifier";
export { GarunteedModifier } from "./GarunteedMultiplier";
export { LabelModifier } from "./LabelModifier";
export { MultiplierModifier } from "./MultiplierModifier";
export { WorldStateModifier } from "./WorldStateModifier";


/** A Record of the differnet Catch Rate Modifiers for every pokeball. */
const pokeballCatchRates: Record<string, CatchRateModifier> = {
  "great_ball": new MultiplierModifier(1.5),
  "ultra_ball": new MultiplierModifier(2),
  "master_ball": new GarunteedModifier(),
  "safari_ball": CatchRateModifiers.SAFARI,
  "fast_ball": new BaseStatModifier("spe", x => x >= 100, 4),
  "level_ball": CatchRateModifiers.LEVEL,
  "lure_ball": CatchRateModifiers.typeBoosting(2, ElementalType.Water),
  "heavy_ball": CatchRateModifiers.WEIGHT_BASED,
  "love_ball": CatchRateModifiers.LOVE,
  "moon_ball": CatchRateModifiers.MOON_PHASES,
  "sport_ball": new MultiplierModifier(1.5),
  "net_ball": CatchRateModifiers.typeBoosting(3, ElementalType.Bug, ElementalType.Water),
  "dive_ball": CatchRateModifiers.SUBMERGED_IN_WATER,
  "nest_ball": CatchRateModifiers.NEST,
  "timer_ball": CatchRateModifiers.turnBased(turn => Math.min((1 * turn * (1229 / 4096)), 4)), //Ensures that 4 is the maximum multiplier.
  "dusk_ball": CatchRateModifiers.LIGHT_LEVEL,
  "quick_ball": CatchRateModifiers.turnBased(turn => (turn === 1) ? 5 : 1),
  "park_ball": CatchRateModifiers.PARK,
  "dream_ball": CatchRateModifiers.statusBoosting(4, StatusEffect.Sleep),
  "beast_ball": new LabelModifier(5, true, "ultra_beast")
}
/**
 * @param pokeball Takes in either the pokeball entity or the pokeball name (without namespace)
 * @returns The catch rate modifier associated with that pokeball or a generic modifier if there is none
 */
export function getCatchRateModifier(pokeball: Entity | string): CatchRateModifier {
  let pokeballName = (typeof pokeball == "string") ? pokeball : pokeball.typeId.split(":")[1];
  return pokeballCatchRates[pokeballName] || new MultiplierModifier(1);
}

export interface CaptureContext {
  numberOfShakes: number,
  isSucessfulCapture: boolean,
  isCriticalCapture: boolean
}

/** Calculates the amount of pokeball shakes and whether or not the capture was a sucess */
export function processCapture(thrower: Player, pokeball: Entity, targetPokemon: Entity): CaptureContext {
  let target = PokemonData.getFromEntity(targetPokemon);
  let pokeballCatchRateMod = getCatchRateModifier(pokeball);
  let speciesData = target.getSpeciesData();
  if (speciesData === undefined)
    throw new Error(`Unable to get species data for ${target.species}`);

  if (pokeballCatchRateMod.isGarunteed)
    return { isSucessfulCapture: true, numberOfShakes: 4, isCriticalCapture: false }
  let darkGrass = 1;
  let currentBattle = tryGetBattleFromEntity(thrower);
  let inBattleModifier = (currentBattle !== undefined && tryGetBattleFromEntity(targetPokemon)?.battleId == currentBattle.battleId) ? 1 : 0.5;
  //TODO: IMPLIMENT FORMS
  let catchRate = speciesData.catchRate;

  //Handles differnet status effects
  let statusBonus: number;
  switch (target.status) {
    case "slp":
    case "frz":
      statusBonus = 2.5;
      break;
    case "par":
    case "brn":
    case "psn":
    case "tox":
      statusBonus = 1.5;
      break;
    default:
      statusBonus = 1;
  }

  let levelBonus = (target.level < 13) ? Math.max((36 - (2 * target.level)), 1) : 1;
  let modifiedCatchRate = pokeballCatchRateMod
    .modifyCatchRate((3 * target.maxHealth - 2 * target.currentHealth) * darkGrass * catchRate * inBattleModifier, thrower, target)
    / (3 * target.maxHealth);
  modifiedCatchRate *= statusBonus * levelBonus;
  //TODO: Impliment HighestLevelThrower
  //TODO: Impliment Criticals
  let critical = false;
  let shakeProbablility = Math.round(65535 / Math.pow(255 / modifiedCatchRate, 0.1875));
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    let n = Math.random() * 65537;
    if (n < shakeProbablility) {
      shakes++;
    }
    if (i == 0 && critical) {
      return { numberOfShakes: 1, isSucessfulCapture: (shakes === 1), isCriticalCapture: true };
    }
  }
  return { numberOfShakes: shakes, isSucessfulCapture: (shakes === 4), isCriticalCapture: false };
}
/** Handles the pokeball capture sequence. TODO: Critical Captures */
export async function handlePokeballCapture(thrower: Player, pokeball: Entity, targetPokemon: Entity) {
  try {
    let pokemonData = PokemonData.getFromEntity(targetPokemon);
    pokeball.triggerEvent("cobblemon:disable");
    thrower.dimension.playSound("poke_ball.capture_started", pokeball.location);
    targetPokemon.setProperty("cobblemon:busy", true);
    let captureContext = processCapture(thrower, pokeball, targetPokemon);
    let pokeballName = pokeball.typeId.split(":")[1];

    let pokemonLocation = targetPokemon.location;
    targetPokemon.addEffect("invisibility", 9999, { showParticles: false });
    pokeball.playAnimation("capture");
    await waitTicks(30);
    for (let i = 0; i < captureContext.numberOfShakes; i++) {
      pokeball.dimension.playSound(`poke_ball.shake`, pokeball.location);
      pokeball.playAnimation(`bob${Math.round((Math.random() * 5) + 1)}`);
      await waitTicks(20);
    }

    thrower.sendMessage(renderCaptureMessage(captureContext, pokemonData));
    if (captureContext.isSucessfulCapture) {
      pokeball.dimension.playSound("poke_ball.capture_succeeded", pokeball.location);
    }
    else {
      pokeball.dimension.playSound("poke_ball.send_out", pokeball.location);
      pokeball.playAnimation("open");
      targetPokemon.teleport(pokemonLocation);
    }

    await waitTicks(15);

    if (captureContext.isSucessfulCapture) {
      targetPokemon.triggerEvent("cobblemon:instant_kill");
      pokemonData.ogTrainer = thrower.name;
      pokemonData.pokeball = pokeballName;
      pokemonData.trainer = thrower.id;
      let storageMessage = storePokemonInFirstSpace(pokemonData, thrower);
      if (storageMessage !== undefined)
        thrower.sendMessage(storageMessage);
    }
  }
  catch (e) {
    console.error(e);
  }
  if (targetPokemon.isValid()) {
    targetPokemon.removeEffect("invisibility");
    targetPokemon.setProperty("cobblemon:busy", false);
  }
  if (pokeball.isValid())
    pokeball.triggerEvent("cobblemon:instant_kill");
}

function waitTicks(numberOfTicks: number): Promise<void> {
  return new Promise(resolve => system.runTimeout(resolve, numberOfTicks));
}