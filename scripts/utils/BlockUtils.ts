import { Block } from "@minecraft/server";

export const replacableBlocks = ["minecraft:air", "minecraft:water", "minecraft:lava", "minecraft:short_grass"];

export function changeBlockState(block: Block, state: string, value: string | boolean | number) {
  if (!block.isValid())
    throw new Error("Cannot change block state of invalid block.");
  block.setPermutation(block.permutation.withState(state, value));
}

export function tryChangeBlockState(block: Block, state: string, value: string | boolean | number): boolean {
  try {
    changeBlockState(block, state, value);
    return true;
  }
  catch {
    return false;
  }
}
/** Destroys the block with the block drop and particle animation,
 * Unlike block.setType("air")
 */
export function destroy(block: Block) {
  //I dont know if there's a better way to do this
  block.dimension.runCommandAsync(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air destroy`);
}

/** Takes in block states and loads it. */
export function loadStates(block: Block, states: Record<string, string | number | boolean>) {
  let permutation = block.permutation;
  Object.keys(states).forEach(x => {
    permutation = permutation.withState(x, states[x]);
  })
  block.setPermutation(permutation);
}

/** Destroys and replaces the block. Used to trigger .OnPlace() again for doubleBlockComponents
 * @param states allows you to provide block states to set to the reloaded block. (The block's other states will be retained.)
 */
export function reloadBlock(block: Block, states: Record<string, string | number | boolean> | undefined = undefined) {
  let blockState = (states) ? Object.assign(block.permutation.getAllStates(), states) : block.permutation.getAllStates();
  let blockId = block.typeId;
  block.setType("air");
  block.setType(blockId);
  loadStates(block, blockState);
}

