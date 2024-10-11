import { Entity, ItemStack, Player, RawMessage } from "@minecraft/server";
import { message } from "../language";
import { PokemonData } from "../Pokemon";
import { ItemUtils } from "../utils";

/** PlaceHolder item translation until I find a method of getting item display_name */
const PHItemTranslation: RawMessage = { translate: "entity.item.name" };

export default function exchangeHeldItem(player: Player, pokemon: Entity) {
  let playerHandSlot = player.getComponent("inventory")?.container?.getSlot(player.selectedSlotIndex);
  let pokemonHandSlot = pokemon.getComponent("inventory")?.container?.getSlot(0);

  if (!playerHandSlot || !pokemonHandSlot)
    return;
  let playerItem = playerHandSlot.getItem();
  let pokemonItem = pokemonHandSlot.getItem();
  let pokemonData = PokemonData.getFromEntity(pokemon);
  if (!playerItem && !pokemonItem)
    return;

  if (playerItem && playerItem.typeId === pokemonItem?.typeId) {
    player.sendMessage(message.With({ translate: "cobblemon.held_item.already_holding" }, [pokemonData, PHItemTranslation]));
    return;
  }

  if (playerItem && !pokemonItem) {
    player.sendMessage(message.With({ translate: "cobblemon.held_item.give" }, [pokemonData, PHItemTranslation]));
    pokemonHandSlot.setItem(new ItemStack(playerItem.type, 1));
    ItemUtils.decrementItemInHand(player);
  }

  if (playerItem && pokemonItem) {
    player.sendMessage(message.With({ translate: "cobblemon.held_item.replace" }, [PHItemTranslation, pokemonData, PHItemTranslation]));
    pokemonHandSlot.setItem(new ItemStack(playerItem.type, 1));
    ItemUtils.decrementItemInHand(player);
    ItemUtils.givePlayerItem(player, pokemonItem);
  }

  if (!playerItem && pokemonItem) {
    player.sendMessage(message.With({ translate: "cobblemon.held_item.take" }, [PHItemTranslation, pokemonData]));
    playerHandSlot.setItem(pokemonItem);
    pokemonHandSlot.setItem();
  }

  //Ensures that the pokemon's held item is updated in data.
  pokemonData.loadFromCobblemon(pokemon);
  pokemonData.tryUpdatePokemonInTeam(player);
  pokemonData.tryUpdatePokemonOut();
}