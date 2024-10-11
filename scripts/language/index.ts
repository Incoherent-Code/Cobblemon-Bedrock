import { Dex, toID } from "../showdown/sim";
import { AdditionalMoveData, AdditionalMoveDataManager, ElementalType, PokemonData } from "../Pokemon";
import { ItemStack, RawMessage } from "@minecraft/server";
import { CaptureContext } from "../catching";

export * as message from "./MessageHelperFunctions";
export { ColorCodes, FormatCodes } from "./ColorCodes";
export { renderBattleMessage } from "./BattleMessage";

export const typeSymbols: { [key in ElementalType]: string } = {
  //These characters aren't valid ascii characters but should be interpreted by minecraft as the corresponding type symbol
  normal: "",
  fire: "",
  water: "",
  grass: "",
  electric: "",
  ice: "",
  fighting: "",
  poison: "",
  ground: "",
  flying: "",
  psychic: "",
  bug: "",
  rock: "",
  ghost: "",
  dragon: "",
  dark: "",
  steel: "",
  fairy: ""
}

export const typeColorCodes: { [key in ElementalType]: string } = {
  //These characters aren't valid ascii characters but should be interpreted by minecraft as the corresponding type symbol
  normal: "§h",
  fire: "§c",
  water: "§9",
  grass: "§a",
  electric: "§e",
  ice: "§b",
  fighting: "§m",
  poison: "§u",
  ground: "§n",
  flying: "§f",
  psychic: "§5",
  bug: "§q",
  rock: "§i",
  ghost: "§5",
  dragon: "§t",
  dark: "§j",
  steel: "§7",
  fairy: "§d"
}

const moveCategorySymbols: { [key: string]: string } = {
  Physical: "",
  Special: "",
  Status: ""
}

export function renderMove(move: string, info?: AdditionalMoveData): string | RawMessage {
  let moveData = Dex.moves.get(move);
  if (!moveData || moveData.exists === false) return { translate: `cobblemon.move.${toID(move)}` }
  let pptext = "";
  if (info) {
    info = AdditionalMoveDataManager.update(info, moveData.pp);
    if (info.pp / info.maxPp < 0.25)
      pptext += "§p"
    else
      pptext += "§7"

    pptext += ` (${info.pp}/${info.maxPp})`
  }
  return {
    rawtext: [
      { text: `${moveCategorySymbols[moveData.category]} ${typeSymbols[toID(moveData.type)]} ${typeColorCodes[toID(moveData.type)]}` },
      { translate: `cobblemon.move.${toID(move)}` },
      { text: pptext }
    ]
  };
}

export function renderPokemonName(pokemon: PokemonData): string | RawMessage {
  let pokemonData = Dex.species.get(pokemon.species);
  if (!pokemonData || !pokemonData.exists) return pokemon.name || pokemon.species;
  let output: RawMessage = { rawtext: [] };
  //pokemonData.types.forEach(x => { output += typeSymbols[toID(x)] + " " })
  output.rawtext![0] = { text: typeColorCodes[toID(pokemonData.types[0])] }
  output.rawtext![1] = pokemon.getTranslatedName();
  output.rawtext![2] = { text: " " }
  output.rawtext![3] = { translate: "cobblemon.label.lv", with: [pokemon.level.toString()] }
  return output;
}

const healthBarGlobalLength = 18;
const healthBarSymbol = ":";
/**
 * Creates a string containing health bar
 * @param currentHp Current HP of pokemon
 * @param maxHp Max HP of pokemon
 * @param barLength Character length of bar including brackets on either side.
 */
export function renderHealthBar(currentHp: number, maxHp: number, barLength?: number): string {
  let length = barLength || healthBarGlobalLength;
  length -= 2; //Account for brackets
  let output = healthBarSymbol.repeat(length);
  let placement = parseInt(((currentHp / maxHp) * length).toString());
  output = insertCharAtPosition(output, "§c", placement);
  output = "§a" + output;
  return `[${output}§r]`;
}

export function renderStatus(pokemon: PokemonData): string {
  return `${pokemon.getName()}:
  ${renderHealthBar(pokemon.currentHealth, pokemon.maxHealth)}: ${pokemon.currentHealth}/${pokemon.maxHealth}
  `;
}


function insertCharAtPosition(originalString: string, charToInsert: string, position: number): string {
  return [originalString.slice(0, position), charToInsert, originalString.slice(position)].join('');
}

export function getMoveTranslation(move: string): RawMessage {
  return { translate: `cobblemon.move.${toID(move)}` };
}

export function renderCaptureMessage(context: CaptureContext, target: PokemonData): RawMessage {
  //I thought there were more lines than this
  return (context.isSucessfulCapture)
    ? { translate: "cobblemon.capture.succeeded", with: { rawtext: [target.getTranslatedName()] } }
    : { translate: "cobblemon.capture.broke_free", with: { rawtext: [target.getTranslatedName()] } }
}