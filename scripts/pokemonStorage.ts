/**
 * Storing Pokemon Data
 * Each pokemon has a json stored in the dynamic property "data"
 * The team is stored in a jsonified array in dynamic property "team"
 * Each box is also a json array Ex: "box0" and so on (Starts at 0)
 * All blank spots in either array are just null
 */

import { Entity, Player, RawMessage } from "@minecraft/server";
import { PokemonData } from "./Pokemon";

export const totalBoxes = 8;
export const spacesPerBox = 30;

export enum PCPlace {
  Box,
  Team
}

export interface PCLocation {
  location: PCPlace,
  boxID?: number,
  space: number
}

export interface BoxData {
  boxName?: string,
  boxData: (PokemonData | null)[]
}

/**Initializes player;
 * Only call if player has chosen a starter pokemon or if they just caught one.
 * (If writing to data, not reading it)
 */
function initializePlayer(player: Player) {
  player.setDynamicProperty("team", `[null,null,null,null,null,null]`);
  player.setDynamicProperty("initialized", true);
}
/** Initializes the Player Box Data
 * @returns Json Array of Box
 * @throws Invalid BoxID Number
 */
function initializePlayerBox(player: Player, boxID: number): string {
  if (boxID < 0 || boxID > totalBoxes - 1) throw new Error("Invalid Box ID to Initialize");
  let boxArray = generateNewBoxData();
  let boxStringify = JSON.stringify(boxArray);
  player.setDynamicProperty("box" + boxID, boxStringify);
  return boxStringify;
}
function generateNewBoxData(): BoxData {
  let boxArray: null[] = (new Array(spacesPerBox)).fill(null);
  return { boxData: boxArray };
}
/**
 * @returns PokemonData, null if the space is empty, and undefined if the player is not initialized or other errors
 */
export function getPokemonFromPCLocation(player: Player, location: PCLocation): PokemonData | null | undefined {
  if (!player.getDynamicProperty("initialized")) return undefined
  let pokemonArray;
  if (location.location === PCPlace.Team) {
    pokemonArray = getSafeTeam(player);
  }
  else if (location.location === PCPlace.Box) {
    pokemonArray = getSafeBoxTeam(player, location.boxID!);
  }
  else {
    return undefined;
  }
  if (location.space >= pokemonArray.length || location.space < 0) return undefined; //Invalid Space
  return pokemonArray[location.space];
}
/** Be Careful, this can overwrite pokemon.
 * @throws Errors
 */
export function setPokemonToPCLocation(player: Player, location: PCLocation, pokemon: PokemonData | null) {
  if (!player.getDynamicProperty("initialized"))
    initializePlayer(player);
  if (location.location === PCPlace.Team) {
    let pokemonArray = getSafeTeam(player);
    if (location.space >= pokemonArray.length || location.space < 0) throw new Error("Invalid PCLocation to Save to.")
    pokemonArray[location.space] = pokemon;
    player.setDynamicProperty("team", JSON.stringify(pokemonArray));
  }
  else if (location.location === PCPlace.Box) {
    let pokemonArray = getSafeBoxData(player, location.boxID!);
    if (location.space >= spacesPerBox || location.space < 0 || location.boxID === undefined || location.boxID >= totalBoxes) throw new Error("Invalid PCLocation to Save to.");
    pokemonArray.boxData[location.space] = pokemon;
    player.setDynamicProperty("box" + location.boxID!.toString(), JSON.stringify(pokemonArray));
  }
}

/** Accepts either json or PokemonData as input and stores the pokemon to the player
 * Returns the message to send to the player.
*/
export function storePokemonInFirstSpace(data: PokemonData | string, player: Player): RawMessage | undefined {
  if (typeof data === "string") data = PokemonData.getFromJson(data);
  if (!player.getDynamicProperty("initialized") || player.getDynamicProperty("team") === undefined) initializePlayer(player);

  //Test if team has room
  let teamJson = player.getDynamicProperty("team");
  if (typeof teamJson === "string") {
    let team = decodePokemonArray(teamJson)!;
    for (let i = 0; i < 6; i++) {
      if (team[i] === null) {
        team[i] = data;
        player.setDynamicProperty("team", JSON.stringify(team));
        return;
      }
    }
  }

  //Add if Boxes have room
  for (let i = 0; i < totalBoxes; i++) {
    let boxJson = player.getDynamicProperty("box" + i) as string;
    if (!boxJson || !(typeof boxJson === "string")) boxJson = initializePlayerBox(player, i);
    let boxArray = decodePokemonArray(boxJson)!;
    for (let space = 0; space < boxArray.length; space++) {
      if (boxArray[space] === null) {
        boxArray[space] = data;
        player.setDynamicProperty("box" + i, JSON.stringify(boxArray));
        return { translate: "cobblemon.overflow_to_pc", with: { rawtext: [data.getTranslatedName(), { translate: "cobblemon.ui.pc.box.title", with: [(i + 1).toString()] }] } };
      }
    }
  }

  return { translate: "cobblemon.overflow_no_space" };
}

/** Returns Team. All empty team members are returned as null
 * @returns - Array memebers will be either data or null
 */
export function getTeam(player: Player): (PokemonData | null)[] | undefined {
  if (!player.getDynamicProperty("initialized")) return undefined;
  let teamData = player.getDynamicProperty("team");
  if (!teamData || typeof teamData != "string") return undefined;
  return decodePokemonArray(teamData);
}
/** Returns the team data, but if team data not initialized, but safer
 * @returns - Team data or [null,null,null,null,null,null] if uninitialized
 */
export function getSafeTeam(player: Player): (PokemonData | null)[] {
  return getTeam(player) || [null, null, null, null, null, null];
}

/** This exists so that all data is initialized as a class
 * @param jsonArray Either a string of a pokemonData Array or the pokemon data array itself
 */
function decodePokemonArray(jsonArray: string | (PokemonData | null)[]): (PokemonData | null)[] | undefined {
  let array: (PokemonData | null)[] = (Array.isArray(jsonArray)) ? jsonArray : JSON.parse(jsonArray);
  if (!Array.isArray(array)) return undefined;
  //Make sure each item is initialized as a class.
  array.forEach((x, i) => {
    if (x && typeof x === "object") {
      array[i] = PokemonData.getFromJson(x);
    }
  });
  return array;
}
/** Removes Pokemon from space.
 * @param boxID Use index starting from 0
 * @param space Use index starting from 0
 * @throws errors
 */
// I want this function to throw errors so that duplication exploits don't happen as easily
export function removePokemon(player: Player, boxID: number, space: number) {
  let dataJson = player.getDynamicProperty("box" + boxID);
  if (!dataJson || !(typeof dataJson === "string")) throw new Error("Could not read box data.");
  let dataArray = decodePokemonArray(dataJson);
  if (!dataArray) throw new Error("Could not decode box data.");
  dataArray[space] = null;
  player.setDynamicProperty("box" + boxID, JSON.stringify(dataArray));
}

/** Returns PC Box Pokemon. All empty team members are returned as null
 * @returns - Array memebers will be either data or null
 */
export function getBoxTeam(player: Player, boxID: number): (PokemonData | null)[] | undefined {
  return getBoxData(player, boxID)?.boxData;
}

/** Returns PC Box Data but if the data is unintialized return an empty box */
export function getSafeBoxTeam(player: Player, boxID: number): (PokemonData | null)[] {
  return getBoxTeam(player, boxID) || generateNewBoxData().boxData;
}

export function getBoxData(player: Player, boxID: number): BoxData | undefined {
  if (!player.getDynamicProperty("initialized")) return undefined;
  let boxProp = player.getDynamicProperty("box" + boxID.toString());
  if (!boxProp || typeof boxProp != "string") return undefined;
  let jsonData = JSON.parse(boxProp);
  if (Array.isArray(jsonData)) {
    migrateBoxData(player, boxID);
    return getBoxData(player, boxID);
  }
  let boxData = jsonData as BoxData;
  return boxData;
}

/** Returns PC Box Data but if the data is unintialized return an empty box */
export function getSafeBoxData(player: Player, boxID: number): BoxData {
  return getBoxData(player, boxID) || generateNewBoxData();
}

/** Heals the player's entire team
 * @returns whether or not it was sucessful
 */
export function healPlayerTeam(player: Player): boolean {
  let teamData = getTeam(player);
  if (teamData === undefined) return false;
  teamData.forEach((x, i, a) => {
    if (x === null) return;
    x.updateMaxHP();
    x.currentHealth = x.maxHealth;
    x.movesInfo.forEach((x, i, a) => {
      a[i].pp = a[i].maxPp
    })
    x.status = undefined;
    a[i] = x;
  })
  player.setDynamicProperty("team", JSON.stringify(teamData));
  return true;
}

export function isPlayerInitialized(player: Player): boolean {
  return !(player.getDynamicProperty("team") === undefined || player.getDynamicProperty("initialized") === undefined);
}

/** If the player's team is valid and not empty, the team will be returned. */
export function hasValidTeam(player: Player): (PokemonData | null)[] | false {
  let team = getSafeTeam(player);
  if (team.some(x => x != null))
    return team;
  return false;
}

//TEMP: Migrate box data to new format
export function migrateBoxData(player: Player, boxID: number) {
  let data = player.getDynamicProperty("box" + boxID)!;
  let decodedData = JSON.parse(data as string);
  if (!Array.isArray(decodedData))
    return;
  let newData: BoxData = { boxData: decodedData };
  player.setDynamicProperty("box" + boxID, JSON.stringify(newData))
}