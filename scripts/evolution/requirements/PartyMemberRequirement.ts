import { PokemonData } from "../../Pokemon";
import { EvolutionRequirement } from "../EvolutionRequirement";
import { PokemonProperties } from "../../PokemonProperties";
import { EvoRequirement } from "../../speciesData";
import { getTeam } from "../../pokemonStorage";

export default class PartyMemberRequirement extends EvolutionRequirement {
  variant = "party_member";
  constructor(
    public target: PokemonProperties,
    public contains = true
  ) { super() }
  /** @todo Allow for more than one defeat requirement to work. */
  check(pokemon: PokemonData): boolean {
    let owner = pokemon.tryGetOwner();
    if (!owner)
      return false;
    let party = getTeam(owner);
    if (!party)
      return false;
    let has = party.filter(x => x != null).some(member => member.uuid !== pokemon.uuid && this.target.match(member));
    return this.contains === has;
  }
  static getFromSerialized(requirement: EvoRequirement): PartyMemberRequirement {
    return new PartyMemberRequirement(PokemonProperties.parse(requirement.target || "unown"), requirement.contains);
  }
}