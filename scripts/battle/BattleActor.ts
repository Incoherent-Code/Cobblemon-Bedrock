import { PokemonBattle } from "./PokemonBattle";
import { PokemonData } from "../Pokemon";
import { Entity, Player, RawMessage } from "@minecraft/server";
import { ActivePokemon } from "./ActivePokemon";
import { RequestData } from "./Request";
import { ActionResponse, ForcePassActionResponse } from "./ActionResponse";
import { BattleMoveset } from "./BattleMoveset";
import { handleMoveRequest } from "../GUI/Battle";
import { message } from "../language";
import { RandomPlayerAI } from "../showdown/sim/tools/random-player-ai";
import { BattlePlayer } from "../showdown/sim/battle-stream";

export enum ActorType {
  WILD,
  PLAYER,
  NPC
}

export class BattleActor {
  constructor(
    public actor: Entity,
    public pokemon: PokemonData[]
  ) { }

  type = (this.actor instanceof Player) ? ActorType.PLAYER
    : (this.actor.getComponent("type_family")?.hasTypeFamily("pokemon")) ? ActorType.WILD
      : ActorType.NPC

  //Lateinit
  battle!: PokemonBattle
  /** Position of the player Ex: p1 or p2 */
  showdownId!: string

  /** Null indicates that there is a space there but it is empty. (Maybe only one pokemon left) */
  activePokemon: (ActivePokemon | null)[] = [];
  canDynamax = false;
  request?: RequestData;
  responses: ActionResponse[] = [];
  expectingPassActions: ActionResponse[] = [];
  mustChoose = false
  /** If this is not a player, Initialiaze a randomPlayerAi here. */
  aiPlayer: BattlePlayer | undefined = undefined;

  /** For when battles start, it's the number of Pokémon that are still in the process of being sent out (animation wise) */
  stillSendingOutCount = 0;

  private _battleTheme: string | undefined = undefined
  get battleTheme() {
    return this._battleTheme;
  }
  set battleTheme(theme) {
    if (!(this.actor instanceof Player))
      return;
    if (theme) {
      this.updateMusic();
    }
    else {
      this.actor.stopMusic();
    }
    this._battleTheme = theme;
  }

  /** BEDROCK: Easy access to the player. Mostly for legacy code with Old Battle Participant Type */
  get Player() {
    if (this.actor instanceof Player)
      return this.actor as Player;
    else
      return undefined
  }

  getName(): RawMessage {
    if (this.actor instanceof Player)
      return message.toMessage(this.actor.name);
    else if (this.type == ActorType.WILD)
      return this.pokemon[0].getTranslatedName()
    else
      return message.toMessage(this.actor.nameTag);
  }

  nameOwned(name: string): RawMessage {
    if (this.type == ActorType.WILD)
      return { text: name };
    return message.battleMsg("owned_pokemon", [this.getName(), name]);
  }

  canFitForcedAction() {
    if (!this.request)
      return false;
    let countMovable = (this.request.active?.length || 0) - (this.request.forceSwitch?.filter(x => x == true).length || 0);
    return this.mustChoose && !this.battle.ended && countMovable > this.expectingPassActions.length
  }

  /** @todo Impliment call to action for player. */
  forceChoose(response: ActionResponse) {
    this.expectingPassActions.push(response);
    //Promise.resolve(handleMoveRequest()).then(x => )
  }

  getSide() {
    return (this.battle.side1.actors.includes(this)) ? this.battle.side1 : this.battle.side2
  }

  getPlayerIDs() {
    return (this.type == ActorType.PLAYER) ? [this.actor.id] : [];
  }

  isForPlayer(player: Player) {
    return this.getPlayerIDs().includes(player.id);
  }

  isForPokemon(entity: Entity) {
    this.activePokemon.some(x => x?.entity.id == entity.id);
  }

  turn() {
    if (!this.request)
      return;
    this.responses = [];
    this.mustChoose = true;
    //TODO: Send update implimentation

    if (!this.request.active || this.request.active.length <= 0 || this.request.wait) {
      this.request = undefined;
      this.expectingPassActions = [];
      return;
    }
  }

  upkeep() {
    if (!this.request || this.type != ActorType.PLAYER)
      return;
    let forceSwitchPokemon = this.request.forceSwitch?.map((x, i) => {
      if (x)
        return this.activePokemon[i]
      else
        return undefined
    }).filter(x => x != undefined) || []
    if (forceSwitchPokemon.length <= 0)
      return;
    this.mustChoose = true;
    this.promptPlayerForRequest();
  }

  setActionResponse(responses: ActionResponse[]) {
    if (!this.request)
      return;
    //Clone
    let originalPassActions = [...this.expectingPassActions];
    responses.forEach((response, i) => {
      let activeBattlePokemon = this.activePokemon[i]
      if (!activeBattlePokemon)
        return;
      let _showdownMoveSet = this.request?.active?.[i]
      let showdownMoveSet: BattleMoveset | undefined = undefined;
      if (_showdownMoveSet)
        showdownMoveSet = BattleMoveset.parse(_showdownMoveSet);
      let forceSwitch = this.request?.forceSwitch?.[i] || false;
      if (!response.isValid(activeBattlePokemon, showdownMoveSet, forceSwitch)) {
        this.expectingPassActions = [...originalPassActions]
        //TODO: Properly handle this case.
        throw new Error("Invalid Choice");
      }
      else if (response instanceof ForcePassActionResponse)
        this.responses.push(this.expectingPassActions.shift()!)
      else
        this.responses.push(response);
    })
  }

  writeShowdownResponse() {
    let showdownMessages: string[] = [];
    let index = 0;
    this.activePokemon.forEach((activePokemon, index) => {
      if (activePokemon === null)
        return;
      let moveset = this.request?.active?.[index];
      showdownMessages.push(this.responses[index].toShowdownString(activePokemon, (moveset) ? BattleMoveset.parse(moveset) : undefined))
    })
    //console.log(JSON.stringify(this.activePokemon));
    this.responses = [];
    //In case of error
    //this.request = undefined;
    this.mustChoose = false;
    this.expectingPassActions = [];
    this.battle.battleStream.write(`>${this.showdownId} ${showdownMessages.join(" ")}`)
  }

  /** BEDROCK: Sync's all the pokemon data with the player / entity. */
  syncOutPokemon() {
    this.pokemon.forEach(pokemon => {
      if (this.actor instanceof Player) {
        pokemon.updatePokemonInTeam(this.actor)
      }
      pokemon.tryUpdatePokemonOut();
    })
  }

  /** BEDROCK: Ensures the correct music is playing */
  updateMusic() {
    if (!this.battleTheme || !(this.actor instanceof Player))
      return;
    this.actor.playMusic(this.battleTheme);
  }

  /** BEDROCK: Handles showing the player's request. */
  promptPlayerForRequest() {
    if (!this.request || !this.mustChoose)
      return;
    if (this.type == ActorType.PLAYER) {
      Promise.resolve(handleMoveRequest(this.request, this, this.battle)).then(value => {
        if (value) {
          this.setActionResponse(value);
          this.writeShowdownResponse();
        }
      });
    }
  }
}