import { ColorCodes, getMoveTranslation, message } from "../language";
import { PokemonData } from "../Pokemon";
import { PokemonProperties } from "../PokemonProperties";
import { Dex } from "../showdown/sim";
import { toID } from "../utils";
import { EvolutionRequirement } from "./EvolutionRequirement";
import { EvolutionEntry } from "../speciesData";
import { initializeRequirements } from "./requirements";

export abstract class Evolution {
  constructor(
    public id = "id",
    public result = new PokemonProperties(),
    public optional = true,
    public consumeHeldItem = true,
    public requirements: EvolutionRequirement[] = [],
    public learnableMoves: string[] = []
  ) { }

  /**
   * Checks if the given [Pokemon] passes all the conditions and is ready to evolve.
   *
   * @param pokemon The [Pokemon] being queried.
   * @return If the [Evolution] can start.
   */
  test(pokemon: PokemonData) {
    return this.requirements.every(x => x.check(pokemon));
  }
  /**
  * Starts this evolution or queues it if [optional] is true.
  * Side effects may occur based on [consumeHeldItem].
  *
  * @param pokemon The [Pokemon] being evolved.
  */
  evolve(pokemon: PokemonData): boolean {
    if (this.consumeHeldItem) {
      pokemon.minecraftItem = undefined;
      pokemon.item = "";
    }
    if (this.optional) {
      if (!pokemon.readyEvolutions.includes(this.id)) {
        pokemon.readyEvolutions.push(this.id);
        let owner = pokemon.tryGetOwner();
        owner?.playSound("cobblemon.pokemon.evolution.notification");
        owner?.sendMessage(message.prefix(ColorCodes.Green, message.With("cobblemon.ui.evolve.hint", [pokemon])));
        pokemon.tryUpdatePokemonOut();
        pokemon.tryUpdatePokemonInTeam();
        return true;
      }
      return false;
    }
    this.forceEvolve(pokemon);
    return true;
  }

  /**
  * Starts this evolution as soon as possible.
  * This will not present a choice to the client regardless of [optional].
  *
  * @param pokemon The [Pokemon] being evolved.
  * @todo add sounds and animations and stuff
  */
  forceEvolve(pokemon: PokemonData) {
    pokemon = this.result.apply(pokemon);
    this.learnableMoves
      .map(x => toID(x))
      .forEach(x => {
        let move = Dex.moves.get(x);
        if (!move.exists)
          return;
        if (!pokemon.learnedMoves.includes(x)) {
          pokemon.learnedMoves.push(x);
          if (pokemon.moves.length < 4 && !pokemon.moves.includes(x)) {
            pokemon.moves.push(x);
            pokemon.movesInfo.push({ pp: move.pp, maxPp: move.pp, extraPp: 0 });
          }
          pokemon.tryGetOwner()?.sendMessage(message.With("cobblemon.experience.learned_move", [pokemon, getMoveTranslation(x)]));
        }
      });
    pokemon.readyEvolutions = [];
    pokemon.tryUpdatePokemonOut();
    pokemon.tryUpdatePokemonInTeam();
  }
  /** Takes in the input recieved from the pokemon data and returns an instance of this class.
   * @throws If this is not overrided by inheritor.
   */
  static getFromSerializied(evolution: EvolutionEntry): Evolution {
    throw new Error("Evolution was not implimented properly.");
  };
}

export class PassiveEvolution extends Evolution {
  /**
  * Checks if the given [Pokemon] satisfies the requirements.
  * If yes the evolution will attempt to start.
  *
  * @param pokemon The [Pokemon] being tested.
  * @return If the [Pokemon] will evolve.
  */
  attemptEvolution(pokemon: PokemonData): boolean {
    if (this.test(pokemon)) {
      return this.evolve(pokemon);
    }
    return false;
  }
  static getFromSerializied(evolution: EvolutionEntry): PassiveEvolution {
    return new PassiveEvolution(evolution.id, PokemonProperties.parse(evolution.result), evolution.optional, evolution.consumeHeldItem, initializeRequirements(evolution.requirements), evolution.learnableMoves);
  };
}

/**
 * Represents an evolution of a [Pokemon] that can only occur during specific actions and with added context.
 * For the default implementations see [ItemInteractionEvolution] & [TradeEvolution].
 *
 * @param RC The context given at runtime when querying the [Evolution].
 * @param TC The context that is serialized from JSON during species loading, this is what the [RC] is expected to match against.
 */
export abstract class ContextEvolution<RC, TC> extends Evolution {
  //Boilerplate
  constructor(
    public requiredContext: TC,
    id = "id",
    result = new PokemonProperties(),
    optional = true,
    consumeHeldItem = true,
    requirements: EvolutionRequirement[] = [],
    learnableMoves: string[] = []
  ) {
    super(id, result, optional, consumeHeldItem, requirements, learnableMoves)
  }

  /** Test if the Context Evolution is valid. */
  abstract testContext(pokemon: PokemonData, context: RC): boolean;
  attemptEvolution(pokemon: PokemonData, context: RC): boolean {
    if (this.test(pokemon) && this.testContext(pokemon, context)) {
      return this.evolve(pokemon);
    }
    return false;
  }
}