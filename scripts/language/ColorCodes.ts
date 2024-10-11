/** I made an npm package for this but it uses anbient enums, which are ususable with esbuild.
 * I cant use @minecraft/vanilla-data for the same reason.
 */

export enum ColorCodes {
  /** Hex: "#000000" */
  Black = "§0",
  /** Hex: "#0000AA" */
  DarkBlue = "§1",
  /** Hex: "#00AA00" */
  DarkGreen = "§2",
  /** Hex: "#00AAAA" */
  DarkAqua = "§3",
  /** Hex: "#AA0000" */
  DarkRed = "§4",
  /** Hex: "#AA00AA" */
  DarkPurple = "§5",
  /** Hex: "#FFAA00" */
  Gold = "§6",
  /** Hex: "#AAAAAA" */
  Gray = "§7",
  /** Hex: "#555555" */
  DarkGray = "§8",
  /** Hex: "#5555FF" */
  Blue = "§9",
  /** Hex: "#55FF55" */
  Green = "§a",
  /** Hex: "#55FFFF" */
  Aqua = "§b",
  /** Hex: "#FF5555" */
  Red = "§c",
  /** Hex: "#FF55FF" */
  LightPurple = "§d",
  /** Hex: "#FFFF55" */
  Yellow = "§e",
  /** Hex: "#FFFFFF" */
  White = "§f",
  /** Hex: "#DDD605"
   * @remarks Bedrock Only
   */
  MinecoinGold = "§g",
  /** Hex: "#E3D4D1"
   * @remarks Bedrock Only
   */
  AaterialQuartz = "§h",
  /** Hex: "#CECACA"
   * @remarks Bedrock Only
   */
  MaterialIron = "§i",
  /** Hex: "#443A3B"
   * @remarks Bedrock Only
   */
  MaterialNetherite = "§j",
  /** Hex: "#971607"
   * @remarks Bedrock Only
   */
  MaterialRedstone = "§m",
  /** Hex: "#B4684D"
   * @remarks Bedrock Only
   */
  MaterialCopper = "§n",
  /** Hex: "#DEB12D"
   * @remarks Bedrock Only
   */
  MaterialGold = "§p",
  /** Hex: "#47A036"
   * @remarks Bedrock Only
   */
  MaterialEmerald = "§q",
  /** Hex: "#2CBAA8"
   * @remarks Bedrock Only
   */
  MaterialDiamond = "§s",
  /** Hex: "#21497B"
   * @remarks Bedrock Only
   */
  MaterialLapis = "§t",
  /** Hex: "#9A5CC6"
   * @remarks Bedrock Only
   */
  MaterialAmethyst = "§u"
}

export enum FormatCodes {
  Obfuscated = "§k",
  Bold = "§l",
  Italic = "§o",
  Reset = "§r"
}