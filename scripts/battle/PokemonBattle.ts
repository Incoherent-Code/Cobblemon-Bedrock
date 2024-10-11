import { Entity, Player, RawMessage, system } from "@minecraft/server";
import { BattleSide } from "./BattleSide";
import { EntityUtils, UUID } from "../utils";
import { BattleDispatch, BattleDispatcher } from "./Dispatcher";
import { ActorType, BattleActor } from "./BattleActor";
import { ActivePokemon } from "./ActivePokemon";
import { BattleStream, getPlayerStreams, Teams } from "../showdown/sim";
import { message as messages } from "../language";
import { ActionResponse } from "./ActionResponse";
import { interpretMessage } from "./BattleInterpreter";
import { BattleFormat } from "./BattleFormat";
import { RandomPlayerAI } from "../showdown/sim/tools/random-player-ai";
import { BattleMessage } from "./BattleMessage";
import { PokemonData } from "../Pokemon";
import { ObjectReadWriteStream } from "../showdown/lib/streams";

const fleeDistance = 30;

export const battleMap = new Map<string, PokemonBattle>();

export class PokemonBattle {
  runtimeID = system.runInterval(() => this.tick(), 1);
  constructor(
    public format: BattleFormat,
    public side1: BattleSide,
    public side2: BattleSide
  ) {
    this.sides.forEach(x => x.battle = this);
    this.actors.forEach(actor => {
      actor.battle = this;
      actor.pokemon.forEach(x => {
        x.evolutionProgress.filter(x => x.variant == "battle_critical_hits")
          .forEach(x => x.progress = 0);
        x.tryUpdatePokemonInTeam();
        x.tryUpdatePokemonOut();
      })
      this.setupEntity(actor.actor);
    })
    //Set up stream
    void (async () => {
      for await (const chunk of this.battleStream) {
        interpretMessage(this.battleId, chunk);
      }
    })();
    this.battleStream.write(`>start {"format":${format.toFormatJSON()}}`);
    let actorIndex = 1;
    for (let actor of side1.actors) {
      actor.showdownId = `p${actorIndex}`;
      actorIndex += 2;
    }

    actorIndex = 2;
    for (let actor of side2.actors) {
      actor.showdownId = `p${actorIndex}`;
      actorIndex += 2;
    }

    for (let actor of this.actors) {
      let playerObj = {
        name: actor.actor.id.toString(),
        team: actor.pokemon
      }
      this.battleStream.write(`>player ${actor.showdownId} ${JSON.stringify(playerObj)}`);
      if (actor.type == ActorType.PLAYER) {
      }
      else {
        //Using getPlayerStreams() causes issues because having multiple for awaits on a stream has wierd behavior
        //So instead, we make a dummy, and invoke the ai ourselves when needed.
        actor.aiPlayer = new RandomPlayerAI(new ObjectReadWriteStream<string>({
          write(elem) {
            actor.battle.battleStream.write(elem.replace(/(^|\n)/g, `$1>${actor.showdownId} `))
          },
        }));
      }
      actor.activePokemon = new Array(format.battleType.actorsPerSide).fill(null);
    }

    for (let actor of this.actors) {

    }

    battleMap.set(this.battleId, this);
    console.log("New Battle: " + this.battleId);
  }
  /** Battle Logging */
  mute = false;
  get sides() {
    return [this.side1, this.side2];
  }
  get actors() {
    return this.sides.flatMap(x => x.actors);
  }
  get activePokemon() {
    return [...this.side1.getActivePokemon(), ...this.side2.getActivePokemon()]
  }
  get players() {
    return this.actors.filter(x => x.actor instanceof Player).map(x => x.actor as Player);
  }
  get playerIDs() {
    return this.players.map(x => x.id);
  }
  spectators: Player[] = [];
  battleId = UUID.generate();
  battleStream = new BattleStream();

  //Logs
  showdownMessages: string[] = [];
  battleLog: string[] = [];
  chatLog: RawMessage[] = [];
  started = false;
  ended = false;
  turn = 1;

  dispatcher = new BattleDispatcher(x => {
    console.log("Error while ticking a battle.");
    this.broadcastChatMessage(messages.error({ translate: "cobblemon.battle.crash" }));
    this.stop();
    if (x instanceof Error) {
      throw x;
      //console.error(x);
    }
  });

  //TODO: Capture Actions
  majorBattleActions = new Map<string, BattleMessage>();
  minorBattleActions = new Map<string, BattleMessage>();

  /** Whether or not one side has a player and the other side has a wild pokemon. */
  get isPvW() {
    let playerSide = this.sides.find(x => x.actors.some(y => y.type == ActorType.PLAYER));
    if (!playerSide)
      return false;
    if (playerSide.actors.some(x => x.type != ActorType.PLAYER))
      return false;

    let otherSide = playerSide.getOppositeSide();
    return otherSide.actors.every(x => x.type == ActorType.WILD);
  }

  /** Whether or not there are players on both sides. */
  get isPVP() {
    return this.sides.every(x => x.actors.some(y => y.type == ActorType.PLAYER));
  }

  /** Whether or not there is one player side and one npc side. */
  get isPvN() {
    let playerSide = this.sides.find(x => x.actors.some(y => y.type == ActorType.PLAYER));
    if (!playerSide)
      return false;
    if (playerSide.actors.some(x => x.type != ActorType.PLAYER))
      return false;

    let otherSide = playerSide.getOppositeSide();
    return otherSide.actors.every(x => x.type == ActorType.NPC);
  }

  /** Gets the actor based on their showdown id (p1, p3, so on) */
  getActorFromShowdownID(showdownID: string) {
    return this.actors.find(actor => actor.showdownId == showdownID);
  }

  /** Gets the actor based on their entity id. */
  getActorFromID(entityID: string) {
    return this.actors.find(actor => actor.actor.id == entityID)
  }

  /** Takes in a showdown position (ex: p2a) and returns the active pokemon. */
  getActorAndActiveSlotFromShowdownPosition(showdownPosition: string): [BattleActor, ActivePokemon | null] {
    let playerPos = showdownPosition.substring(0, 2);
    let actor = this.getActorFromShowdownID(playerPos);
    if (!actor)
      throw new Error("Invalid Showdown Position: " + showdownPosition + " - Unknown Actor");
    let letter = showdownPosition[2];
    let activePokemon = actor.activePokemon[getIndexFromLetter(letter)];
    if (activePokemon === undefined)
      throw new Error("Invalid Showdown Position: " + showdownPosition + " - Unknown Pokemon");
    return [actor, activePokemon];
  }

  /** Takes in the player position and pokemon uuid and returns the active pokemon. */
  getActivePokemon(showdownPosition: string, pokemonUUID: string): [BattleActor, ActivePokemon] {
    let playerPos = showdownPosition.substring(0, 2);
    let actor = this.getActorFromShowdownID(playerPos);
    if (!actor)
      throw new Error("Invalid Showdown Position: " + showdownPosition + " - Unknown Actor");
    let pokemon = actor.activePokemon.find(x => x?.data.uuid == pokemonUUID);
    if (!pokemon)
      throw new Error("Invalid Showdown Position: " + pokemonUUID + " - Unknown Pokemon");
    return [actor, pokemon];
  }

  /** BEDROCK: Gets the team pokemon data corresponding to the uuid. */
  getPokemon(pokemonUUID: string): PokemonData {
    let output = this.actors.flatMap(x => x.pokemon).find(x => x.uuid == pokemonUUID);
    if (!output)
      throw new Error("The pokemon's uuid could not be found in the battle.");
    return output;
  }

  /** Send chat message to all players, including spectators. */
  broadcastChatMessage(message: RawMessage) {
    this.chatLog.push(message);
    [...this.spectators, ...this.actors.map(x => x.actor).filter(x => x instanceof Player)].forEach(player => {
      player.sendMessage(message);
    })
  }

  writeShowdownAction(...messages: string[]) {
    this.log(messages.join("\n"));
    messages.forEach(x => this.battleStream.write(x));
  }

  /** Signifies a new turn in the battle. */
  newTurn(newTurnNumber: number) {
    this.actors.forEach(x => x.turn());
    //Revealing is already handled in my activePokemon code.
    this.turn = newTurnNumber;
  }

  end() {
    this.ended = true;
    //Experience gain is handled on faint.
    //Healing wild pokemon is handled in checkFlee()
    battleMap.delete(this.battleId);
    system.clearRun(this.runtimeID);
    this.actors.forEach(x => {
      if (x.actor.isValid()) {
        x.actor.setDynamicProperty("in_battle", undefined);
        x.actor.setProperty("cobblemon:in_battle", false);
      }
    })
    this.activePokemon.forEach(x => {
      if (x?.entity.isValid()) {
        x?.entity.setDynamicProperty("in_battle", undefined);
        x?.entity.setProperty("cobblemon:in_battle", true);
      }
    })
  }

  log(message = "") {
    if (!this.mute)
      console.info(message);
    this.battleLog.push(message);
  }

  tick() {
    this.dispatcher.tick();

    if (this.actors.some(actor => !actor.actor.isValid()))
      this.stop();
    if (this.started && this.isPvW && !this.ended && this.dispatcher.dispatches.length == 0)
      this.checkFlee();
  }


  checkFlee() {
    let wildPokemonOutOfRange = !this.actors
      .filter(x => x.type == ActorType.WILD)
      .filter(x => x.actor.isValid())
      .some(pokemonActor => {
        let dimension = pokemonActor.actor.dimension.id;

        let playerDistances = this.actors
          .filter(x => x.type == ActorType.PLAYER)
          .filter(x => x.actor.isValid())
          .filter(x => x.actor.dimension.id == dimension)
          .map(x => EntityUtils.DistanceBetween(x.actor, pokemonActor.actor))

        return playerDistances.length > 0 && Math.min(...playerDistances) < fleeDistance;
      })
    if (wildPokemonOutOfRange) {
      //Heal wild pokemon
      this.actors
        .filter(x => x.type == ActorType.WILD)
        .filter(x => x.actor.isValid())
        .forEach(x => {
          x.pokemon.forEach(pokemonData => {
            pokemonData.updateMaxHP();
            pokemonData.currentHealth = pokemonData.maxHealth;
            pokemonData.status = undefined;
            pokemonData.tryUpdatePokemonOut();
          })
        })
      this.broadcastChatMessage({ translate: "cobblemon.battle.flee" });
      this.stop();
    }
  }

  stop() {
    this.end();
    this.writeShowdownAction(">forcetie");
  }

  checkForInputDispatch() {
    let readyToInput = this.actors.some(it => !it.mustChoose && it.responses.length > 0) && !this.actors.every(it => it.mustChoose);
    if (readyToInput) { //TODO: CHECK CAPTURE ACTIONS
      this.actors.filter(x => x.responses.length > 0).forEach(x => x.writeShowdownResponse())
      this.actors.forEach(x => { x.responses = []; x.request = undefined; })
    }
  }
  /**
   * Creates a [Text] representation of an error to interpret a battle message.
   * This also logs the error, the goal of this function is to make sure users see missing interpretations and report them to us.
   * Logging is independent of [mute].
   *
   * @param message The [BattleMessage] that wasn't able to find a lang interpretation.
   * @return The generated [Text] meant to notify the client.
   */
  createUnimplimented(message: BattleMessage) {
    let text = `Missing interpretation on ${message.id} action ${message.rawMessage}`;
    console.error(text);
    return messages.error(text);
  }

  createUnimplimentedSplit(publicMessage: BattleMessage, privateMessage: BattleMessage): RawMessage {
    if (publicMessage.id != privateMessage.id)
      throw new Error("Messages do not match.")
    console.error(`Missing Interpretation on '${publicMessage.id} action: \nPublic >> ${publicMessage.rawMessage}\nPrivate >> ${privateMessage.rawMessage}'`);
    return messages.error(`Missing Interpretation on '${publicMessage.id}' action please report to the developers`);
  }

  /** Sets the entity properties to indicate that the pokemon is in a battle. */
  setupEntity(entity: Entity) {
    entity.setDynamicProperty("in_battle", this.battleId);
    try {
      entity.setProperty("cobblemon:in_battle", true);
    }
    catch { }
  }
}

function getIndexFromLetter(letter: string) {
  let charCode = letter.toLowerCase().charCodeAt(0);
  return charCode - 97;
}