import { Player, RawMessage } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"
import { typeColorCodes } from "../language";
import { getPokemonSpriteTexture } from ".";


const starters = [
  "bulbasaur", "squirtle", "charmander",
  "chikorita", "totodile", "cyndaquil",
  "treecko", "mudkip", "torchic",
  "turtwig", "piplup", "chimchar",
  "snivy", "oshawott", "tepig",
  "chespin", "froakie", "fennekin",
  "rowlet", "popplio", "litten",
  "grookey", "sobble", "scorbunny",
  "sprigatito", "quaxly", "fuecoco"
]

export async function showStarterGUI(player: Player): Promise<string | undefined> {
  var GUI = new ActionFormData()
    .title({ translate: "cobblemon.ui.starter.title" })

  starters.forEach((x, i) => {
    var buttonText: RawMessage = { translate: `cobblemon.species.${x}.name` };
    let typeColor: string = "§l";
    if (i % 3 == 0) {
      typeColor += typeColorCodes.grass;
    }
    else if ((i + 1) % 3 == 0) {
      typeColor += typeColorCodes.fire;
    }
    else if ((i + 2) % 3 == 0) {
      typeColor += typeColorCodes.water;
    }
    GUI.button({ rawtext: [{ text: typeColor }, buttonText] }, getPokemonSpriteTexture(x));
  })
  let response = await GUI.show(player);
  if (response.selection === undefined)
    return undefined;
  return starters[response.selection];
}