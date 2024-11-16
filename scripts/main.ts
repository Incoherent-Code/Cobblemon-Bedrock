/** This file should be used only for event bindings and such. */

import { Entity, GameMode, ItemStack, Player, system, world } from "@minecraft/server"
import "./showdown/sim/global-types"
import { sendOutGUI, showStarterGUI } from "./GUI";
import { registerCustomComponents } from "./custom_components";
import { PokemonData } from "./Pokemon";
import { storePokemonInFirstSpace } from "./pokemonStorage";
import WorldCleanup from "./Cleanup";
import { message } from "./language";
import { bindCatchEvents } from "./catching";
import { scriptEventHandler } from "./events";


world.afterEvents.playerEmote.subscribe(async (arg) => {
  let player = arg.player;
  if (player.getDynamicProperty("team")) {
    sendOutGUI(player);
  }
  else {
    let choice = await showStarterGUI(player);
    if (choice === undefined)
      return;
    let pokemon = PokemonData.generateNewWildPokemon(choice, (Math.random() * 4096) <= 1 ? 1 : 0, 10);
    storePokemonInFirstSpace(pokemon, player);
  }
});

world.beforeEvents.worldInitialize.subscribe(registerCustomComponents);

//World cleanup stuff
world.afterEvents.worldInitialize.subscribe(WorldCleanup);
world.afterEvents.entityLoad.subscribe(arg => {
  let familyComponent = arg.entity.getComponent("minecraft:type_family");
  if (!familyComponent)
    return;

  //Prevents old pokeballs from being loaded in
  if (familyComponent.hasTypeFamily("pokeball") || familyComponent.hasTypeFamily("pokeball_dummy")) {
    arg.entity.triggerEvent("cobblemon:instant_kill");
  }

  //Prevents Shenanigans with duplicating pokemon by unloading them
  if (familyComponent.hasTypeFamily("pokemon") && arg.entity.getDynamicProperty("owner_name")) {
    arg.entity.triggerEvent("cobblemon:instant_kill");
  }
})

bindCatchEvents();

system.afterEvents.scriptEventReceive.subscribe(scriptEventHandler);