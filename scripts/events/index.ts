import { Entity, GameMode, ItemStack, Player, ScriptEventCommandMessageAfterEvent, world } from "@minecraft/server"
import { showPokemonGUI } from "../GUI";
import { PokemonData, setupCobblemon } from "../Pokemon";
import { battleMap, PokemonBattle, cleanUpStaleBattleData, BattleFormat, BattleSide, BattleActor, startWildBattle } from "../battle";
import { toID } from "../showdown/sim/dex-data";
import { registerDebugSettings } from "../debug/debugMain"
import { getSpeciesData } from "../speciesData";
import { storePokemonInFirstSpace } from "../pokemonStorage";
import handleChallenge from "../ChallengePlayer";
import { handlePokeballCapture } from "../catching";
import exchangeHeldItem from "./ExchangeHeldItem";
import handleInteractEvolution from "./InteractEvolution";
import handleGainLevelEvent from "./RareCandy";

export { CobblemonEvents } from "./CobblemonEvents";

export default function scriptEventHandler(event: ScriptEventCommandMessageAfterEvent) {
  if (!event.id.startsWith("cobblemon:"))
    return;

  if (scriptIDDictionary[event.id]) {
    scriptIDDictionary[event.id](event);
  }
  else {
    let warning = `§4ScriptEvent ${event.id} is invalid!`;
    if (event.sourceEntity && event.sourceEntity instanceof Player) {
      let player = event.sourceEntity as Player
      player.sendMessage(warning);
    }
  }
}

const scriptIDDictionary: { [key: string]: Function } = {
  "cobblemon:interacted": function (event: ScriptEventCommandMessageAfterEvent) {
    let player = event.sourceEntity!.dimension.getPlayers({ location: event.sourceEntity!.location, tags: ["interacter"], closest: 1 })[0]!
    player.removeTag("interacter");
    cleanUpStaleBattleData(player);
    cleanUpStaleBattleData(event.sourceEntity!);
    if (event.sourceEntity!.getDynamicProperty("owner_name") === player.name) {
      if (player.isSneaking) {
        exchangeHeldItem(player, event.sourceEntity!);
      }
      else {
        showPokemonGUI(event.sourceEntity!, player)
      }
    }
    //If starting a battle
    else if (event.sourceEntity!.getProperty("cobblemon:wild") === true) {
      if (event.sourceEntity!.getDynamicProperty("in_battle") && event.sourceEntity!.getDynamicProperty("in_battle") === player.getDynamicProperty("in_battle")) {
        let battle = battleMap.get(player.getDynamicProperty("in_battle") as string);
        if (battle) {
          let actor = battle.getActorFromID(player.id);
          actor?.promptPlayerForRequest();
        }
      }
      else if (!event.sourceEntity!.getDynamicProperty("in_battle") && !player.getDynamicProperty("in_battle") && player.getDynamicProperty("initialized")) {
        startWildBattle(player, event.sourceEntity!);
      }
    }
  },
  //Deprecated for an ProjectileHitEntity Event
  "cobblemon:pokeball_catching": function (event: ScriptEventCommandMessageAfterEvent) {
    return;
    let dimension = event.sourceEntity!.dimension
    let player = dimension.getPlayers({ location: event.sourceEntity!.location, closest: 1, name: String(event.sourceEntity?.getDynamicProperty("player")!) })[0]!
    let entityCaught = dimension.getEntities({ location: event.sourceEntity!.location, closest: 1, families: ["pokemon"], maxDistance: 2 })[0]!;
    if (!entityCaught || entityCaught.getProperty("cobblemon:busy")) {
      if (player.getGameMode() != GameMode.creative)
        dimension.spawnItem(new ItemStack(event.sourceEntity!.typeId, 1), event.sourceEntity!.location);
      event.sourceEntity?.triggerEvent("cobblemon:instant_kill");
      return;
    }
    if (player && entityCaught && typeof entityCaught.getDynamicProperty("data") === "string") {
      entityCaught.setProperty("cobblemon:busy", true);
      handlePokeballCapture(player, event.sourceEntity!, entityCaught);
    }
    else {
      event.sourceEntity?.triggerEvent("cobblemon:instant_kill");
    }
  },
  "cobblemon:setup": function (event: ScriptEventCommandMessageAfterEvent) {
    if (event.sourceEntity!.getProperty("cobblemon:initialized") === true)
      return;
    setupCobblemon(event.sourceEntity!)
  },
  "cobblemon:pokeball_thrown": function (event: ScriptEventCommandMessageAfterEvent) {
    let player = event.sourceEntity!.dimension.getPlayers({ location: event.sourceEntity!.location, closest: 1 })[0]!
    event.sourceEntity!.setDynamicProperty("player_id", player.id);
  },
  "cobblemon:debug_setup": function () {
    registerDebugSettings();
  },
  "cobblemon:give_pokemon_to_self": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!event.sourceEntity || !(event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    let messageArray = event.message.split(" ");
    if (!event.message || messageArray.length < 1 || messageArray.length > 3) {
      player.sendMessage("§c Syntax: command <species> <level?> <variant?>");
      return;
    }
    let species = toID(messageArray[0]);
    let speciesData = getSpeciesData(species); //Make sure that data is accessible
    if (!speciesData) {
      player.sendMessage("§c Not Valid Cobblemon");
    }
    let level: number | undefined = undefined;
    if (messageArray.length >= 2 && !isNaN(parseInt(messageArray[1]))) {
      level = parseInt(messageArray[1]);
    }
    let variant = 0;
    if (messageArray.length >= 3 && !isNaN(parseInt(messageArray[1]))) {
      variant = parseInt(messageArray[2]);
    }
    let pokemon = PokemonData.generateNewWildPokemon(species, variant, level);
    storePokemonInFirstSpace(pokemon, player);
  },
  "cobblemon:recieve_challenge": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!event.sourceEntity || !(event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    let [challenger] = player.dimension.getEntities({ tags: ["challenger"], closest: 1, location: player.location });
    if (challenger === undefined || !(challenger instanceof Player))
      return;
    challenger.removeTag("challenger");
    handleChallenge(challenger, player);
  },
  "cobblemon:interact_evolution": handleInteractEvolution,
  "cobblemon:gain_level": handleGainLevelEvent
}

