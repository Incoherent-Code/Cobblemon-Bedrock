import { ActionFormData, MessageFormData, ModalFormData, } from "@minecraft/server-ui"
import { Entity, Player, world, Vector3, RawMessage } from "@minecraft/server"
import { PokemonData } from "../Pokemon"
import { getMoveTranslation, message, renderMove, renderPokemonName, renderStatus } from "../language"
import { Dex } from "../showdown/sim"
import { AdditionalMoveDataManager } from "../Pokemon"
import { PCPlace, PCLocation, getSafeBoxTeam, getSafeTeam, getTeam, totalBoxes, getPokemonFromPCLocation, setPokemonToPCLocation } from "../pokemonStorage"
import { Battle, BattleParticipant } from "../battle/Battle"
import { RequestData } from "../battle/Request"
import { Evolution, initializeEvolutions } from "../evolution"
import { PokemonProperties } from "../PokemonProperties"
import { toID } from "../utils"
import { getSpeciesData, SpeciesData } from "../speciesData"

export { showStarterGUI } from "./StarterGUI";
export { okDialog } from "./OKDialogBox";

/** GUI for changing the pokemon's moves and nickname */
export async function showPokemonGUI(showFrom: Entity, player: Player) {
  const gui = new ModalFormData()
  let pokemonData = PokemonData.getFromEntity(showFrom);
  gui.title(pokemonData.getTranslatedName());
  let knownMoves = pokemonData.getKnownMoves();

  let nick = pokemonData.name || pokemonData.species
  gui.textField("Nickname:", "Enter Nickname Here", pokemonData.name || pokemonData.species);

  //Dropdowns for Selecting a Move
  for (let i = 0; (i < 4 && i < knownMoves.length); i++) {
    //This is done so that if a pokemon has 3 moves but learns a fourth there will be a dropdown but no default
    if (pokemonData.moves.length >= (i + 1)) {
      let renderedMoves = knownMoves.map(x => { return renderMove(x, pokemonData.movesInfo[i]) });
      let defaultIndex: number | undefined = knownMoves.indexOf(pokemonData.moves[i]);
      if (defaultIndex === -1)
        defaultIndex = undefined;
      gui.dropdown("Select Move:", renderedMoves, defaultIndex);
    }
    else {
      let renderedMoves = knownMoves.map(x => { return renderMove(x) });
      gui.dropdown("Select Move:", renderedMoves);
    }
  }
  let evolutions = pokemonData.getEvolutions();
  let evolveOptions: [Evolution, string | RawMessage][] = pokemonData.readyEvolutions
    .map(x => evolutions.find(y => y.id == x))
    .filter(x => x != undefined)
    .map(x => [x, renderPokemonName(x.result.apply(pokemonData))]);
  let canEvolve = evolveOptions.length > 0;
  if (canEvolve) {
    gui.toggle({ translate: "cobblemon.ui.evolve" });
    gui.dropdown({ translate: "cobblemon.ui.evolution" }, evolveOptions.map(x => x[1]));
  }

  const response = await gui.show(player);
  //Cancel the submission
  if (!response.formValues) {
    player.sendMessage(message.warn({ translate: "cobblemon.ui.info.unsaved_changes" }));
    return;
  }
  //Change Nickname
  let newNick = response.formValues[0];
  if (nick != newNick && typeof newNick == "string") {
    pokemonData.name = newNick;
  }
  //Set Moves
  //Starts at 1 because response[0] is nickname
  for (let i = 1; (i < 4 + 1 && i < knownMoves.length + 1); i++) {
    if (response.formValues[i] == undefined || typeof response.formValues[i] != "number") continue;
    let newMove = knownMoves[Number(response.formValues[i])];
    let moveData = Dex.moves.get(newMove);
    if (!moveData || moveData.exists === false) {
      console.log(`Unknown Move ${newMove}.`);
      continue;
    }
    if (pokemonData.moves[i - 1] != newMove) {
      pokemonData.moves[i - 1] = newMove;
      pokemonData.movesInfo[i - 1] = AdditionalMoveDataManager.update(pokemonData.movesInfo[i - 1], moveData.pp)
    }
  }

  pokemonData.tryUpdatePokemonOut();
  pokemonData.updatePokemonInTeam(player);

  if (canEvolve && response.formValues[5] === true && typeof response.formValues[6] == "number" && response.formValues[6] >= 0) {
    let selectedEvolution = evolveOptions[response.formValues[6]][0];
    selectedEvolution.forceEvolve(pokemonData);
  }
}

/** GUI to choose which pokemon to send out
 * TODO: Use ShowPartyScreen
 */
export async function sendOutGUI(player: Player) {
  let playerTeam = getTeam(player);
  if (!playerTeam) return;
  let validOptions = playerTeam.filter(x => { return (x && (x.name || x.species) && x.level) }) as PokemonData[];
  if (validOptions.length <= 0) return;
  const gui = new ActionFormData;
  gui.title("Send out who?");
  validOptions.forEach((x, i) => {
    //gui.button(renderPokemonName(x!).padEnd(30), getPokemonSpriteTexture(x.species)); // This never worked to center it anyways
    gui.button(renderPokemonName(x!), getPokemonSpriteTexture(x.species));
  })
  const response = await gui.show(player);
  if (response.selection === undefined) return;
  let selectedPokemon = validOptions[response.selection];
  if (selectedPokemon.tryGetPokemonOut()) {
    selectedPokemon.return(player);
  }
  else {
    selectedPokemon.sendOut(player);
  }
}

//Just so I can tweak it if I need to
export function getPokemonSpriteTexture(species: string) {
  return "textures/sprites/" + species
    .toLowerCase()
    .replace(" ", "-")
    .replace(/[^a-z0-9\-]+/g, '');
}

export async function openPCGui(player: Player, boxID?: number) {
  let response = await showPCScreen(player, boxID || 0);
  if (!response) return;
  let pokemonInSpot = getPokemonFromPCLocation(player, response);
  if (pokemonInSpot === undefined) return;
  if (pokemonInSpot === null) {
    openPCGui(player, response.boxID);
    return;
  }
  let action = await showPCActionGUI(player);
  if (action === undefined) return;
  switch (action) {
    case PCActions.movePokemon:
      let moveTo = await showPCScreen(player, response.boxID || 0, "Move to Where?")
      if (moveTo === undefined) return;
      let pokemonInNewLocation = getPokemonFromPCLocation(player, moveTo);
      if (pokemonInNewLocation === undefined) return;
      //Swap Places
      if (response.location == PCPlace.Team)
        pokemonInSpot.tryGetPokemonOut()?.triggerEvent("cobblemon:instant_kill");
      if (moveTo.location == PCPlace.Team)
        pokemonInNewLocation?.tryGetPokemonOut()?.triggerEvent("cobblemon:instant_kill");
      setPokemonToPCLocation(player, moveTo, pokemonInSpot);
      setPokemonToPCLocation(player, response, pokemonInNewLocation);
      await openPCGui(player, moveTo.boxID);
      break;
    case PCActions.releasePokemon:
      let ask = await showYesOrNoDialog(player, "Are you Sure you would like to release this pokemon? This action cannot be undone.")
      if (ask) {
        //Goodbye, old friend
        setPokemonToPCLocation(player, response, null);
      }
      await openPCGui(player, response.boxID);
      break;
    case PCActions.summarizePokemon:
      player.sendMessage("Unimplimented!");
      await openPCGui(player, response.boxID);
      break;
  }
}
/** Shows a yes or no dialog to the player
 * @returns true if yes, false if no, and undefined if cancelled.
 */
export async function showYesOrNoDialog(player: Player, bodyText: string | RawMessage, title?: string | RawMessage): Promise<boolean | undefined> {
  let confirmationDialog = new MessageFormData()
    .title(title || "Confirmation")
    .body(bodyText)
    .button1({ translate: "cobblemon.ui.generic.no" })
    .button2({ translate: "cobblemon.ui.generic.yes" })

  let response = await confirmationDialog.show(player);
  if (response.selection === undefined) return undefined;
  if (response.selection === 1) return true;
  if (response.selection === 0) return false;
  return undefined;
}

async function showPCScreen(player: Player, boxID: number, title?: string): Promise<PCLocation | undefined> {
  let pcgui = new ActionFormData()
    .title("PC - Box " + (boxID + 1).toString() + (title ? " - " + title : ""))
    .button({ translate: "gui.back" })
    .button(message.With({ translate: "cobblemon.ui.pc.box.title" }, [(boxID + 1).toString()]))
    .button({ translate: "gui.next" });
  let boxData = getSafeBoxTeam(player, boxID);
  boxData.forEach((x, i) => {
    if (!x) pcgui.button({ translate: "hudScreen.tooltip.empty" })
    else {
      pcgui.button(renderPokemonName(x), getPokemonSpriteTexture(x.species))
    }
  })
  let response = await pcgui.show(player);
  if (response.selection === undefined) return undefined;
  switch (response.selection) {
    case 0:
      return await showPCScreen(player, ((boxID - 1) >= 0) ? boxID - 1 : totalBoxes - 1, title);
    case 1://Do Nothing if clicked on box button (The menu closes when a button is clicked)
      return (await showPartyScreen(player, true, title)) || (await showPCScreen(player, boxID, title));
    case 2:
      return await showPCScreen(player, ((boxID + 1) <= (totalBoxes - 1)) ? boxID + 1 : 0, title);
    default: //Return selected space
      return { location: PCPlace.Box, space: (response.selection - 3), boxID: boxID };
  }
}

export async function showPartyScreen(player: Player, showEmptySlots?: boolean, title?: string): Promise<PCLocation | undefined> {
  let pcgui = new ActionFormData()
    .title("Party" + (title ? " - " + title : ""));
  let boxData = getSafeTeam(player);
  let validOptions: (PokemonData | null)[] = [];
  boxData.forEach((x, i) => {
    if (!x) {
      if (showEmptySlots) {
        validOptions.push(x);
        pcgui.button({ translate: "hudScreen.tooltip.empty" });
      }
    }
    else {
      pcgui.button(renderPokemonName(x), getPokemonSpriteTexture(x.species));
      validOptions.push(x);
    }
  })
  let response = await pcgui.show(player);
  if (response.selection === undefined) return undefined;
  let space;
  if (showEmptySlots) space = response.selection;
  else {
    space = boxData.indexOf(validOptions[response.selection])
  }
  return { location: PCPlace.Team, space: space }
}

//Make sure this is in the same order as the PCActionGUI
enum PCActions {
  movePokemon,
  summarizePokemon,
  releasePokemon
}

async function showPCActionGUI(player: Player): Promise<PCActions | undefined> {
  let actionGUI = new ActionFormData()
    .title("What would you like to do with this pokemon?")
    //Keep in order with PCActions
    .button("Move")
    .button("Summary")
    .button("Release")
  let response = actionGUI.show(player);
  return (await response).selection;
}

export enum BattleActions {
  useMove = "move",
  switchOut = "switch",
  pass = "pass"
}

export interface BattleAction {
  action: BattleActions
  target: string //Like pokemon 6 or move 4
}
/** Handles a battle request and returns the command to send as a string
 * Only use if the participant is a player
 * @throws If participant is not a player
 */
export async function handleMoveRequest(request: RequestData, participant: BattleParticipant, battle: Battle): Promise<string | undefined> {
  if (!participant.Player) throw new Error("Couldn't handle request: Participant is not a player");
  if (request.forceSwitch) return convertBattleActionToCommand(await showSwitchGUI(request, participant)); //Ik this only works in one on one
  let response = await showActionGUI(request, participant, battle);
  return convertBattleActionToCommand(response);
}

function convertBattleActionToCommand(action?: BattleAction): string | undefined {
  if (action === undefined) return undefined;
  switch (action.action) {
    case BattleActions.useMove:
    case BattleActions.switchOut:
      return `${action.action} ${action.target}`
    case BattleActions.pass:
      return action.action
  }
}

async function showActionGUI(request: RequestData, participant: BattleParticipant, battle: Battle): Promise<BattleAction | undefined> {
  let bodyMessage = "";
  for (const battleParticipant of battle.participants) {
    if (battleParticipant != participant) {
      for (const active of battleParticipant.Active) {
        if (active == null)
          continue;
        bodyMessage += renderStatus(active.data)
      }
    }
  }
  //Render the current player last
  for (const active of participant.Active) {
    if (active == null)
      continue;
    bodyMessage += renderStatus(active.data)
  }

  let actionGUI = new ActionFormData();
  actionGUI.title("Battle:Action Menu")
    .body(bodyMessage)
    .button({ translate: "cobblemon.battle.ui.fight" })
    .button({ translate: "cobblemon.battle.ui.switch" })
    .button({ translate: "cobblemon.battle.ui.capture" })
    .button({ translate: "cobblemon.battle.ui.run" });
  let response = await actionGUI.show(participant.Player!);
  switch (response.selection) {
    case undefined:
      return undefined;
    case 0:
      return (await showMoveGUI(request, participant)) || (await showActionGUI(request, participant, battle));
    case 1:
      return (await showSwitchGUI(request, participant)) || (await showActionGUI(request, participant, battle));
    case 2:
      participant.Player!.sendMessage({ translate: "cobblemon.battle.throw_pokeball_prompt" });
      return undefined
    case 3:
      participant.Player!.sendMessage({ translate: "cobblemon.battle.run_prompt" });
      return undefined;
    default:
      return undefined;
  }
}

async function showMoveGUI(request: RequestData, participant: BattleParticipant): Promise<BattleAction | undefined> {
  if (request.active === undefined) {
    console.warn("Cannot Use Moves: There is no Active Poekmon.");
    return undefined;
  }
  let moveGUI = new ActionFormData();
  moveGUI.title("Battle: Use Move");
  request.active[0].moves.forEach((x, i) => {
    moveGUI.button(renderMove(x.id, { pp: x.pp, maxPp: x.maxPP, extraPp: 0 }));
  })
  let response = await moveGUI.show(participant.Player!);
  if (response.selection === undefined) return undefined;
  return { action: BattleActions.useMove, target: String(response.selection + 1) }
}

async function showSwitchGUI(request: RequestData, participant: BattleParticipant): Promise<BattleAction | undefined> {
  let switchGUI = new ActionFormData();
  switchGUI.title("Battle: ")//request.active ? "Switch Into" : "Fainted! Switch Into");
  request.side.pokemon.forEach((x, i) => {
    let [pokemonName, uuid] = x.details.split(", ");
    let pokemon = participant.getTeamMemberViaUUID(uuid);
    switchGUI.button(renderPokemonName(pokemon!));
  });
  let response = await switchGUI.show(participant.Player!);
  if (response.selection === undefined) return undefined;
  return { action: BattleActions.switchOut, target: String(response.selection + 1) };
}
