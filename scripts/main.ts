/** This file should be used only for event bindings and such. */

import { Entity, GameMode, ItemStack, Player, system, world } from "@minecraft/server"
import scriptEventHandler from "./events";
import "./showdown/sim/global-types"
import { sendOutGUI, showStarterGUI } from "./GUI";
import { registerCustomComponents } from "./custom_components";
import { PokemonData } from "./Pokemon";
import { storePokemonInFirstSpace } from "./pokemonStorage";
import { handlePokeballCapture } from "./catching";
import WorldCleanup from "./Cleanup";
import { tryGetBattleFromEntity } from "./battle/Battle";
import { message } from "./language";


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
system.afterEvents.scriptEventReceive.subscribe(scriptEventHandler);

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

function dropPokeball(pokeball: Entity, player?: Player) {
  if (!(player?.getGameMode() === GameMode.creative))
    pokeball.dimension.spawnItem(new ItemStack(pokeball.typeId, 1), pokeball.location);
  pokeball.triggerEvent("cobblemon:instant_kill");
}

world.afterEvents.projectileHitEntity.subscribe(arg => {
  //Only run this code if it was initiated by a pokeball.
  if (!arg.projectile.getComponent("minecraft:type_family")?.hasTypeFamily("pokeball"))
    return;

  //Resolving Player, pokemon, and projectile
  let playerID = arg.projectile.getDynamicProperty("player_id");
  if (!(typeof playerID === "string"))
    return;

  let playerEntity = world.getEntity(playerID);
  if (!(playerEntity && playerEntity instanceof Player))
    return;
  let player = playerEntity as Player;

  let entityHit = arg.getEntityHit().entity;
  if (!(entityHit && entityHit.getComponent("minecraft:type_family")?.hasTypeFamily("pokemon")))
    return;

  let battle = tryGetBattleFromEntity(player);
  let entityBattle = tryGetBattleFromEntity(entityHit);

  if (battle && !entityBattle) {
    player.sendMessage(message.error({ translate: "cobblemon.capture.you_in_battle" }));
    return;
  }

  if ((!battle && entityBattle) || battle?.battleID !== entityBattle?.battleID) {
    player.sendMessage(message.error(message.With("cobblemon.capture.in_battle", [PokemonData.tryGetFromEntity(entityHit) || { translate: "cobblemon.ui.pokemon" }])));
    return;
  }

  //If pokemon is not wild
  if (entityHit.getDynamicProperty("onwer_name") || !entityHit.getProperty("cobblemon:wild")) {
    player.sendMessage(message.error(message.With("cobblemon.capture.not_wild", [PokemonData.tryGetFromEntity(entityHit) || { translate: "cobblemon.ui.pokemon" }])));
    return;
  }

  console.log("Entity Hit! " + entityHit.nameTag);
  //Prevent double hits
  if (arg.projectile.getDynamicProperty("activated")) {
    console.log("DoubleHit Prevented.");
    return;
  }

  if (entityHit.getProperty("cobblemon:busy") === true) {
    player.sendMessage(message.error(message.With("cobblemon.capture.busy", [PokemonData.tryGetFromEntity(entityHit) || { translate: "cobblemon.ui.pokemon" }])));
    dropPokeball(arg.projectile, player);
    return;
  }

  arg.projectile.setDynamicProperty("activated", true);
  entityHit.setProperty("cobblemon:busy", true);
  handlePokeballCapture(player, arg.projectile, entityHit);
})

world.afterEvents.projectileHitBlock.subscribe(arg => {
  //Only run this code if it was initiated by a pokeball.
  if (!arg.projectile.getComponent("minecraft:type_family")?.hasTypeFamily("pokeball"))
    return;
  //Do not despawn activated pokeball
  if (arg.projectile.getDynamicProperty("activated") || arg.projectile.getProperty("cobblemon:disabled"))
    return;
  dropPokeball(arg.projectile, (arg.source instanceof Player) ? arg.source : undefined);
})