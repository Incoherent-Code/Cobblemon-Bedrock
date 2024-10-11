import { Dimension, DimensionLocation, Entity, ItemStack, Player, RawMessage, Vector3, world } from "@minecraft/server";
import { Dex, toID } from "./showdown/sim/index";
import { getSpeciesData, getAvaliableMoves, validateSpawnCondition, SpeciesData } from "./speciesData";
import { AdditionalMoveInfo, PokemonSet } from "./showdown/sim/teams";
import { getSafeTeam, getTeam, storePokemonInFirstSpace } from "./pokemonStorage";
import { UUID, getAllDimensions, removeNamespace, toIdentifier } from "./utils";
import { ExperienceGroups } from "./Experience";
import { getMoveTranslation, message, renderMove } from "./language";
import { EvolutionProgress } from "./evolution/EvolutionProgress";
import { Evolution } from "./evolution";
import { initializeEvolutions } from "./evolution";
import { PassiveEvolution } from "./evolution/Evolution";

export enum ElementalType {
  Normal = "normal",
  Fire = "fire",
  Water = "water",
  Grass = "grass",
  Electric = "electric",
  Ice = "ice",
  Fighting = "fighting",
  Poison = "poison",
  Ground = "ground",
  Flying = "flying",
  Psychic = "psychic",
  Bug = "bug",
  Rock = "rock",
  Ghost = "ghost",
  Dragon = "dragon",
  Dark = "dark",
  Steel = "steel",
  Fairy = "fairy"
}
export enum StatusEffect {
  Burn = "brn",
  Faint = "fnt",
  Freeze = "frz",
  Paralyze = "par",
  Sleep = "slp",
  Poison = "psn",
  Badly_Poison = "tox"
}

export const PersistentStatuses = ["brn", "frz", "par", "tox", "psn", "slp"];

const spawningPokemon: string[] = [];
/** TODO: Generate Levels based on lavel of party.
 * @throws errors
 */
export function setupCobblemon(entity: Entity) {
  let species = entity.typeId.slice(10);

  let pokemonData = getSpeciesData(species);
  if (!pokemonData) throw new Error(`Could not set up cobblemon ${species}: No Data Found`);

  let spawnConditionIndex = entity.getProperty("cobblemon:spawn_condition_used");
  if (typeof spawnConditionIndex != "number") {
    throw new Error("Couldn't retrieve spawn condition???");
  }

  let level: number
  if (spawnConditionIndex === -1) {
    console.warn("The Pokemon's was spawned without a spawn condition..");
    level = getRandomIntBetween(pokemonData.minLevel, pokemonData.maxLevel);
  }
  else {

    //Debug
    if (spawningPokemon.indexOf(species) === -1) {
      spawningPokemon.push(species);
      console.log(`PokemonSpawned:${JSON.stringify(spawningPokemon)}`);
    }

    let spawnCondition = pokemonData.spawnConditionsMap[spawnConditionIndex];
    if (spawnCondition === undefined) {
      console.warn("The pokemon's spawn conditon was not found on the condition map.");
      level = getRandomIntBetween(pokemonData.minLevel, pokemonData.maxLevel);
    }
    else if (!validateSpawnCondition(entity, spawnCondition)) {
      entity.triggerEvent("cobblemon:instant_kill");
      return;
    }
    else {
      // Use the level range of the specific condition if possible
      level = getRandomIntBetween(spawnCondition.minLevel, spawnCondition.maxLevel);
    }
  }

  //Variant
  let variantComponent = entity.getComponent("minecraft:variant")
  if (!(variantComponent && 'value' in variantComponent && typeof variantComponent.value == "number")) throw new Error("The Cobblemon's Variant Could not be Retrieved");
  let variant = variantComponent.value;

  let data = PokemonData.generateNewWildPokemon(species, variant, level);
  data.applyToCobblemon(entity);
}

export interface AdditionalMoveData {
  pp: number;
  maxPp: number;
  extraPp: number;

}

//I had this in the AdditionalMoveData when it was a class, but I changed it because json decoding doesn't know its supposed to be a class
export class AdditionalMoveDataManager {
  static create(pp: number): AdditionalMoveData {
    return { pp: pp, maxPp: pp, extraPp: 0 }
  }
  /**Call this function whenever the move changes */
  static update(oldData: AdditionalMoveData, newMovePP: number): AdditionalMoveData {
    let percentage = oldData.pp / oldData.maxPp;
    oldData.maxPp = newMovePP + oldData.extraPp;
    oldData.pp = Math.round(percentage * oldData.maxPp);
    return oldData
  }
  static ppUp(oldData: AdditionalMoveData, amount: number) {
    oldData.extraPp += amount;
    oldData.maxPp += amount;
    return oldData;
  }
  private constructor() { }
}

/** Class representing data unique to each pokemon, like its uuid.
 */
export class PokemonData implements PokemonSet {
  //Defaults In case constructor is called (ONLY USE FACTORY METHODS)
  /** Use .getName() instead because this is blank unless a nickname is set */
  name: string = "";
  currentHealth = 1;
  uuid: string = "very random uuid";
  species: string = "unown";
  item: string = "";
  /** The Item in the pokemon's hand but as a minecraft item identifier. */
  minecraftItem?: string;
  ability: string = "";
  moves: string[] = [];
  movesInfo: AdditionalMoveData[] = [];
  status: StatusEffect | undefined;
  statusDuration: number | undefined;
  nature: string = "";
  gender: string = "";
  evs: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  ivs: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  level: number = 1;
  experience: number = 0;
  variant: number = 0;
  learnedMoves: string[] = [];
  maxHealth = 1;
  pokeball?: string;
  /** The Name of the original tamer */
  ogTrainer?: string;
  /** Player ID of the pokemon's owner */
  trainer?: string;
  evolutionProgress: EvolutionProgress<unknown>[] = [];
  /** Id's of evolutions that are ready. */
  readyEvolutions: string[] = [];

  //TODO: Impliment Happiness
  shiny?: boolean;
  happiness: number = 0;

  //Unused
  hpType?: string;
  dynamaxLevel?: number;
  gigantamax?: boolean;
  teraType?: string;

  private constructor() { }

  /** Returns the name or species if the name is blank
   * I got tired of writing (pokemon.name || pokemon.species)
   * In most cases, getTranslatedName is better, but this works if you cannot use a translation.
   *  */
  getName(): string {
    return (this.name || this.species)
  }
  /** Returns the name in a format that the bedrock client can translate */
  getTranslatedName(): RawMessage {
    return this.name ? { text: this.name } : { translate: `cobblemon.species.${toID(this.species)}.name` }
  }

  updateMaxHP() {
    let speciesData = getSpeciesData(toID(this.species));
    this.maxHealth = calculateMaxHealth(speciesData!.baseStats.hp, this.level, this.ivs.hp, this.evs.hp);
  }

  /** Adds the given experience points to the pokemon.
   * @param player If you provide a player, this function will handle sending them the translated messages.
   */
  gainExp(expGained: number, player?: Player) {
    let speciesData = this.getSpeciesData();
    this.experience += expGained;
    let oldLevel = this.level;
    let newLevel = ExperienceGroups[speciesData.experienceGroup].getLevel(this.experience);
    if (oldLevel < newLevel) {
      this.level = newLevel;
    }
    //Sending Player Translated Messages.
    if (player) {
      player.sendMessage(message.With("cobblemon.experience.gained", [this, expGained.toString()]));
      if (oldLevel < newLevel) {
        player.sendMessage(message.With("cobblemon.experience.level_up", [this, newLevel.toString()]));
      }
      let oldMoves = getAvaliableMoves(this.species, oldLevel);
      let newMoves = getAvaliableMoves(this.species, newLevel).filter(x => !(oldMoves.includes(x)));
      newMoves.forEach(x => player.sendMessage(message.With("cobblemon.experience.learned_move", [this, getMoveTranslation(x)])));
    }
    this.getEvolutions().forEach(x => {
      if (x instanceof PassiveEvolution)
        x.attemptEvolution(this);
    })
  }

  applyToCobblemon(entity: Entity) {
    let pokemonName = isValidCobblemon(entity);
    let speciesData = this.getSpeciesData();
    if (!pokemonName) throw new Error("Couldn't apply data to invalid pokemon");
    if (this.currentHealth < 1) {
      entity.kill();
      return;
    }

    let tryGetOwner = this.tryGetOwner();
    if (entity.typeId !== toIdentifier(speciesData.name) && tryGetOwner) {
      let location = Object.assign({ dimension: entity.dimension }, entity.location);
      entity.triggerEvent("cobblemon:instant_kill");
      entity = this.sendOut(tryGetOwner, location);
    }

    entity.setDynamicProperty("data", JSON.stringify(this));
    entity.triggerEvent(`cobblemon:set_variant_${this.variant.toString()}`);
    entity.nameTag = `${this.name || this.species} Lv.${this.level}`;
    if (this.uuid && !entity.hasTag(this.uuid))
      entity.addTag(this.uuid);
    entity.setDynamicProperty("uuid", this.uuid);
    if (this.minecraftItem)
      entity.getComponent("inventory")?.container?.getSlot(0).setItem(new ItemStack(this.minecraftItem))
    entity.setProperty("cobblemon:initialized", true);
    if (entity.hasTag("needsServerSetup"))
      entity.removeTag("needsServerSetup"); -743029341899
  }

  updatePokemonInTeam(owner?: Player) {
    owner ??= this.tryGetOwner();
    if (!owner)
      throw new Error("Invalid owner");
    let team = getSafeTeam(owner);
    if (!this.uuid)
      throw new Error("Search Failed, this pokemon does not have a uuid.");
    let indexOfMember = team.findIndex(x => (x?.uuid === this.uuid));
    if (indexOfMember === -1)
      throw new Error("The Pokemon was not in the Party");
    team[indexOfMember] = this;
    owner.setDynamicProperty("team", JSON.stringify(team));
  }

  tryUpdatePokemonInTeam(owner?: Player): boolean {
    try {
      this.updatePokemonInTeam(owner);
      return true;
    }
    catch (e) {
      return false;
    }
  }
  /** Finds the pokemon sent out and updates its data */
  tryUpdatePokemonOut() {
    getAllDimensions().forEach(dimension => {
      let searchArray = dimension.getEntities({ tags: [this.uuid] });
      searchArray.forEach(x => {
        this.applyToCobblemon(x);
      });
    });
  }

  static getFromJson(json: string | object): PokemonData {
    let output: PokemonData = Object.assign(new PokemonData(), (typeof json == "string" ? JSON.parse(json) : json));
    //Old data upgrade
    if (output.level > 1 && output.experience == 0)
      output.experience = ExperienceGroups[output.getSpeciesData().experienceGroup].getExperience(output.level);
    return output;
  }

  static getFromEntity(entity: Entity): PokemonData {
    let pokemonName = isValidCobblemon(entity);
    if (!pokemonName) throw new Error("Couldn't get data from invalid pokemon");
    let output = new PokemonData()
    output.loadFromCobblemon(entity);
    return output;
  }

  static tryGetFromEntity(entity: Entity): PokemonData | undefined {
    try {
      return PokemonData.getFromEntity(entity);
    }
    catch {
      return undefined;
    }
  }

  getKnownMoves(): string[] {
    let levelMoves = getAvaliableMoves(this.species, this.level);
    return levelMoves.concat(this.learnedMoves);
  }

  /** Retrieves the species data of this pokemon
   * @throws if the species data could not be found.
   */
  getSpeciesData(): SpeciesData {
    let speciesData = getSpeciesData(this.species);
    if (speciesData == undefined)
      throw new Error(`Could not get the species data of ${this.species}`);
    return speciesData;
  }
  /** Gets the current stats of the pokemon based on baseStats, EVs, and IVs
   * @todo Calculate with natures.
   */
  getCurrentStats(): StatsTable {
    let output = {};
    let speciesData = this.getSpeciesData();
    Object.entries(speciesData.baseStats).forEach(x => {
      let stat = x[0];
      let newStat = 0;
      if (stat == "hp") {
        if (this.species == "shedinja")
          newStat = 1;
        else
          newStat = Math.floor(0.01 * (2 * x[1] + this.ivs[stat] + Math.floor(0.25 * this.evs[stat])) * this.level) + this.level + 10;
      }
      else {
        newStat = (Math.floor(0.01 * (2 * x[1] + this.ivs[stat] + Math.floor(0.25 * this.evs[stat])) * this.level) + 5) // * nature
      }
      output[stat] = newStat;
    })
    return output as StatsTable;
  }

  /** Returns the pokemon Evolutions initialized properly as classes. */
  getEvolutions(): Evolution[] {
    let speciesData = this.getSpeciesData();
    return initializeEvolutions(speciesData.evolutions);
  }

  /** For creating new PokemonData for wild pokemon */
  static generateNewWildPokemon(species: string, variant: number, level?: number): PokemonData {
    let pokemonData = getSpeciesData(species);
    if (!pokemonData) throw new Error(`Could not create cobblemon ${species}: No Data Found`);

    let output = new PokemonData();
    //Species & UUID
    output.species = pokemonData.name;
    output.uuid = UUID.generate();

    //Level & Variant
    output.variant = variant;
    if (!level) level = getRandomIntBetween(pokemonData.minLevel, pokemonData.maxLevel);
    output.level = level;
    output.experience = ExperienceGroups[pokemonData.experienceGroup].getExperience(level);

    //Gender & Shiny
    let aspects: string[] = pokemonData.variationMap[output.variant]
    if (aspects && aspects.find(x => x == "shiny")) {
      output.shiny = true;
    }
    if (aspects && aspects.find(x => x == "male")) {
      output.gender = "m"
    }
    else if (aspects && aspects.find(x => x == "female")) {
      output.gender = "f"
    }
    else if (!aspects) {
      console.warn("Aspects could not be found from variation map: " + output.species);
    }

    //Ability
    let possibleAbilities = pokemonData.abilities.filter(x => !x.startsWith("h:")) //Filters out hidden abilities
    let ability = getRandomElementIn(possibleAbilities);
    if (ability) output.ability = ability;

    //Moves
    let possibleMoves = pokemonData.moves.filter(x => (parseInt(x.split(":")[0]) && parseInt(x.split(":")[0]) <= output.level)); //Only moves that are at the proper level
    let forLoopLengh = possibleMoves.length < 4 ? possibleMoves.length : 4;
    for (let i = 0; i < forLoopLengh; i++) {
      let move = getRandomElementIn(possibleMoves)!;
      possibleMoves.splice(possibleMoves.indexOf(move), 1);
      let moveID = move.split(":")[1]
      let moveData = Dex.moves.get(moveID);
      if (moveData && moveData.exists) {
        output.moves.push(moveID);
        output.movesInfo?.push(AdditionalMoveDataManager.create(moveData.pp))
      }
      else {
        console.warn("Error Retrieving Data for move " + move);
      }
    }

    //Nature & Happiness
    output.nature = getRandomElementIn(Dex.natures.all())!.name
    output.happiness = pokemonData.baseFriendship;

    //IVs
    output.ivs = {
      hp: getRandomIntBetween(0, 31),
      atk: getRandomIntBetween(0, 31),
      def: getRandomIntBetween(0, 31),
      spa: getRandomIntBetween(0, 31),
      spd: getRandomIntBetween(0, 31),
      spe: getRandomIntBetween(0, 31)
    }
    output.updateMaxHP();
    output.currentHealth = output.maxHealth;

    return output;
  }
  /** Reads the data of the provided entity and syncs it to this object.
   * @throws errors
   */
  loadFromCobblemon(entity: Entity) {
    let pokemonName = isValidCobblemon(entity);
    let initialized = entity.getProperty("cobblemon:initialized");
    if (!pokemonName || !initialized) throw new Error("Couldn't load data from invalid pokemon");
    let jsonData = entity.getDynamicProperty("data");
    if (!jsonData || !(typeof jsonData == "string")) throw new Error("Recieved pokemon data was invalid!");
    Object.assign(this, PokemonData.getFromJson(jsonData));
    let heldItem = entity.getComponent("inventory")!.container!.getItem(0);
    if (heldItem === undefined) {
      this.item = "";
      this.minecraftItem = undefined;
    }
    else {
      this.item = toID(removeNamespace(heldItem.typeId));
      this.minecraftItem = heldItem.typeId;
    }
  }

  /** Spawns pokemon.
   * This pokemon will be set to not wild, and will only have an owner if specified.
   * @throws if neither an owner nor location is specified.
   */
  sendOut(owner?: Player, location?: DimensionLocation): Entity {
    if (!owner && this.trainer)
      owner = this.tryGetOwner();

    if (location === undefined && owner) {
      let lookingAtBlock = owner.getBlockFromViewDirection({ maxDistance: 10 })?.block;
      if (lookingAtBlock == undefined || !lookingAtBlock.above(1)?.isAir || !lookingAtBlock.above(2)?.isAir) {
        location = Object.assign({ dimension: owner.dimension }, owner.location);
      }
      else {
        location = { x: lookingAtBlock.x, y: lookingAtBlock.y + 1, z: lookingAtBlock.z, dimension: owner.dimension };
      }
    }

    let tryGet = this.tryGetPokemonOut();
    if (tryGet)
      return tryGet;

    if (!location)
      throw new Error("Could not guess a location to spawn " + this.getName())

    let speciesData = this.getSpeciesData();
    let identifier = toIdentifier(speciesData.name);
    let pokemon = location.dimension.spawnEntity(identifier, location);

    if (owner) {
      //Tames Pokemon to Player
      pokemon.getComponent("minecraft:tameable")?.tame(owner);
      if (this.trainer != owner.id) {
        this.trainer = owner.id;
        this.tryUpdatePokemonOut();
        this.tryUpdatePokemonInTeam(owner);
      }
      pokemon.setDynamicProperty("owner_name", owner.name);
    }

    pokemon.tryTeleport(location, { facingLocation: owner?.location, checkForBlocks: true });
    this.applyToCobblemon(pokemon);
    pokemon.setProperty("cobblemon:wild", false);
    location.dimension.playSound("poke_ball.send_out", location);
    return pokemon;
  }

  /** Returns a pokemon back to the player.
   * Will do nothing if no pokemon is out in the current dimension.
   */
  return(owner: Player) {
    owner.dimension.getEntities({ families: ["pokemon"], tags: [this.uuid] }).forEach(x => {
      x.dimension.playSound("poke_ball.recall", x.location);
      x.triggerEvent("cobblemon:instant_kill");
    });
  }
  /** Searches for that entity and returns its handle. */
  tryGetPokemonOut(): Entity | undefined {
    for (const dimension of getAllDimensions()) {
      let searchArray = dimension.getEntities({ tags: [this.uuid], families: ["pokemon"] });
      if (searchArray.length > 0)
        return searchArray[0];
    };
    return undefined;
  }
  /** Searches for the pokemon's owner 
   * @param pokemonEntity Entity to use to search, or will use tryGetPokemonOut() if not provided.
  */
  tryGetOwner(pokemonEntity?: Entity): Player | undefined {
    if (!this.trainer)
      return undefined;
    try {
      return world.getEntity(this.trainer!) as Player
    } catch { }
    //Fallback: Mostly for legacy reasons.
    pokemonEntity = pokemonEntity || this.tryGetPokemonOut();
    return pokemonEntity?.getComponent("tameable")?.tamedToPlayer;
  }

  /** Returns the minecraft item that the pokemon is holding, or undefined if nothing. */
  getHeldItem() {
    if (!this.minecraftItem)
      return undefined;
    return new ItemStack(this.minecraftItem, 1);
  }
}
/** If the cobblemon is valid: the name of the cobblemon is returned. */
export function isValidCobblemon(entity: Entity): string | undefined {
  let nameArray = entity.typeId.split(":");
  if (!entity.isValid() || nameArray.length !== 2 || nameArray[0] !== "cobblemon") {
    return undefined
  }
  return nameArray[1];
}
/** @throws errors */
export function catchPokemon(pokemon: Entity, player: Player) {
  let pokemonName = isValidCobblemon(pokemon);
  if (!pokemonName) throw new Error("The Pokemon was Invalid and Could not be caught.");
  let pokemonDataJson = pokemon.getDynamicProperty("data");
  if (!pokemonDataJson || typeof pokemonDataJson != "string") throw new Error("The pokemon's data was invalid and could not be caught!");
  storePokemonInFirstSpace(pokemonDataJson, player);
}



//Random Utility Functions:
function isStatsTable(obj: any): obj is StatsTable {
  return (
    typeof obj === 'object' &&
    'hp' in obj &&
    'atk' in obj &&
    'def' in obj &&
    'spa' in obj &&
    'spd' in obj &&
    'spe' in obj
  );
}

function getRandomElementIn<K>(array: ReadonlyArray<K>): K | undefined {
  if (array.length < 1) return undefined;
  return array[Math.floor(Math.random() * array.length)]
}

export function getRandomIntBetween(min: number, max: number): number {
  // Generate a random number between [start, end]
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateMaxHealth(baseHP: number, level: number, hpIV: number, hpEV: number): number {
  return Math.floor(0.01 * (2 * baseHP + hpIV + Math.floor(0.25 * hpEV)) * level) + level + 10
}
