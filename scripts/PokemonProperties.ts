import { PokemonData } from "./Pokemon";
import { toID } from "./showdown/sim/dex-data";
import { FormData } from "./speciesData"
import { tryRemoveNamespace } from "./utils";
import { statNames } from "./language/BattleMessage";

type KeyValuePair = [string, string | undefined];

/** A somewhat incomplete implimentation of PokemonProperties from the cobblemon source
 * @todo - Aspects, form, customProps?, status, registry usage
 * @remarks - Should be consistent with PokemonData
 */
export class PokemonProperties {
  originalString: string = "";
  species: string = "unown";
  name?: string;
  shiny?: boolean;
  gender?: string;
  level?: number;
  happiness?: number;
  pokeball?: string;
  nature?: string;
  ability?: string;
  status?: string;
  teraType?: string;
  dmaxLevel?: number;
  gmaxFactor?: boolean;
  tradeable?: boolean;

  constructor() { }

  static parse(input?: string): PokemonProperties {
    let props = new PokemonProperties();
    if (!input)
      return new PokemonProperties();
    props.originalString = input;
    let keyPairs = input.split(" ").map(x => {
      let [key, value] = x.split("=");
      return [key, value] as KeyValuePair;
    })

    props.gender = parseGender(keyPairs, ["gender"]);
    props.species = parseSpecies(keyPairs);
    props.level = parseIntProperty(keyPairs, ["level", "lvl", "l"]);
    props.shiny = parseBooleanProperty(keyPairs, ["shiny", "s"]);
    props.happiness = parseIntProperty(keyPairs, ["friendship"]);
    props.pokeball = parseStringProperty(keyPairs, ["pokeball"]);
    props.nature = parseStringCleaned(keyPairs, ["nature"]);
    props.ability = parseStringCleaned(keyPairs, ["ability"]);
    //props.status = parseStringOfRegistry(keyPairs, ["status"], id => (Statuses.getStatus(id) || Statuses.getStatus(id.asIdentifierDefaultingNamespace()))?.showdownName);
    props.name = parseStringProperty(keyPairs, ["nickname", "nick"]);
    props.teraType = parseStringCleaned(keyPairs, ["tera_type", "tera"]);
    props.dmaxLevel = parseIntProperty(keyPairs, ["dmax_level", "dmax"]);
    props.gmaxFactor = parseBooleanProperty(keyPairs, ["gmax_factor", "gmax"]);
    props.tradeable = parseBooleanProperty(keyPairs, ["tradeable", "tradable"]);

    let maybeIVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    let maybeEVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    Object.keys(maybeIVs).forEach(x => {
      let statName = statNames[x].toLowerCase();
      maybeIVs[x] = parseIntProperty(keyPairs, [`${statName}_iv`]) || maybeIVs[x];
      maybeEVs[x] = parseIntProperty(keyPairs, [`${statName}_ev`]) || maybeEVs[x];
    })

    return props;
  }

  /** Applies the form data to the pokmeon. Returns a clone with the applied pokemon data.
   */
  apply(pokemon: PokemonData) {
    let clone = PokemonData.getFromJson(JSON.stringify(pokemon));
    Object.entries(this).forEach(x => {
      if (x[1] !== undefined)
        clone[x[0]] = x[1];
    })
    return clone;
  }

  /** Tests if the pokmeon matches the pokemonProperties */
  match(pokemon: PokemonData): boolean {
    return Object.entries(this).every(x => pokemon[x[0]] === x[1]);
  }
}

function parseStringProperty(data: KeyValuePair[], labels: string[]): string | undefined {
  return data
    .filter(x => labels.includes(x[0]))
    .map(x => x[1])[0];
}

function parseIntProperty(data: KeyValuePair[], labels: string[]): number | undefined {
  return data
    .filter(x => labels.includes(x[0]))
    .map(x => (x[1]) ? parseInt(x[1]) : undefined)[0];
}

function parseBooleanProperty(data: KeyValuePair[], labels: string[]): boolean | undefined {
  return data
    .filter(x => labels.includes(x[0]))
    .map(x => [x[0], x[1]?.toLowerCase()])
    .map(x => (x[1] === undefined || x[1] === "yes" || x[1] == "true"))[0];
}

/** @todo Better validation and actual randomness. */
function parseSpecies(data: KeyValuePair[]): string {
  return (data[0][0] === "random") ? "bulbasaur" : data[0][0]
}

/** Converts to showdown gender. (just the first letter) */
function parseGender(data: KeyValuePair[], labels: string[]): string | undefined {
  return data
    .filter(x => labels.includes(x[0]))
    .map(x => [x[0], x[1]?.toLowerCase()])
    .map(x => x[1]?.substring(1))[0];
}

/** Parses string property but removes identifiers and cleans it up */
function parseStringCleaned(data: KeyValuePair[], labels: string[]) {
  let string = parseStringProperty(data, labels);
  if (string == undefined)
    return string;
  return tryRemoveNamespace(string).toLowerCase().replace(/[^a-z0-9_]+/g, '');
}