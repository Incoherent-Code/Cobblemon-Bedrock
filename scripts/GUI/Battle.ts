import { ActionFormData } from "@minecraft/server-ui";
import { RequestData } from "../battle/Request";
import { renderStatus, renderMove, renderPokemonName, message } from "../language";
import { ActionResponse, BattleActor, PokemonBattle } from "../battle";
import { Player } from "@minecraft/server";
import { MoveActionResponse, SwitchActionResponse } from "../battle/ActionResponse";
import { okDialog } from "./OKDialogBox";

export async function handleMoveRequest(request: RequestData, actor: BattleActor, battle: PokemonBattle): Promise<ActionResponse[] | undefined> {
  if (!(actor.actor instanceof Player)) throw new Error("Couldn't handle request: actor is not a player");
  let output: ActionResponse[] = [];
  for (let i = 0; i < battle.format.battleType.slotsPerActor; i++) {
    let response: ActionResponse | undefined;
    if (request.forceSwitch?.[i]) {
      response = await showSwitchGUI(request, actor, i);
    }
    else if (request.active && request.active[i]) {
      response = await showActionGUI(request, actor, i);
    }
    if (!response)
      return undefined;
    output.push(response);
    continue;
  }
  return output;
}

async function showActionGUI(request: RequestData, actor: BattleActor, activeIndex: number): Promise<ActionResponse | undefined> {
  let bodyMessage = "";
  for (const BattleActor of actor.battle.actors) {
    if (BattleActor != actor) {
      for (const active of BattleActor.activePokemon) {
        if (active == null)
          continue;
        bodyMessage += renderStatus(active.data)
      }
    }
  }
  //Render the current player last
  for (const active of actor.activePokemon) {
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
  let response = await actionGUI.show(actor.Player!);
  switch (response.selection) {
    case undefined:
      return undefined;
    case 0:
      return (await showMoveGUI(request, actor, activeIndex)) || (await showActionGUI(request, actor, activeIndex));
    case 1:
      return (await showSwitchGUI(request, actor, activeIndex)) || (await showActionGUI(request, actor, activeIndex));
    case 2:
      actor.Player!.sendMessage({ translate: "cobblemon.battle.throw_pokeball_prompt" });
      return undefined
    case 3:
      actor.Player!.sendMessage({ translate: "cobblemon.battle.run_prompt" });
      return undefined;
    default:
      return undefined;
  }
}

async function showMoveGUI(request: RequestData, actor: BattleActor, activeIndex: number): Promise<ActionResponse | undefined> {
  if (request.active === undefined) {
    console.warn("Cannot Use Moves: There is no Active Poekmon.");
    return undefined;
  }
  let moveGUI = new ActionFormData();
  moveGUI.title("Battle: Use Move");
  request.active[activeIndex].moves.forEach((x, i) => {
    moveGUI.button(renderMove(x.id, { pp: x.pp, maxPp: x.maxpp, extraPp: 0 }));
  })
  let response = await moveGUI.show(actor.Player!);
  if (response.selection === undefined) return undefined;
  return new MoveActionResponse(request.active[activeIndex].moves[response.selection].id);
}

async function showSwitchGUI(request: RequestData, actor: BattleActor, activeIndex: number): Promise<ActionResponse | undefined> {
  let switchGUI = new ActionFormData();
  switchGUI.title("Battle: ")//request.active ? "Switch Into" : "Fainted! Switch Into");
  request.side.pokemon.forEach((x, i) => {
    let [pokemonName, uuid] = x.details.split(", ");
    let pokemon = actor.pokemon.find(x => x.uuid == uuid)
    switchGUI.button(renderPokemonName(pokemon!));
  });
  let response = await switchGUI.show(actor.Player!);
  if (response.selection === undefined) return undefined;
  let chosen = request.side.pokemon[response.selection];
  let [pokemonName, uuid] = chosen.details.split(", ");
  let chosePokemon = actor.pokemon.find(x => x.uuid == uuid)!;
  if (chosePokemon.currentHealth == 0 || chosePokemon!.status == "fnt") {
    await okDialog(actor.Player!, message.With("cobblemon.battle.pokemon_already_fainted", [chosePokemon]));
    return await showSwitchGUI(request, actor, activeIndex);
  }
  else if (actor.activePokemon.some(x => x?.data.uuid == uuid)) {
    await okDialog(actor.Player!, message.With("cobblemon.battle.already_out", [chosePokemon]));
    return await showSwitchGUI(request, actor, activeIndex);
  }
  else {
    return new SwitchActionResponse(uuid);
  }
}