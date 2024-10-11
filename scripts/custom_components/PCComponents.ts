import { Block, BlockComponentOnPlaceEvent, BlockComponentPlayerInteractEvent, BlockCustomComponent } from "@minecraft/server";
import { openPCGui } from "../GUI";
import { message } from "../language";
import { tryGetBattleFromEntity } from "../battle";


export class PCBottomComponent implements BlockCustomComponent {
  async onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (!arg.player) return;
    if (tryGetBattleFromEntity(arg.player)) {
      arg.player.sendMessage(message.error({ translate: "cobblemon.pc.inbattle" }));
      return;
    }
    addUserToPCTop(arg.block.above()!);
    attemptCleanup(arg.block.above()!);
    await openPCGui(arg.player);
    removeUserFromPCTop(arg.block.above()!);
  }
}
export class PCTopComponent implements BlockCustomComponent {
  async onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (!arg.player) return;
    if (tryGetBattleFromEntity(arg.player)) {
      arg.player.sendMessage(message.error({ translate: "cobblemon.pc.inbattle" }));
      return;
    }
    addUserToPCTop(arg.block);
    attemptCleanup(arg.block);
    await openPCGui(arg.player);
    removeUserFromPCTop(arg.block);
  }
}
//Only use these function on the top part of the pc
/** Half Baked cleanup script to try and curb ghost users */
function attemptCleanup(pc: Block) {
  if (pc.typeId != "cobblemon:pc_top") return;
  let currentUsers = pc.permutation.getState("cobblemon:user_count") as number;
  let playersNearby = pc.dimension.getPlayers({ location: pc.location, maxDistance: 7 });
  if (currentUsers > playersNearby.length) {
    pc.setPermutation(pc.permutation.withState("cobblemon:user_count", playersNearby.length));
  }
}
function addUserToPCTop(pc: Block) {
  if (pc.typeId != "cobblemon:pc_top") return;
  let currentUsers = pc.permutation.getState("cobblemon:user_count") as number;
  if (currentUsers > 14) return; //state exceeds the max value of 15
  let newPermutation = pc.permutation.withState("cobblemon:user_count", currentUsers + 1);
  pc.setPermutation(newPermutation);
  pc.dimension.playSound("pc.on", pc.location);
}
function removeUserFromPCTop(pc: Block) {
  if (pc.typeId != "cobblemon:pc_top") return;
  let currentUsers = pc.permutation.getState("cobblemon:user_count") as number;
  if (currentUsers < 1) throw new Error("PC User Count cannot go below zero."); //Going subzero ????
  let newPermutation = pc.permutation.withState("cobblemon:user_count", currentUsers - 1);
  pc.setPermutation(newPermutation);
  pc.dimension.playSound("pc.off", pc.location);
}