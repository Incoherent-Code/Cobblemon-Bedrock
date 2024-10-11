import { ScriptEventCommandMessageAfterEvent } from "@minecraft/server";
import { PokemonData } from "../Pokemon";
import { ExperienceGroups } from "../Experience";

export default function handleGainLevelEvent(arg: ScriptEventCommandMessageAfterEvent) {
  if (!arg.sourceEntity?.getComponent("type_family")?.hasTypeFamily("pokemon"))
    return;
  let pokemon = PokemonData.getFromEntity(arg.sourceEntity);
  let expGroup = ExperienceGroups[pokemon.getSpeciesData().experienceGroup];
  pokemon.gainExp(expGroup.getExperience(pokemon.level + 1) - expGroup.getExperience(pokemon.level), pokemon.tryGetOwner());
  pokemon.tryUpdatePokemonOut();
  pokemon.tryUpdatePokemonInTeam();
}