import { RawMessage } from "@minecraft/server";
import { Battle } from "../battle/Battle";
import { getMoveTranslation } from ".";


/** Used for translation key */
const statusNames: { [key: string]: string } = {
  brn: "burn",
  fnt: "faint",
  frz: "frozen",
  par: "paralysis",
  slp: "sleep",
  tox: "poisonbadly",
  psn: "poison"
}

/** Used for translation key */
export const statNames: { [key: string]: string } = {
  spe: "speed",
  hp: "hp",
  atk: "attack",
  def: "defence",
  spa: "special_attack",
  spd: "special_defence",
  accuracy: "accuracy", //Hope these are right
  evasion: "evasion"
}

/** Handle sending messages for actions
 * @param messageArray stream data split as string[]
 */
export function renderBattleMessage(battle: Battle, messageArray: string[]): RawMessage | undefined {
  let messageType = messageArray[0];
  let UUID = messageArray[1].split(": ")[1];
  switch (messageType) {
    //No message is required
    case "pp_update":
    case "-damage":
    case "player":
    case "teamsize":
    case "switch":
      return undefined;
    //No substitutions are required
    case "-fail":
    case "-notarget":
    case "-crit":
    case "-supereffective":
    case "-resisted":
    case "-immune":
      return { translate: `cobblemon.battle.${messageType.substring(1)}` };
    case "-miss":
      return { translate: 'cobblemon.battle.missed' }
    case "cant":
      console.warn("Cant was never localized properly.");
      return { translate: "cobblemon.battle.fail" };
  }

  //Cases that use the pokemon.
  let pokemon = battle.participants.find(x => x.getTeamMemberViaUUID(UUID))?.getTeamMemberViaUUID(UUID);
  if (pokemon === undefined) {
    console.warn(`Unable to resolve pokemon for ${messageType}, or it is not included in renderBattleMessage.`);
    return undefined;
  }
  switch (messageType) {
    case "-boost":
    case "-unboost":
      var boostType = (messageArray[3] == "1") ? "slight"
        : (messageArray[3] == "2") ? "sharp"
          : "severe";
      return { translate: `cobblemon.battle.${messageType.substring(1)}.${boostType}`, with: { rawtext: [pokemon.getTranslatedName(), { translate: `cobblemon.stat.${statNames[messageArray[2]]}.name` }] } };
    case "move":
      return { translate: "cobblemon.battle.used_move", with: { rawtext: [pokemon.getTranslatedName(), getMoveTranslation(messageArray[2])] } };
    case "faint":
      return { translate: "cobblemon.battle.fainted", with: { rawtext: [pokemon.getTranslatedName()] } };
    case "drag":
      return { translate: "cobblemon.battle.dragged_out", with: { rawtext: [pokemon.getTranslatedName()] } };
    case "-status":
      return { translate: `cobblemon.status.${statusNames[messageArray[2]]}.apply`, with: { rawtext: [pokemon.getTranslatedName()] } };
    case "-formchange":
    case "detailschange":
      return { translate: "cobblemon.battle.transform", with: { rawtext: [pokemon.getTranslatedName()] } };
    default:
      console.warn(`No text defined for ${messageType}`);
      return undefined;
  }
}

// function startMessage(battle :Battle, messageArray: string[]): RawMessage | undefined {
//   let [messageType, pokemonDetail, actionData] = messageArray;
//   let [pokemonPos, pokemonUUID] = pokemonDetail.split(": ");
//   let [actionType, actionName] = actionData.split(": ");

// }