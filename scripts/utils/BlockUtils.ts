import { Block, DimensionLocation } from "@minecraft/server";

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

/**Returns an array of blocks within the box provided centered to center
 * @param sizeZ Will assume sizeX if not specified
 * @returns All blocks (filters out undefineds, like if the blocks are in an unloaded chunk)
  */
export function getAllBlocksFromCenter(center: DimensionLocation, sizeX: number, sizeY: number, sizeZ = sizeX): Block[] {
  let minx = Math.floor(center.x - sizeX / 2);
  let miny = Math.floor(center.y - sizeY / 2);
  let minz = Math.floor(center.z - sizeZ / 2);

  let maxx = Math.ceil(center.x + sizeX / 2);
  let maxy = Math.ceil(center.y + sizeY / 2);
  let maxz = Math.ceil(center.z + sizeZ / 2);

  let output: (Block | undefined)[] = [];
  for (let x = minx; x <= maxx; x++) {
    for (let y = miny; y <= maxy; y++) {
      for (let z = minz; z <= maxz; z++) {
        output.push(center.dimension.getBlock({ x: x, y: y, z: z }));
      }
    }
  }
  return output.filter(x => x != undefined);
}

