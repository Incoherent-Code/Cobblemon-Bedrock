import { BattleStream, Teams, getPlayerStreams } from "../showdown/sim";
import { Entity, Player, RawMessage, system } from "@minecraft/server";
import { toID } from "../showdown/sim/dex-data";
import { RandomPlayerAI } from "../showdown/sim/tools/random-player-ai";
import { PokemonData, StatusEffect, isValidCobblemon } from "../Pokemon";
import { getSafeTeam, getTeam, isPlayerInitialized } from "../pokemonStorage";
import { handleMoveRequest } from "../GUI";
import { getMoveTranslation, message, renderBattleMessage } from "../language";
import { UUID } from "../utils";
import { calculateExpGain } from "../Experience";
import { BattleMonitor } from "./BattleMonitor";
import { ActivePokemon } from "./ActivePokemon";
import { RequestData } from "./Request";

export const battleMap = new Map<string, Battle>();
const standardSinglesFormat = "cobblemon";
const standardDoublesFormat = "cobblemon";

export class BattleParticipant {
  canSendInput: boolean = false;
  /** If not undefined, this participant is tied to a player. */
  Player?: Player
  /** Callback function to send a command to the battle from this player. */
  SendInputToBattle?: (input: string) => void
  /** Callback function to show the choice gui to the player. */
  SendRequestToPlayer?: (request: RequestData) => Promise<void>
  Bot?: Boolean
  Team: PokemonData[]
  /** Pokemon currently active on the field in order of position
   * If it is a double battle and the first pokemon died it would be [null, {ActivePokemon}]
   */
  Active: (ActivePokemon | null)[] = [];
  /** Battle name of participant. */
  Name: string
  /** Set if battling with a wild pokemon that needs to be updated. */
  Entity?: Entity
  /** Stored Request In case of delayed action */
  lastRequest?: RequestData

  private constructor(Team: PokemonData[], name: string) {
    this.Team = Team;
    this.Name = name;
  }
  static CreateBot(team: PokemonData[], name: string): BattleParticipant {
    let output = new BattleParticipant(team, name);
    output.Bot = true;
    return output;
  }
  static CreatePlayer(team: PokemonData[], player: Player): BattleParticipant {
    let output = new BattleParticipant(team, player.name);
    output.Player = player;
    return output;
  }
  getTeamMemberViaUUID(uuid: string): PokemonData | undefined {
    return this.Team.find(x => uuid === x.uuid);
  }
  /** Uses the UUID to find the team member and update it.
   * Makes sure that the player's team data and the pokemon's attached data is up to date.
   */
  updateTeamMember(pokemon: PokemonData) {
    if (this.Player) {
      pokemon.tryUpdatePokemonOut();
      pokemon.updatePokemonInTeam(this.Player);
    }
    else if (this.Entity) {
      pokemon.tryUpdatePokemonOut();
    }
  }
  /** Gets the member of the team that is active
   * @param index Can either be the index of the active pokemon or the position on the fied (ex: p2a or a)
   */
  getActiveMember(index: number | string): ActivePokemon | undefined {
    //If string is passed in
    if (typeof index == "string")
      index = getAlphabetIndex(index.startsWith("p") ? index.substring(2) : index);
    let active = this.Active[index];
    return (!active) ? undefined : active;
  }
  /** Shows the player the last request they had if they are able to send input. */
  tryShowRequest() {
    if (!this.canSendInput || this.lastRequest === undefined)
      return;
    this.SendRequestToPlayer?.(this.lastRequest);
  }
}

/** Number of ticks in between each battle message */
const messageDelayTicks = 25;

/** @deprecated New Battle System (PokemonBattle) */
export class Battle {
  battleStream = new BattleStream();
  streams = getPlayerStreams(this.battleStream);
  participants: BattleParticipant[];
  spectators: Player[] = [];
  battleID: string;
  turn = 0;

  /** Temporary Solution to Slow Down Chat */
  globalMessageQueue: (string | RawMessage)[] = [];

  /** Goes through the queue, sending the messages until it runs out, where it will call the callback function. */
  moveThroughMessageQueue(callback: () => void) {
    if (this.globalMessageQueue.length < 1) {
      callback();
      return;
    }
    let message = this.globalMessageQueue.shift()!;
    this.sendMessageToAllPlayers(message);
    system.runTimeout(() => this.moveThroughMessageQueue(callback), messageDelayTicks);
  }
  destroy() {
    battleMap.delete(this.battleID);
    this.streams.omniscient.destroy();
    this.participants.forEach(x => {
      if (x.Player) {
        cleanUpStaleBattleData(x.Player);
      }
      if (x.Entity) {
        cleanUpStaleBattleData(x.Entity);
      }
    })
  }

  sendMessageToAllPlayers(message: string | RawMessage) {
    this.participants.forEach(x => {
      if (x.Player && x.Player.isValid()) x.Player.sendMessage(message);
    })
    this.spectators.forEach(x => {
      if (x.isValid()) x.sendMessage(message);
    })
  }

  constructor(participants: BattleParticipant[], format: string) {
    this.battleID = UUID.generate();
    let startData = { formatid: toID(format) };
    this.streams.omniscient.write(`>start ${JSON.stringify(startData)}`);
    this.participants = participants;
    if (this.participants.length < 2 || this.participants.length > 4) throw new Error("Invalid Amount of Players to Start Battle");
    this.participants.forEach((x, i) => {
      //Code to set the state of each entity as in battle.
      if (x.Entity || x.Player) {
        let entity = x.Entity || x.Player!;
        entity.setProperty("cobblemon:in_battle", true);
        entity.setDynamicProperty("in_battle", this.battleID);
      }

      //Initializes necessary callbacks and responses.
      if (x.Bot) {
        let ai = new RandomPlayerAI(this.streams["p" + (i + 1).toString()]);
        ai.start();
      }
      else if (x.Player) {
        void (async () => {
          for await (const _chunk of this.streams["p" + (i + 1).toString()]) {
            const chunk = _chunk as string;
            chunk.split("\n").forEach(y => {
              let messageArray = y.split("|");
              messageArray.shift(); //Removes blank string at the beginning
              let [messageType, messageData] = messageArray;
              switch (messageType) {
                case "request": {
                  let request = JSON.parse(messageData) as RequestData;
                  x.lastRequest = request;
                  x.canSendInput = true;
                  //a[i].RecieveRequest?.(request);
                }
                case "error": {
                  x.canSendInput = true;
                  if (x.Player) {
                    x.Player!.sendMessage(messageData);
                  }
                }
              }
            })
          }
        })();
        x.SendRequestToPlayer = (async (y) => {
          let answer = await handleMoveRequest(y, x, this);
          if (answer === undefined || typeof answer != "string") return;
          x.SendInputToBattle?.(answer);
        })
      }
      else {
        throw new Error("Invalid Battle Participant.");
      }
      x.SendInputToBattle = y => {
        if (!x.canSendInput) return; //Ignore redundant requests 
        this.streams.omniscient.write(`>p${i + 1} ${y}`);
      }
      this.streams.omniscient.write(`>player p${(i + 1).toString()} ${JSON.stringify({
        name: x.Name,
        team: x.Team
      })}`);
    })
    void (async () => {
      for await (const chunk of this.streams.omniscient) {
        chunk.split("\n").forEach(x => {
          handleShowdownMessage(this, x);
        })
        console.log(chunk);
      }
    })();

    //Adds itself to the battle map
    battleMap.set(this.battleID, this);
  }
}

export function tryGetBattleFromEntity(entity: Entity): Battle | undefined {
  cleanUpStaleBattleData(entity);
  let battle = entity.getDynamicProperty("in_battle");
  if (battle === undefined || typeof battle != "string")
    return undefined;
  return battleMap.get(battle);
}

/** Returns the UUID of the battle */
function startNewBattle(participants: BattleParticipant[], format: string): string | undefined {
  //This function used to do alot more but I moved it all to the constructor itself.
  try {
    return new Battle(participants, format).battleID;
  }
  catch (e) {
    console.error(e);
    return undefined;
  }
}
/** Checks if their battle id exists and if it doesn't, remove battle flags.
 * Also properly sets "cobblemon:in_batttle"
 */
export function cleanUpStaleBattleData(entity: Entity) {
  let battleUUID = entity.getDynamicProperty("in_battle");
  if (battleUUID && typeof battleUUID === "string" && !battleMap.has(battleUUID)) {
    entity.setDynamicProperty("in_battle", undefined);
    battleUUID = undefined;
  }
  if (battleUUID) {
    entity.setProperty("cobblemon:in_battle", true);
  }
  else {
    entity.setProperty("cobblemon:in_battle", false);
  }

}

/** Starts battle with wild pokemon
 * @throws errors
 */
export function startBattleWithWildPokemon(player: Player, wildEntity: Entity) {
  if (!isValidCobblemon(wildEntity)) throw new Error("Entity provided to battle is not a pokemon!");
  let pokemonDataJson = wildEntity.getDynamicProperty("data");
  if (!pokemonDataJson || typeof pokemonDataJson != "string") throw new Error("Unable to retive pokemon data!");
  let pokemonData = PokemonData.getFromJson(pokemonDataJson);
  let wildBattleParticipant = BattleParticipant.CreateBot([pokemonData], (pokemonData.name || pokemonData.species));
  wildBattleParticipant.Entity = wildEntity;
  let playerTeam = getSafeTeam(player).filter(x => x != null) as PokemonData[];
  if (playerTeam.length < 1) throw new Error("Player does not have a team.");
  let playerParticipant = BattleParticipant.CreatePlayer(playerTeam, player);

  let battleUUID = startNewBattle([playerParticipant, wildBattleParticipant], standardSinglesFormat);
  if (!battleUUID) return; //The error is logged with console in the function
  new BattleMonitor(battleUUID, true, [player, wildEntity]);
}

export function startBattleBetweenPlayers(players: Player[]) {
  players.forEach(x => {
    if (!isPlayerInitialized(x))
      throw new Error(`Player ${x.name} is not initialized with a team.`);
  })
  if (players.length != 2 && players.length != 4)
    throw new Error(`Invalid amount of players to start battle.`);

  let participants = players.map(x => {
    return BattleParticipant.CreatePlayer(getTeam(x)!.filter(x => x !== null), x)
  });

  let battleUUID = startNewBattle(participants, (players.length === 2) ? standardSinglesFormat : standardDoublesFormat);
  if (battleUUID === undefined)
    return;

  new BattleMonitor(battleUUID, true, players);
}

function handleShowdownMessage(battle: Battle, message: string) {
  /** Stream data string split into an array.
   * ex: |turn|1 would be ["turn", "1"]
   */
  let messageArray = message.split("|");
  messageArray.shift(); //Removes blank string at the beginning
  let messageType = messageArray[0];
  if (messageArray.length < 2) return;
  //Specific to a pokemon that is assigned to a player
  if (messageArray[1].startsWith("p")) {
    let idSplit = messageArray[1].split(": ");
    let participantIndex = parseInt(idSplit[0][1]) - 1;
    let participant = battle.participants[participantIndex];
    if (!participant) throw new Error("The Participant could not be infered from stream data: " + message);
    let pokemonUUID = idSplit[1];
    let pokemon = participant.getTeamMemberViaUUID(pokemonUUID)!;

    //Handle sending relevant messages
    let globalMessage = renderBattleMessage(battle, messageArray);
    if (globalMessage)
      battle.globalMessageQueue.push(globalMessage);//battle.sendMessageToAllPlayers(globalMessage);

    switch (messageType) {
      case "ppupdate": {
        let movesToUpdate = messageArray[2].split(",");
        for (const itemPair of movesToUpdate) {
          let ItemPairSplit = itemPair.split(":");
          pokemon.movesInfo![pokemon.moves.indexOf(ItemPairSplit[0])].pp = Number(ItemPairSplit[1]);
        }
        participant.updateTeamMember(pokemon);
      } break;
      case "-damage": {
        let healthString = messageArray[2];
        if (messageArray[2].split(" ").length > 1) {
          let healthSplit = messageArray[2].split(" ");
          healthString = healthSplit[0];
          pokemon.status = healthSplit[1] as StatusEffect;
        }
        let [health] = healthString.split("/");
        pokemon.currentHealth = Number(health);
        battle.participants[participantIndex].updateTeamMember(pokemon);

      } break;
      case "switch": {
        let activeIndex = getAlphabetIndex(idSplit[0].substring(2));
        if (participant.Player)
          participant.getActiveMember(activeIndex)?.data.return(participant.Player);
        let activePokemon = new ActivePokemon(pokemon, battle);
        battle.participants[participantIndex].Active[activeIndex] = activePokemon;
        if (participant.Player)
          participant.getActiveMember(activeIndex)?.data.sendOut(participant.Player);
        break;
      }
      case "faint": {
        let fainting = participant.getActiveMember(idSplit[0]);
        //TODO: Impliment sides and stuff. Currently, all players who are out gain experience.
        //TODO: Impliment Evolution Defeat Requirement.
        battle.participants.forEach(x => {
          if (x.Name == participant.Name)
            return;
          let expGainingPokemon = x.Team.filter(x => (fainting?.seenPokemon.includes(x.uuid) || (x.item == "expshare")) && x.status != "fnt");
          expGainingPokemon.forEach(y => {
            let multiplayer = (fainting!.seenPokemon.includes(y.uuid)) ? 1 : 0.5;
            let expGain = calculateExpGain(y, fainting!.data, multiplayer);
            if (expGain > 0) {
              y.gainExp(expGain, x.Player);
            }
            x.updateTeamMember(y);
          })
        })
      } break;
    }
  }
  //Not pointing to a specific pokemon or player
  switch (messageType) {
    case "tie":
      battle.sendMessageToAllPlayers({ translate: "battle.result.tie" });
      battle.destroy();
      return;
    case "win":
      battle.sendMessageToAllPlayers({ translate: "cobblemon.battle.win", with: [messageArray[1]] });
      battle.destroy();
      return;
    case "turn":
      battle.turn++;
      battle.moveThroughMessageQueue(() => battle.participants.filter(x => x.Player && x.canSendInput).forEach(x => x.SendRequestToPlayer?.(x.lastRequest!)));
  }
}

/** Returns the zero based index of an alphabet character.
 * @param letter non case sensitive letter
 * @example getAlphabetIndex("a"); //0
 * getAlphabetIndex("Z"); //25
 */
export function getAlphabetIndex(letter: string): number {
  const charCode = letter.toLowerCase().charCodeAt(0);
  const position = charCode - 97;
  return position;
}
