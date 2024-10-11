import { Entity, Player } from "@minecraft/server";
import { battleMap, PokemonBattle } from "./PokemonBattle";
import { getSafeTeam, hasValidTeam } from "../pokemonStorage";
import { PokemonData } from "../Pokemon";
import { BattleSide } from "./BattleSide";
import { BattleActor } from ".";
import { BattleFormat } from "./BattleFormat";

//export { Battle } from "./Battle";
//export { BattleMonitor } from "./BattleMonitor";
export { BattleActor } from "./BattleActor";
export { ActionResponse } from "./ActionResponse";
export { PokemonBattle, battleMap } from "./PokemonBattle";
export { ActivePokemon } from "./ActivePokemon";
export { BattleFormat } from "./BattleFormat";
export { BattleSide } from "./BattleSide";

/** Checks if their battle id exists and if it doesn't, remove battle flags.
 * Also properly sets "cobblemon:in_batttle"
 */
export function cleanUpStaleBattleData(entity: Entity) {
  let battleUUID = entity.getDynamicProperty("in_battle");
  if (battleUUID && typeof battleUUID === "string" && !battleMap.has(battleUUID)) {
    entity.setDynamicProperty("in_battle", undefined);
    battleUUID = undefined;
  }
  if (battleUUID) {
    entity.setProperty("cobblemon:in_battle", true);
  }
  else {
    entity.setProperty("cobblemon:in_battle", false);
  }

}

export function startWildBattle(player: Player, wildPokemon: Entity): PokemonBattle | undefined {
  let playerTeam = hasValidTeam(player);
  if (!playerTeam)
    return undefined;
  let wildPokemonData = PokemonData.getFromEntity(wildPokemon);
  let playerSide = new BattleSide([new BattleActor(player, playerTeam.filter(x => x != null))])
  let wildSide = new BattleSide([new BattleActor(wildPokemon, [wildPokemonData])]);
  return new PokemonBattle(BattleFormat.GEN_9_SINGLES, playerSide, wildSide);
}

export function startBattleBetween2Players(player1: Player, player2: Player): PokemonBattle | undefined {
  let player1Team = hasValidTeam(player1);
  let player2Team = hasValidTeam(player2);
  if (!player1Team || !player2Team)
    return undefined;
  let player1Side = new BattleSide([new BattleActor(player1, player1Team.filter(x => x != null))]);
  let player2Side = new BattleSide([new BattleActor(player2, player2Team.filter(x => x != null))]);
  return new PokemonBattle(BattleFormat.GEN_9_SINGLES, player1Side, player2Side);
}

export function tryGetBattleFromEntity(entity: Entity): PokemonBattle | undefined {
  cleanUpStaleBattleData(entity);
  let battle = entity.getDynamicProperty("in_battle");
  if (battle === undefined || typeof battle != "string")
    return undefined;
  return battleMap.get(battle);
}