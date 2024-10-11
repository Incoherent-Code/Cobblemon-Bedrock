import { BlockComponentPlayerDestroyEvent, BlockCustomComponent, GameMode } from "@minecraft/server";

export default class DropExpRewardComponent implements BlockCustomComponent {
  onPlayerDestroy(arg: BlockComponentPlayerDestroyEvent) {
    if (arg.player?.getGameMode() == GameMode.creative)
      return;
    for (let i = 0; i < Math.random() * 3; i++) {
      arg.dimension.spawnEntity("minecraft:xp_orb", arg.block.location);
    }
  }
}