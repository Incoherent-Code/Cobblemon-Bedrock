import { RawMessage, system, Vector3 } from "@minecraft/server";
import { ActorType, BattleActor } from "./BattleActor";
import { BattleMessage, Effect, EffectType } from "./BattleMessage";
import { PokemonBattle } from "./PokemonBattle";
import { ColorCodes, getMoveTranslation, message as messages } from "../language";
import { battleMap } from "./PokemonBattle";
import { RequestData } from "./Request";
import { GoDispatch, WaitDispatch } from "./Dispatcher";
import { CobblemonEvents } from "../events";
import { calculateExpGain } from "../Experience";
import { ActivePokemon } from ".";
import { Vector3Utils, Vector3Builder } from "@minecraft/math";
import { substringAfter, toDimensionLocation, toID, toIdentifier } from "../utils";
import { ElementalType, PersistentStatuses, PokemonData, StatusEffect } from "../Pokemon";
import DamageTakenRequirement from "../evolution/requirements/DamageTakenRequirement";
import { EvolutionProgress, getEvolutionProgress, setEvolutionProgress } from "../evolution";
import UseMoveRequirement from "../evolution/requirements/UseMoveRequirement";
import DefeatRequirement from "../evolution/requirements/DefeatRequirement";
import { Dex } from "../showdown/sim";
import BattleCriticalHitsRequirement from "../evolution/requirements/BattleCriticalHitsRequirement";
import RecoilRequirement from "../evolution/requirements/RecoilRequirement";
import { battleMsg } from "../language/MessageHelperFunctions";

/** <UUID of Battle, Last Used Ability, activate, etc> */
const lastCauser = new Map<string, BattleMessage>();

export function interpretMessage(battleId: string, message: string) {
  //Ignore winner summary
  if (message.startsWith(`{"winner":`))
    return;

  let battle = battleMap.get(battleId);
  if (!battle) {
    console.log("No battle could be found with the id: " + battleId);
    return
  }

  battle.showdownMessages.push(message);
  interpret(battle, message);
}

export function interpret(battle: PokemonBattle, rawMessage: string) {
  battle.log();
  battle.log(rawMessage);
  battle.log();
  try {
    let lines = rawMessage.split("\n");
    if (lines[0] == "update") {
      lines.shift();
      while (lines.length > 0) {
        let line = lines.shift()!;

        if (line.startsWith("|split|")) {
          let showdownID = line.split("|split|")[1];
          let targetActor = battle.getActorFromShowdownID(showdownID);

          if (!targetActor) {
            battle.log("No actor could be found with the showdown id: " + showdownID);
            return;
          }

          let privateMessage = lines[0];
          let publicMessage = lines[1];

          for (let instruction of Object.entries(splitUpdateInstructions)) {
            if (lines[0].startsWith(`|${instruction[0]}|`)) {
              instruction[1](battle, targetActor, new BattleMessage(publicMessage), new BattleMessage(privateMessage));
              break;
            }
          }
          lines.shift();
          lines.shift();
        }
        else {
          if (line != "|") {
            let message = new BattleMessage(line);
            let instruction = updateInstructions[message.id]
            if (instruction != undefined)
              instruction(battle, message, lines);
            else {
              battle.dispatcher.dispatchGo(() => battle.broadcastChatMessage({ text: line }))
            }
          }
        }
      }
    }
    else if (lines[0] == "sideupdate") {
      let showdownID = lines[1];
      let targetActor = battle.getActorFromShowdownID(showdownID);
      let line = lines[2];

      if (targetActor == undefined) {
        battle.log("No actor could be found with the showdown id: " + showdownID);
        return;
      }

      for (let instruction of Object.entries(sideUpdateInstructions)) {
        if (line.startsWith(`|${instruction[0]}|`)) {
          instruction[1](battle, targetActor, new BattleMessage(line));
        }
      }
    }
  }
  catch (e) {
    console.error("BattleInterpreter Error: ");
    console.error(e);
  }
}

//Instruction Objects

const updateInstructions: { [key: string]: (battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) => void } = {
  "turn": handleTurnInstruction,
  "upkeep": handleUpkeepInstruction,
  "faint": handleFaintInstruction,
  "win": handleWinInstruction,
  "pp_update": handlePpUpdateInstruction,
  "cant": handleCantInstruction,
  "move": handleMoveInstruction,
  "bagitem": handleBagItemInstruction,
  "detailschange": handleDetailsChangeInstruction,
  "-transform": handleTransformInstruction,
  "-status": handleStatusInstruction,
  "-curestatus": handleCureStatusInstruction,
  "-weather": handleWeatherInstruction,
  "-fieldstart": handleFieldStartInstruction,
  "-fieldend": handleFieldEndInstruction,
  "-fieldactivate": handleFieldActivateInstruction,
  "-start": handleStartInstruction,
  "-end": handleEndInstruction,
  "-sidestart": handleSideStartInstruction,
  "-sideend": handleSideEndInstruction,
  "-crit": handleCritInstruction,
  "-fail": handleFailInstruction,
  "-block": handleBlockInstruction,
  "-prepare": handlePrepareInstruction,
  "-mustrecharge": handleRechargeInstructions,
  "-resisted": handleResistInstruction,
  "-immune": handleImmuneInstruction,
  "-miss": handleMissInstruction,
  "-nothing": (battle, _, _2) => battle.broadcastChatMessage(battleMsg("nothing")),
  "-supereffective": handleSuperEffectiveInstruction,
  "-boost": (battle, message, lines) => handleBoostInstruction(battle, message, lines, true),
  "-unboost": (battle, message, lines) => handleBoostInstruction(battle, message, lines, false),
  "-swapboost": handleSwapBoostInstruction,
  "-copyboost": handleCopyBoostInstruction,
  "-invertboost": handleInvertBoostInstruction,
  "-clearallboost": handleClearAllBoostInstruction,
  "-clearallnegativeboost": handleClearNegativeBoostInstruction,
  "-singleturn": handleSingleTurnInstruction,
  "-singlemove": handleSingleMoveInstruction,
  "-hitcount": handleHitCountInstruction,
  "-activate": handleActivateInstruction,
  "-item": handleItemInstruction,
  "-enditem": handleEndItemInstruction,
  "-ability": handleAbilityInstruction,
  "-endability": handleEndAbilityInstruction,
  "-zpower": handleZPowerInstruction,
  "-zbroken": handleZBrokenInstruction,
  "-terastralize": handleTerastrallizeInstruction,
  "-mega": handleMegaInstruction,
  "player": () => { },
  "rated": () => { },
  "t:": () => { },
  "teamsize": () => { },
  "gametype": (battle, message) => battle.log(`Game Type Instruction: ${message.rawMessage}`),
  "gen": (battle, message) => battle.log(`Gen Instruction: ${message.rawMessage}`),
  "tier": (battle, message) => battle.log(`Tier Instruction: ${message.rawMessage}`),
  //Unnecessary team preview stuff
  "clearpoke": (battle, message) => battle.log(`Clear Poke Instruction: ${message.rawMessage}`),
  "poke": (battle, message) => battle.log(`Poke Instruction: ${message.rawMessage}`),
  "teampreview": (battle, message) => battle.log(`Team Preview Instruction: ${message.rawMessage}`),
  "start": (battle, message) => battle.log(`Start Instruction: ${message.rawMessage}`)
};

const sideUpdateInstructions: { [key: string]: (battle: PokemonBattle, actor: BattleActor, message: BattleMessage) => void } = {
  "request": handleRequestInstruction,
  "error": handleErrorInstruction
};

const splitUpdateInstructions: { [key: string]: (battle: PokemonBattle, actor: BattleActor, message: BattleMessage, message2: BattleMessage) => void } = {
  "switch": handleSwitchInstruction,
  "drag": handleDragInstruction,
  "-damage": handleDamageInstruction,
  "-heal": handleHealInstruction,
  "-sethp": handleSetHPInstruction,
};

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

/** Used for translation key
 * Recommended to use || "accuracy" after this
 */
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

const severityNames = {
  0: "cap.single",
  1: "slight",
  2: "sharp",
  3: "severe"
}

//Instruction Functions

function handleBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[], isBoost: boolean) {
  let pokemon = message.getBattlePokemon(0, battle);
  let statKey = message.argumentAt(1);
  let stages = parseInt(message.argumentAt(2)!);
  if (!pokemon || !statKey || Number.isNaN(stages))
    return;
  let statName: RawMessage = { translate: `cobblemon.stat.${statNames[statKey]}.name` };
  let severity = severityNames[stages] || "severe";
  let rootKey = (isBoost) ? "boost" : "unboost";

  if (stages === 0) {
    let othersExist = remainingLines.filter(it => {
      let isAlsoBoost = it.startsWith("|-" + rootKey);
      return isAlsoBoost && it.split("|")[2] == message.rawMessage.split("|")[2] && it.split("|")[4] == "0";
    })
    if (othersExist.length > 0) {
      battle.dispatcher.dispatchGo(() => battle.broadcastChatMessage({ translate: `cobblemon.battle.${rootKey}.cap.multiple` }));
      return;
    }
  }

  battle.dispatcher.dispatchWaiting(1.5, () => {
    let lang: RawMessage = (message.hasOptionalArgument("zeffect"))
      ? messages.With(`cobblemon.battle.${rootKey}.${severity}.zeffect`, [pokemon.data, statName])
      : messages.With(`cobblemon.battle.${rootKey}.${severity}`, [pokemon.data, statName])
    battle.broadcastChatMessage(lang);

    //TODO: Whatever the context manager is necessary for
    battle.minorBattleActions.set(pokemon.data.uuid, message);

  })
}

function handleTurnInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  if (!battle.started) {
    battle.started = true;
    battle.actors.filter(actor => actor.type == ActorType.PLAYER).forEach(actor => {
      actor.updateMusic();
    })
    battle.actors.forEach(actor => {
      actor.syncOutPokemon();
    })
    battle.dispatcher.dispatch(() => {
      return { canProceed: () => !battle.side1.stillSendingOut() && !battle.side2.stillSendingOut() }
    })
    battle.dispatcher.dispatchGo(() => {
      battle.side1.playCries()
      system.runTimeout(() => battle.side2.playCries(), 20);
    })
  }
  let turnNumber = parseInt(message.argumentAt(0)!);
  if (Number.isNaN(turnNumber))
    return;

  battle.dispatcher.dispatch(() => {
    battle.actors.forEach(actor => { actor.mustChoose = true; actor.promptPlayerForRequest() });
    battle.broadcastChatMessage(messages.prefix(ColorCodes.Aqua, messages.With("cobblemon.battle.turn", [turnNumber.toString()])));
    battle.newTurn(turnNumber);
    return GoDispatch
  })
}

function handleUpkeepInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => battle.actors.forEach(x => x.upkeep()))
}

function handleFaintInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let posAndUUID = message.showdownPositionAndUUID(0);
  if (!posAndUUID)
    return;

  let pokemon = message.getBattlePokemon(0, battle);
  if (!pokemon)
    return;

  battle.dispatcher.dispatchWaiting(2.5, () => {
    pokemon.data.currentHealth = 0;
    pokemon.data.status = StatusEffect.Faint;
    pokemon.syncWithOut();

    battle.broadcastChatMessage(messages.error(messages.With("cobblemon.battle.fainted", [pokemon.data])));
    CobblemonEvents.emit("BATTLE_FAINTED", battle, pokemon);

    //EXP GAIN
    pokemon.actor.getSide().getOppositeSide().actors.forEach(actor => {
      if (actor.showdownId == pokemon.actor.showdownId || actor.type != ActorType.PLAYER)
        return;
      let fainting = pokemon;
      let expGainingPokemon = actor.pokemon.filter(x => (fainting?.seenPokemon.includes(x.uuid) || (x.item == "expshare")) && x.status != "fnt");
      expGainingPokemon.forEach(y => {
        let multiplier = (fainting!.seenPokemon.includes(y.uuid)) ? 1 : 0.5;
        let expGain = calculateExpGain(y, fainting!.data, multiplier);
        if (expGain > 0) {
          y.gainExp(expGain, y.tryGetOwner());
        }

        y.getEvolutions()
          .flatMap(x => x.requirements.filter(x => x instanceof DefeatRequirement).map(y => Object.assign(y, { id: x.id })))
          .forEach(z => {
            if (z.target.match(pokemon.data)) {
              let progress = getEvolutionProgress<number>(y, z.id, "defeat") || 0;
              setEvolutionProgress(y, z.id, "defeat", progress + 1);
            }
          })

        y.updatePokemonInTeam();
        y.tryUpdatePokemonOut();
      })
    })

    let activeIndex = pokemon.actor.activePokemon.findIndex(x => x?.data.uuid == posAndUUID[1]);
    if (activeIndex != -1)
      pokemon.actor.activePokemon[activeIndex] = null;

    //Stop being followed by that species if it is out
    let otherSide = pokemon.actor.getSide().getOppositeSide();
    let sameSpeciesOut = pokemon.actor.getSide().getActivePokemon().some(x => x?.entity.typeId === pokemon.entity.typeId);
    let tag = `targetedBy:` + pokemon.entity.typeId
    if (!sameSpeciesOut) {
      otherSide.getActivePokemon().forEach(x => {
        if (x?.entity.hasTag(tag))
          x.entity.removeTag(tag);
      })
    }

    battle.majorBattleActions.set(posAndUUID[1], message);
  })
}

function handleBagItemInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let pokemon = message.pokemonByUuid(0, battle)!;
    let item = message.argumentAt(1);
    let ownerName = pokemon.tryGetOwner()?.name || "trainer";
    //TODO: Item Translation
    let itemName = "item";

    battle.broadcastChatMessage(battleMsg("bagitem.use", [ownerName, itemName, pokemon.getTranslatedName()]));
  })
}

function handleWinInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let user = message.argumentAt(0);
    if (!user)
      return;

    let ids = user.split("&").map(x => x.trim());
    let winnners = ids.map(x => battle.getActorFromID(x)).filter(x => x != undefined);
    let losers = battle.actors.filter(x => !winnners.some(y => y.actor.id == x.actor.id))
    let winnersText: RawMessage = { rawtext: winnners.map(x => x.getName()) };
    let winMessage = messages.prefix(ColorCodes.Gold, messages.With("cobblemon.battle.win", [winnersText]));
    battle.broadcastChatMessage(winMessage);

    battle.end();
    CobblemonEvents.emit("BATTLE_VICTORY", battle, winnners, losers, false);
  })
}

function handleStatusInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let posAndUUID = message.showdownPositionAndUUID(0);
  let pokemon = message.getBattlePokemon(0, battle);
  let statusLabel = message.argumentAt(1);
  if (!posAndUUID || !pokemon || !statusLabel)
    return;
  broadcastOptionalAbility(battle, message.effect(), pokemon.data.getTranslatedName());
  battle.dispatcher.dispatchWaiting(1, () => {
    //Persistent status
    if (PersistentStatuses.includes(statusLabel)) {
      pokemon.data.status = (statusLabel as StatusEffect);
      pokemon.syncWithOut();
    }

    battle.broadcastChatMessage(messages.With(`cobblemon.status.${statusNames[statusLabel]}.apply`, [pokemon.data.getTranslatedName()]));
    battle.minorBattleActions.set(pokemon.data.uuid, message);

  })
}

function handleMissInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage(messages.color("Red", battleMsg("missed")));
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleImmuneInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage(messages.color("Red", battleMsg("immune", [pokemon.data.getTranslatedName()])));
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleInvertBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let name = pokemon.data.getTranslatedName();
    battle.broadcastChatMessage(battleMsg("invertboost", [name]))
  })
}

function handleMoveInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let userPokemon = message.getBattlePokemon(0, battle);
  let targetPokemon = message.getBattlePokemon(2, battle);
  let effect = message.effectAt(1);
  if (!userPokemon || !effect)
    return;
  let optionalEffect = message.effect();
  let move = Dex.moves.get(effect.id);
  let pokemonName = userPokemon.data.getTranslatedName();
  broadcastOptionalAbility(battle, optionalEffect, pokemonName);

  battle.dispatcher.dispatchGo(() => {
    lastCauser.set(battle.battleId, message);

    userPokemon.data.getEvolutions().forEach(x => {
      if (x.requirements.some(x => x instanceof UseMoveRequirement)) {
        let progress = getEvolutionProgress<number>(userPokemon.data, x.id, "use_move") || 0;
        setEvolutionProgress(userPokemon.data, x.id, "use_move", 0);
      }
    })

    let msg = (() => {
      if (optionalEffect?.id == "magicbounce")
        return battleMsg("ability.magicbounce", [pokemonName, getMoveTranslation(effect.id)]);
      else if (move.name != "struggle" && targetPokemon && targetPokemon.data.uuid != userPokemon.data.uuid)
        return battleMsg("used_move_on", [pokemonName, getMoveTranslation(effect.id), targetPokemon.data])
      else
        return battleMsg("used_move", [pokemonName, getMoveTranslation(effect.id)])
    })();
    battle.broadcastChatMessage(msg);
    battle.majorBattleActions.set(userPokemon.data.uuid, message);
  })
}

function handleCantInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    let effectId = message.effectAt(1)?.id;
    if (!pokemon || !effectId)
      return;
    let name = pokemon.data.getTranslatedName();
    let move = message.moveAt(2);
    if (!move) {
      //This is literally so common. For example: Sleep effects
      //console.warn(`Unrecognized move ${message.argumentAt(2)}`);
    }
    let moveName = (move) ? getMoveTranslation(move.id) : messages.toMessage(`(Unrecognized: ${message.argumentAt(2)})`);
    let msg = (() => {
      switch (effectId) {
        case "armortail":
        case "damp":
        case "dazzling":
        case "queenlymajesty":
          return battleMsg("cant.generic", [name, moveName]);
        case "par":
        case "slp":
        case "frz":
          return messages.With(`cobblemon.status.${statusNames[effectId]}.is`, [name]);
        default:
          return battleMsg(`cant.${effectId}`, [name, moveName]);
      }
    })();

    battle.broadcastChatMessage(messages.prefix(ColorCodes.Red, msg));
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleResistInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage({ translate: "cobblemon.battle.resisted" });
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handlePpUpdateInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let pokemon = message.getPokemon(0, battle);
    if (!pokemon)
      return;

    let moveDatum = message.argumentAt(1)?.split(", ");
    if (moveDatum === undefined)
      return;

    moveDatum.forEach(moveData => {
      let [moveId, movePp] = moveData.split(": ");
      let moveIndex = pokemon.moves.findIndex(x => x.toLowerCase() == moveId.toLowerCase());
      if (moveIndex == -1)
        return;
      let moveInfo = pokemon.movesInfo[moveIndex];
      moveInfo.pp = parseInt(movePp);
    })
  })
}

function handleSuperEffectiveInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage(messages.translate("cobblemon.battle.superEffective"))
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleCritInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage(messages.color("Yellow", { translate: "cobblemon.battle.crit" }));
    let lastCause = lastCauser.get(battle.battleId);
    let battlePokemon = message.getBattlePokemon(0, battle);
    if (lastCause && battlePokemon) {
      pokemon.data.getEvolutions().filter(x => x instanceof BattleCriticalHitsRequirement).forEach(x => {
        let progress = getEvolutionProgress<number>(pokemon.data, x.id, "battle_critical_hits") || 0;
        setEvolutionProgress(pokemon.data, x.id, "battle_critical_hits", progress + 1);
      })
    }
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleWeatherInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let weather = message.effectAt(0)?.id;
  let user = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKNOWN" };
  broadcastOptionalAbility(battle, message.effect(), user);

  battle.dispatcher.dispatchWaiting(1.5, () => {
    let msg = (() => {
      if (message.hasOptionalArgument("upkeep"))
        return battleMsg(`weather.${weather}.upkeep`)
      else if (weather != "none") {
        return battleMsg(`weather.${weather}.start`)
      }
      else {
        return battleMsg(`weather.${weather}.end`);
      }
    })();
    battle.broadcastChatMessage(msg);
  })
}

function handleFailInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();
    let effectID = message.effectAt(1)?.id;

    let msg = (() => {
      switch (effectID) {
        case undefined:
        case "burnup":
        case "doubleshock":
          return battleMsg("fail");
        case "shedtail":
          return battleMsg("fail.substitute", [pokemonName]);
        case "hyperspacefurry":
        case "aurawheel":
          return battleMsg("fail.darkvoid", [pokemonName]);
        case "corrosivegas":
          return battleMsg("fail.healblock", [pokemonName]);
        case "dynamax":
          return battleMsg("fail.grassknot", [pokemonName]);
        case "unboost":
          let statkey = message.argumentAt(2);
          if (!statkey)
            return battleMsg(`fail.${effectID}`, [pokemonName])
          let stat: RawMessage = { translate: `cobblemon.stat.${statNames[statkey]}.name` };
          return battleMsg(`fail.${effectID}.single`, [pokemonName, stat]);
        default:
          return battleMsg(`fail.${effectID}`, [pokemonName]);
      }
    })();
    battle.broadcastChatMessage(messages.color("Red", msg));
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleRechargeInstructions(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    battle.broadcastChatMessage(battleMsg("recharge", [pokemon.data.getTranslatedName()]));
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleCureStatusInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let maybeActivePokemon = message.actorAndActivePokemon(0, battle)?.[1];
  let maybePartyPokemon = message.getBattlePokemon(0, battle);
  let pokemon = maybeActivePokemon || maybePartyPokemon;
  if (!pokemon)
    return;
  let pokemonName = pokemon.data.getTranslatedName();
  let status = message.argumentAt(1);
  if (!status)
    return;
  let effect = message.effect();
  broadcastOptionalAbility(battle, effect, pokemonName);

  battle.dispatcher.dispatchWaiting(1, () => {
    pokemon.data.status = undefined;
    pokemon.syncWithOut();

    let msg: RawMessage;
    if (effect?.type == EffectType.ABILITY)
      msg = battleMsg(`curestatus.${effect.id}`, [pokemonName]);
    else
      msg = messages.With(`cobblemon.status.${statusNames[status]}.cure`, [pokemonName]);

    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleStartInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatch(() => {
    let pokemon = message.getBattlePokemon(0, battle);
    let effectID = message.effectAt(1)?.id;
    if (!pokemon || !effectID)
      return GoDispatch;

    let optionalEffect = message.effect();
    let optionalPokemon = message.getSourceBattlePokemon(battle);
    let optionalPokemonName = optionalPokemon?.data.getTranslatedName();
    let extraEffect = message.effectAt(2)?.typelessData || "UNKOWN";

    battle.minorBattleActions.set(pokemon.data.uuid, message);

    if (!message.hasOptionalArgument("silent")) {
      let msg = (() => {
        if (optionalEffect?.id == "reflecttype" && optionalPokemonName)
          return battleMsg("start.reflecttype", [pokemon.data, optionalPokemonName]);
        switch (effectID) {
          case "confusion":
          case "perish3":
            return undefined;
          case "perish2":
          case "perish1":
          case "perish0":
          case "stockpile1":
          case "stockpile2":
          case "stockpile3":
            return battleMsg(`start.${effectID.substring(0, effectID.length - 1)}`, [pokemon.data, effectID[effectID.length - 1]]);
          case "dynamax":
            return messages.color("Yellow", battleMsg(`start.${message.effectAt(2)?.id || effectID}`, [pokemon.data]));
          case "curse":
            return battleMsg("start.curse", [optionalPokemonName!, pokemon.data.getTranslatedName()]);
          default:
            return battleMsg(`start.${effectID}`, [pokemon.data, extraEffect]);
        }
      })();
      if (!msg)
        return GoDispatch;
      battle.broadcastChatMessage(msg);
    }

    return new WaitDispatch(1);
  })
}

function handleSingleTurnInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();
    let sourceName = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKOWN" };
    let effectID = message.effectAt(1)?.id;
    if (!effectID)
      return;
    let msg = battleMsg(`singleturn.${effectID}`, [pokemonName, sourceName]);
    battle.broadcastChatMessage(msg);
  })
}

function handleTransformInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle)?.data;
    let pokemonName = pokemon?.getTranslatedName();
    let targetPokemonName = message.getPokemon(1, battle)?.getTranslatedName();
    if (!pokemon || !pokemonName || !targetPokemonName)
      return;

    let msg = battleMsg("transform", [pokemonName, targetPokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokemon.uuid, message);
  })
}

function handleSingleMoveInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();
    let effectID = message.effectAt(1)?.id;
    if (!effectID)
      return;
    let msg = battleMsg(`singlemove.${effectID}`, [pokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleEndAbilityInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();

    let msg = battleMsg(`endability`, [pokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleBlockInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();
    let effectID = message.effectAt(1)?.id;
    if (!effectID)
      return;
    let msg = battleMsg(`block.${effectID}`, [pokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokemon.data.uuid, message);
  })
}

function handleActivateInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokemon = message.getBattlePokemon(0, battle);
    if (!pokemon)
      return;
    let pokemonName = pokemon.data.getTranslatedName();
    let sourceName = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKOWN" };
    let effect = message.effectAt(1);
    if (!effect)
      return;
    let extraEffect = message.effectAt(2)?.typelessData || "UNKOWN";
    broadcastOptionalAbility(battle, effect, pokemonName);

    battle.dispatcher.dispatch(() => {
      lastCauser.set(battle.battleId, message);
      battle.minorBattleActions.set(pokemon.data.uuid, message);

      let lang = (() => {
        switch (effect.id) {
          case "magnitude":
            return battleMsg("activate.magnitude", [message.argumentAt(2) || "1"]);
          case "spite":
          case "eeriespell":
            return battleMsg("activate.spite", [pokemonName, extraEffect, message.argumentAt(3)!])
          case "toxicdebris":
          case "shedskin":
            return undefined;
          case "destinybond":
            battle.activePokemon.map(x => x?.data.uuid).filter(x => x != undefined).forEach(x => battle.minorBattleActions.set(x, message));
            return battleMsg("activate.destinybond", [pokemonName]);
          case "focussash":
          case "focusband":
            return battleMsg("activate.focusband", [pokemonName, effect.typelessData]);
          case "maxguard":
          case "protect":
            return battleMsg("activate.protect", [pokemonName]);
          case "shadowforce":
          case "hyperspacefury":
          case "hyperspacehole":
            return battleMsg("activate.phantomforce", [pokemonName]);
          default:
            return battleMsg(`activate.${effect.id}`, [pokemonName, sourceName, extraEffect])
        }
      })();
      if (!lang)
        return GoDispatch;
      battle.broadcastChatMessage(lang);
      return new WaitDispatch(1);
    })
  })
}

function handleFieldStartInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let sourceName = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKOWN" };
  let effect = message.effectAt(0);
  if (!effect)
    return;
  broadcastOptionalAbility(battle, effect, sourceName);

  battle.dispatcher.dispatchWaiting(1.5, () => {
    let msg = battleMsg(`fieldstart.${effect.id}`, [sourceName]);
    battle.broadcastChatMessage(msg);
  })
}

function handleFieldEndInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let effectID = message.effectAt(0);
    if (!effectID)
      return;
    let msg = battleMsg(`fieldend.${effectID.id}`);
    battle.broadcastChatMessage(msg);
  })
}

function handleFieldActivateInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2.5, () => {
    let effectID = message.effectAt(0)?.id;
    if (!effectID)
      return;
    let msg = battleMsg(`fieldactivate.${effectID}`);
    battle.broadcastChatMessage(messages.color("Red", msg));
  })
}

function handleAbilityInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let pokemon = message.getBattlePokemon(0, battle);
  if (!pokemon)
    return;
  let pokemonName = pokemon.data.getTranslatedName();
  let effect = message.effectAt(1);
  if (!effect)
    return;
  let optionalEffect = message.effect();
  let optionalPokemon = message.getSourceBattlePokemon(battle);
  let optionalPokemonName = optionalPokemon?.data.getTranslatedName();


  battle.dispatcher.dispatch(() => {
    lastCauser.set(battle.battleId, message);
    battle.minorBattleActions.set(pokemon.data.uuid, message);

    if (optionalEffect)
      broadcastAbility(battle, optionalEffect, pokemonName);
    else
      broadcastAbility(battle, effect, pokemonName);

    let lang = (() => {
      if (optionalEffect?.id == "trace")
        return (optionalPokemonName) ? battleMsg("ability.trace", [pokemonName, optionalPokemonName, effect.typelessData]) : undefined;
      if (optionalEffect?.id == "reciever" || optionalEffect?.id == "powerofalchemy")
        return (optionalPokemonName) ? battleMsg("ability.reciever", [optionalPokemonName, effect.typelessData]) : undefined;
      switch (effect.id) {
        case "sturdy":
        case "unnerve":
        case "anticipation":
          return battleMsg(`ability.${effect.id}`, [pokemonName]);
        case "airlock":
        case "cloudnine":
          return battleMsg("ability.airlock");
      }
      return undefined;
    })();
    if (lang) {
      battle.broadcastChatMessage(lang);
      return new WaitDispatch(1);
    }
    return GoDispatch;
  })
}

function broadcastOptionalAbility(battle: PokemonBattle, effect: Effect | undefined, pokemonName: RawMessage) {
  if (effect && effect.type == EffectType.ABILITY)
    broadcastAbility(battle, effect, pokemonName);
}

function broadcastAbility(battle: PokemonBattle, effect: Effect, pokemonName: RawMessage) {
  battle.dispatcher.dispatchGo(() => {
    let msg = messages.prefix(ColorCodes.Yellow, messages.With("cobblemon.battle.ability.generic", [pokemonName, effect.typelessData]));
    battle.broadcastChatMessage(msg);
  })
}

function handlePrepareInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let pokmeon = message.getBattlePokemon(0, battle);
    if (!pokmeon)
      return;
    let pokemonName = pokmeon.data.getTranslatedName();
    let effectID = message.effectAt(1)?.id;
    if (!effectID)
      return;
    let msg: RawMessage;
    if (effectID == "shadowforce")
      msg = battleMsg("prepare.phantomforce", [pokemonName]);
    else if (effectID == "solarblade")
      msg = battleMsg("prepare.solarbeam", [pokemonName]);
    else
      msg = battleMsg("prepare." + effectID, [pokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokmeon.data.uuid, message);
  })
}

function handleSwapBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2, () => {
    let pokmeon = message.getBattlePokemon(0, battle);
    if (!pokmeon)
      return;
    let pokemonName = pokmeon.data.getTranslatedName();
    let targetPokemon = message.getBattlePokemon(1, battle);
    if (!targetPokemon)
      return;
    let targetPokemonName = targetPokemon.data.getTranslatedName();
    let effectID = message.effect()?.id;
    if (!effectID)
      return;
    let msg: RawMessage;
    if (["guardswap", "powerswap", "heartswap"].includes(effectID))
      msg = battleMsg(`swapboost.${effectID}`, [pokemonName])
    else
      msg = battleMsg(`swapboost.generic`, [pokemonName, targetPokemonName])
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokmeon.data.uuid, message);
  })
}

function handleCopyBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1, () => {
    let pokmeon = message.getBattlePokemon(0, battle);
    if (!pokmeon)
      return;
    let pokemonName = pokmeon.data.getTranslatedName();
    let targetPokemon = message.getBattlePokemon(1, battle);
    if (!targetPokemon)
      return;
    let targetPokemonName = targetPokemon.data.getTranslatedName();
    let effectID = message.effect()?.id;
    if (!effectID)
      return;
    let msg: RawMessage = battleMsg("copyboost.generic", [pokemonName, targetPokemonName]);
    battle.broadcastChatMessage(msg);
    battle.minorBattleActions.set(pokmeon.data.uuid, message);
  })
}

function handleEndInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2, () => {
    let pokmeon = message.getBattlePokemon(0, battle);
    if (!pokmeon)
      return;
    let pokemonName = pokmeon.data.getTranslatedName();
    let effectID = message.effectAt(1)?.id;
    if (!effectID)
      return;
    if (!message.hasOptionalArgument("silent")) {
      let msg: RawMessage;
      if (effectID === "yawn")
        msg = battleMsg(`status.sleep.apply`, [pokemonName])
      else
        msg = battleMsg(`end.${effectID}`, [pokemonName])
      battle.broadcastChatMessage(msg);
    }
    battle.minorBattleActions.set(pokmeon.data.uuid, message);
  })
}

function handleSideStartInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2, () => {
    let side = (message.argumentAt(0)?.[1] === '1') ? battle.side1 : battle.side2;
    let effect = message.effectAt(1);
    if (!effect)
      return;
    battle.sides.forEach(it => {
      let subject = (it === side) ? battleMsg("side_subject.ally") : battleMsg("side_subject.opponent");
      let lang = battleMsg(`sidestart.${effect.id}`, [subject]);
      it.broadcaseChatMessage(lang);
    })
  })
}

function handleSideEndInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(2, () => {
    let side = (message.argumentAt(0)?.[1] === '1') ? battle.side1 : battle.side2;
    let effect = message.effectAt(1);
    if (!effect)
      return;
    battle.sides.forEach(it => {
      let subject = (it === side) ? battleMsg("side_subject.ally") : battleMsg("side_subject.opponent");
      let lang = battleMsg(`sideend.${effect.id}`, [subject]);
      it.broadcaseChatMessage(lang);
    })
  })
}

function handleErrorInstruction(battle: PokemonBattle, actor: BattleActor, message: BattleMessage) {
  battle.log("Error Instruction");
  battle.dispatcher.dispatchGo(() => {
    let lang: RawMessage;
    switch (message.rawMessage) {
      case "|error|[Unavailable choice] Can't switch: The active Pokémon is trapped":
        lang = messages.error({ translate: "cobblmeon.battle.error.pokemon_is_trapped" })
        break;
      case "|error|[Invalid choice] Can't choose for Team Preview: You're not in a Team Preview phase":
        return;
      default:
        lang = battle.createUnimplimented(message);
        break;
    }
    actor.Player?.sendMessage(lang);
    actor.mustChoose = true;
  })
}

function handleRequestInstruction(battle: PokemonBattle, actor: BattleActor, message: BattleMessage) {
  battle.log("Request Instruction");

  if (message.rawMessage.includes("teamPreview"))
    return;

  let request = JSON.parse(message.rawMessage.split("|request|")[1]) as RequestData;
  if (actor.type == ActorType.PLAYER) {
    if (battle.started) {
      battle.dispatcher.dispatchGo(() => {
        actor.request = request;
        actor.responses = [];

        if (request.forceSwitch?.includes(true)) {
          battle.dispatcher.doWhenClear(() => {
            actor.mustChoose = true;
            actor.promptPlayerForRequest();
          })
        }
      })
    }
    else {
      actor.request = request;
      actor.responses = [];
    }
  }
  else {
    actor.aiPlayer?.receiveRequest(request);
  }
}

function handleSwitchInstruction(battle: PokemonBattle, actor: BattleActor, publicMessage: BattleMessage, privateMessage: BattleMessage) {
  let posAndUUID = publicMessage.showdownPositionAndUUID(0);
  if (!posAndUUID)
    return;
  let [position, uuid] = posAndUUID;
  if (!battle.started) {
    let [actor, activePokemon] = battle.getActorAndActiveSlotFromShowdownPosition(position);
    let newPokemon = battle.getPokemon(uuid);
    //Trick to getting index from alphabet.
    switchOut(actor, position, activePokemon, newPokemon);
  }
  else {
    battle.dispatcher.dispatchInsert(() => {
      let [actor, activePokemon] = battle.getActorAndActiveSlotFromShowdownPosition(position);
      let pokemon = battle.getPokemon(uuid);

      if (activePokemon?.data.uuid == pokemon.uuid)
        return []; // Already switched in, Showdown does this if the pokemon is going to die before it can switch

      battle.majorBattleActions.set(pokemon.uuid, publicMessage);
      //TODO: Rework when switch animations and cries are added.
      //There shouldn't be a scenario where there isnt an entity backing the actor.
      switchOut(actor, position, activePokemon, pokemon);
      return [() => new WaitDispatch(1)];
    })
  }
}

/** Switch out implimentation. Needs work when send out animations and cries are added. */
function switchOut(actor: BattleActor, position: string, oldPokemon: ActivePokemon | null, newPokemon: PokemonData) {
  let index = position[2].toLowerCase().charCodeAt(0) - 97;
  let targetLocation: Vector3 | undefined = undefined;
  if (oldPokemon?.entity.isValid() && actor.Player) {
    targetLocation = Object.assign({}, oldPokemon.entity.location);
    oldPokemon.data.return(actor.Player);
  }
  let entity = newPokemon.tryGetPokemonOut();
  if (!entity) {
    if (!targetLocation) {
      let targetActor = actor.getSide().getOppositeSide().actors.find(x => true)?.actor.location
      if (targetActor) {
        let offset = new Vector3Builder(targetActor).subtract(actor.actor.location).scale(0.33);
        targetLocation = Vector3Utils.add(actor.actor.location, offset);
      }
    }
    //TODO: ADD ANIMATION AND WAIT FOR IT USING STILLSENDINGOUTCOUNT
    entity = newPokemon.sendOut(actor.Player, (targetLocation) ? toDimensionLocation(targetLocation, actor.actor.dimension) : undefined);
  }
  //Make the pokemon stay near each other
  actor.getSide().getOppositeSide().getActivePokemon().forEach(x => {
    if (x) {
      x.entity.addTag(`targetedBy:${entity.typeId}`);
      entity.addTag(`targetedBy:${x.entity.typeId}`);
    }
  })
  actor.activePokemon[index] = new ActivePokemon(newPokemon, actor, entity!);
}

function handleDamageInstruction(battle: PokemonBattle, actor: BattleActor, publicMessage: BattleMessage, privateMessage: BattleMessage) {
  let battlePokemon = publicMessage.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  if (privateMessage.optionalArgument("from") == "recoil") {
    battlePokemon.data.getEvolutions().forEach(x => {
      if (x.requirements.some(x => x instanceof RecoilRequirement)) {
        //I have no idea why this is calculated seperately but im just gonna trust the cobblemon devs.
        let newPercentage = parseInt(privateMessage.argumentAt(1)?.split("/")?.[0]!);
        if (Number.isNaN(newPercentage))
          newPercentage = 0;
        let newHealth = Math.round(battlePokemon.data.maxHealth * (newPercentage / 100));
        let difference = battlePokemon.data.currentHealth - newHealth;
        let progress = getEvolutionProgress<number>(battlePokemon.data, x.id, "recoil") || 0;
        setEvolutionProgress(battlePokemon.data, x.id, "recoil", progress + difference);
      }
    })
  }
  let newHealth = privateMessage.argumentAt(1)?.split(" ")[0];
  if (!newHealth)
    return;
  let effect = privateMessage.effect();
  let pokemonName = battlePokemon.data.getTranslatedName();
  let sourceName = privateMessage.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKOWN" };
  broadcastOptionalAbility(battle, effect, sourceName);

  battle.dispatcher.dispatch(() => {
    let newHealthRatio: number;
    let remainingHealth = parseInt(newHealth.split("/")[0]);

    if (effect) {
      let msg = (() => {
        switch (effect.id) {
          case "blacksludge":
          case "stickybarb":
            return battleMsg("damage.item", [pokemonName, effect.typelessData]);
          case "brn":
          case "psn":
          case "tox":
            let status = statusNames[effect.id];
            return messages.With(`cobblemon.status.${status}.hurt`, [pokemonName]);
          case "aftermath":
            return battleMsg("damage.generic", [pokemonName]);
          case "chloroblast":
          case "steelbeam":
            return battleMsg("damage.mindblown", [pokemonName]);
          case "jumpkick":
            return battleMsg("damage.highjumpkick", [pokemonName]);
          default:
            return battleMsg(`damage.${effect.id}`, [pokemonName, sourceName])
        }
      })();
      battle.broadcastChatMessage(msg);
    }

    if (newHealth == "0") {
      //This seems redundant with faint but ok
      newHealthRatio = 0;
      battle.dispatcher.dispatchGo(() => {
        battlePokemon.data.currentHealth = 0;
        battlePokemon.syncWithOut();
      })
    }
    else {
      let maxHealth = parseInt(newHealth.split("/")[1]);
      let difference = maxHealth - remainingHealth;
      newHealthRatio = remainingHealth / maxHealth;
      battle.dispatcher.dispatchToFront(() => {
        battlePokemon.data.currentHealth = remainingHealth;
        if (difference > 0) {
          let pokemon = battlePokemon.data;
          let evolutions = pokemon.getEvolutions();
          evolutions.forEach(x => {
            if (x.requirements.some(x => x instanceof DamageTakenRequirement)) {
              let progress = getEvolutionProgress<number>(pokemon, x.id, "damage_taken") || 0;
              setEvolutionProgress(pokemon, x.id, "damage_taken", progress + difference);
            }
          })
        }
        battlePokemon.syncWithOut();
        return GoDispatch;
      })
    }
    battle.minorBattleActions.set(battlePokemon.data.uuid, privateMessage);
    return new WaitDispatch(1);
  })
}

function handleDragInstruction(battle: PokemonBattle, actor: BattleActor, publicMessage: BattleMessage, privateMessage: BattleMessage) {
  battle.dispatcher.dispatchInsert(() => {
    let [pos, pokemonUUID] = publicMessage.showdownPositionAndUUID(0)!;
    let [_, activePokemon] = battle.getActorAndActiveSlotFromShowdownPosition(pos);
    let newPokemon = battle.getPokemon(pokemonUUID);

    battle.broadcastChatMessage(battleMsg("dragged_out", [newPokemon.getTranslatedName()]));
    if (activePokemon)
      battle.majorBattleActions.set(activePokemon.data.uuid, publicMessage);
    battle.majorBattleActions.set(newPokemon.uuid, publicMessage);
    switchOut(actor, pos, activePokemon || null, newPokemon);
    return [() => new WaitDispatch(1)]
  })
}

function handleHitCountInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let battlePokemon = message.getBattlePokemon(0, battle);
    let hitCount = parseInt(message.argumentAt(1)!);
    if (!battlePokemon || Number.isNaN(hitCount))
      return;
    let msg = (hitCount == 1) ? battleMsg("hit_count_singular") : battleMsg("hit_count", [hitCount.toString()]);
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
    battle.broadcastChatMessage(msg);
  })
}

function handleItemInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let sourceName = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "UNKOWN" };
  broadcastOptionalAbility(battle, message.effect(), sourceName);

  battle.dispatcher.dispatchGo(() => {
    let battlePokemon = message.getBattlePokemon(0, battle);
    if (!battlePokemon)
      return;
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
    //Held item manager
    let itemId = message.effectAt(1)?.id;
    if (!itemId)
      return;
    let consumeHeldItem = shouldConsumeItem(battlePokemon.data, battle);
    if (message.hasOptionalArgument("silent")) {
      if (consumeHeldItem) {
        battlePokemon.data.minecraftItem = undefined;
        battlePokemon.data.item = "";
        battlePokemon.syncWithOut();
      }
      return;
    }
    let effect = message.effect();
    let battlerName = battlePokemon.data.getTranslatedName();
    // Airballoon is the only item using the null effect gimmick.
    if (effect == undefined) {
      battle.broadcastChatMessage(battleMsg(`item.${itemId}.start`, [battlerName]));
      return;
    }

    //TODO: Hopefully mojang will add a way to fetch item translations.
    let itemName = itemId;
    let effectId = effect.id;
    let msg = (() => {
      switch (effectId) {
        case "magician":
        case "pickpocket":
        case "covet":
        case "theif":
          return battleMsg("item.theif", [battlerName, itemName, sourceName]);
        case "pickup":
        case "recycle":
          return battleMsg("item.recycle", [battlerName, itemName]);
        case "switcheroo":
        case "trick":
          return battleMsg("item.trick", [battlerName, itemName]);
        default:
          return battleMsg(`item.${effectId}`, [battlerName, itemName, sourceName]);
      }
    })();
    battle.broadcastChatMessage(msg);
    //TODO: Impliment takeItemEffects and GiveItemEffects
  })
}

function handleEndItemInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchGo(() => {
    let battlePokemon = message.getBattlePokemon(0, battle);
    let itemEffect = message.effectAt(1);
    if (!battlePokemon || !itemEffect)
      return;
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
    if (message.hasOptionalArgument("eat")) {
      battlePokemon.entity.dimension.playSound("berry.eat", battlePokemon.entity.location);
    }
    //HeldItemManager
    let itemId = itemEffect.id;
    if (message.hasOptionalArgument("silent")) {
      battlePokemon.data.minecraftItem = undefined;
      battlePokemon.data.item = "";
      battlePokemon.syncWithOut();
      return;
    }
    let battlerName = battlePokemon.data.getTranslatedName();
    //TODO: Hopefully mojang adds a way to get an item's translation key
    let itemName = itemId;
    if (message.hasOptionalArgument("eat")) {
      battle.broadcastChatMessage(battleMsg("item.eat", [battlerName, itemName]));
      battlePokemon.data.minecraftItem = undefined;
      battlePokemon.data.item = "";
      battlePokemon.syncWithOut();
      return;
    }
    let sourceName = message.getSourceBattlePokemon(battle)?.data.getTranslatedName() || { text: "unknown" };
    let effect = message.effect();
    let msg = (() => {
      if (effect?.id)
        return battleMsg(`enditem.${effect.id}`, [battlerName, itemName, sourceName]);
      else if (["boosterenergy", "electricseed", "grassyseed", "mintyseed", "psychicseed", "roomservice"].includes(itemId))
        return battleMsg("enditem.generic", [battlerName, itemName]);
      else
        return battleMsg(`enditem.${itemId}`, [battlerName]);
    })();
    battlePokemon.data.minecraftItem = undefined;
    battlePokemon.data.item = "";
    battlePokemon.syncWithOut();
    battle.broadcastChatMessage(msg);
  })
}

function shouldConsumeItem(pokemon: PokemonData, battle: PokemonBattle): boolean {
  let tag = (() => {
    if (battle.isPVP)
      return "cobblemon:consumed_in_pvp_battle";
    else if (battle.isPvN)
      return "cobblemon:consumed_in_pvn_battle";
    else
      return "cobblemon:consumed_in_wild_battle";
  })();
  return pokemon.getHeldItem()?.hasTag(tag) || false;
}

function handleHealInstruction(battle: PokemonBattle, actor: BattleActor, publicMessage: BattleMessage, privateMessage: BattleMessage) {
  let pos = privateMessage.showdownPositionAndUUID(0)?.[0];
  let battlePokemon = privateMessage.getBattlePokemon(0, battle);
  let rawHpAndStatus = privateMessage.argumentAt(1)?.split(" ")
  let rawHpRatio = rawHpAndStatus?.[0]
  if (!battlePokemon || !rawHpAndStatus || !rawHpRatio)
    return;
  let newHealth = rawHpRatio.split("/").map(x => Number(x));
  let newHealthRatio = rawHpRatio.split("/").map(x => Number(x) / newHealth[1]);
  let effect = privateMessage.effect();
  let pokemonName = battlePokemon.data.getTranslatedName();
  broadcastOptionalAbility(battle, effect, pokemonName);

  battle.dispatcher.dispatchWaiting(1, () => {
    let silent = privateMessage.hasOptionalArgument("silent");
    if (!silent) {
      let msg = (() => {
        if (privateMessage.hasOptionalArgument("zeffect"))
          return battleMsg("heal.zeffect", [battlePokemon.data]);
        if (privateMessage.hasOptionalArgument("wisher")) {
          let name = privateMessage.optionalArgument("wisher")!
          let showdownId = toID(name);
          console.log(`Wish Debug Id: ${showdownId}`)
          //Oddly, showdown Id as far as i can tell refers to the species id in this case. Wierd.
          let wisher = actor.pokemon.find(x => toID(x.species));
          return battleMsg("heal.wish", [wisher?.getTranslatedName() || actor.nameOwned(name)]);
        }
        if (privateMessage.hasOptionalArgument("from")) {
          if (effect?.type == EffectType.ITEM) {
            if (["leftovers", "shellbell", "blacksludge"].includes(effect.id))
              return battleMsg("heal.leftovers", [battlePokemon.data, effect.typelessData]);
            else
              return battleMsg("heal.item", [battlePokemon.data.getName(), effect.typelessData]);
          }
          if (effect!.id == "drain") {
            let drained = privateMessage.getSourceBattlePokemon(battle)!;
            battleMsg("heal.drain", [drained.data.getTranslatedName()]);
          }
          return battleMsg(`heal.${effect!.id}`, [battlePokemon.data]);
        }
        return battleMsg("heal.generic", [battlePokemon.data]);
      })();
      battle.broadcastChatMessage(msg);
    }
    battle.minorBattleActions.set(battlePokemon.data.uuid, privateMessage);
    battlePokemon.data.currentHealth = Math.round(newHealth[0]);
    battlePokemon.syncWithOut();

    //This part is not always present
    let rawStatus = rawHpAndStatus[1];
    if (!rawStatus)
      return;
    if (PersistentStatuses.includes(rawStatus) && battlePokemon.data.status != rawStatus) {
      battlePokemon.data.status = rawStatus as StatusEffect;
      battlePokemon.syncWithOut();
      if (!silent) {
        battle.broadcastChatMessage(messages.With(`cobblemon.status.${statusNames[rawStatus]}.apply`, [battlePokemon.data.getTranslatedName()]));
      }
    }
  })
}

function handleSetHPInstruction(battle: PokemonBattle, actor: BattleActor, publicMessage: BattleMessage, privateMessage: BattleMessage) {
  battle.dispatcher.dispatchWaiting(1, () => {
    let pos = privateMessage.showdownPositionAndUUID(0)?.[0];
    let flatHP = Number(privateMessage.argumentAt(1)?.split("/")[0]);
    if (Number.isNaN(flatHP))
      return;
    let ratioHP = flatHP * 0.01;
    let battlePokemon = privateMessage.getBattlePokemon(0, battle);
    if (!battlePokemon)
      return;
    battlePokemon.data.currentHealth = Math.round(flatHP);

    if (!publicMessage.hasOptionalArgument("silent")) {
      let effectId = publicMessage.effect()?.id;
      if (!effectId)
        return;
      let msg = battleMsg(`sethp.${effectId}`);
      battle.broadcastChatMessage(msg);
    }
    battle.minorBattleActions.set(battlePokemon.data.uuid, publicMessage);
  })
}

function handleClearAllBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  battle.dispatcher.dispatchWaiting(1.5, () => {
    battle.broadcastChatMessage(battleMsg("clearallboost"));
  })
}

function handleClearNegativeBoostInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  battle.dispatcher.dispatchWaiting(1.5, () => {
    let lang: RawMessage;
    if (message.hasOptionalArgument("zeffect"))
      lang = battleMsg("clearallnegativeboost.zeffect", [pokemonName]);
    else
      lang = battleMsg("clearallnegativeboost", [pokemonName]);
    if (!message.hasOptionalArgument("silent")) {
      battle.broadcastChatMessage(lang);
    }
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}

function handleZPowerInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  battle.dispatcher.dispatchWaiting(1, () => {
    battle.broadcastChatMessage(messages.color("Yellow", battleMsg("zpower", [pokemonName])));
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}

function handleZBrokenInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  battle.dispatcher.dispatchWaiting(1, () => {
    battle.broadcastChatMessage(messages.color("Red", battleMsg("zbroken", [pokemonName])));
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}

function handleTerastrallizeInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  let type = message.effectAt(1);
  if (!type)
    return;
  let typeTranslated: RawMessage = { translate: `cobblemon.type.${type.id}` }
  battle.dispatcher.dispatchWaiting(1, () => {
    battle.broadcastChatMessage(battleMsg("terastallize", [pokemonName, typeTranslated]));
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}

function handleDetailsChangeInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  let _formName = message.argumentAt(1)?.split(",")[0];
  if (!_formName)
    return;
  let formName = substringAfter(_formName, '-').toLowerCase();
  battle.dispatcher.dispatchWaiting(1, () => {
    battle.broadcastChatMessage(battleMsg(`detailschange.${formName}`, [pokemonName]));
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}

function handleMegaInstruction(battle: PokemonBattle, message: BattleMessage, remainingLines: string[]) {
  let battlePokemon = message.getBattlePokemon(0, battle);
  if (!battlePokemon)
    return;
  let pokemonName = battlePokemon.data.getTranslatedName();
  battle.dispatcher.dispatchWaiting(1, () => {
    battle.broadcastChatMessage(messages.color("Yellow", battleMsg("mega", [pokemonName])));
    battle.minorBattleActions.set(battlePokemon.data.uuid, message);
  })
}