# Cobblemon Bedrock
Minecraft Bedrock Addon that aims to port Cobblemon to Minecraft Bedrock Edition

# Build Steps
1. Ensure NodeJS is installed on your system.
2. Run `npm install` in the root folder of the project.
3. Modify cbconfig.json to point to where minecraft's com.mojang file is located. (This should not need to be changed on windows)
If you want to manually install, you can specify any valid folder and use `gulp release` instead.
5. Run `gulp` to build automatically to minecraft.

Note: If you want to quickly build only the scripts, you can run `gulp quick_scripts` to quickly build the scripts and apply to minecraft. From there, you can just use /reload to reload scripts in minecraft. `gulp watch_scripts` can do this automatically when you modify the script.

# Release
Run `gulp release` to create a .mcaddon file in the ./dist directory.

# Disclaimer
All Assets, including models, textures, and sounds, are licensed under CCPL. A copy of this license can be found in the /resource_packs/CobblemonBedrock/models/cobblemon folder. These assets were created by the cobblemon team, and may be modified from the original to work inside Minecraft: Bedrock Edition. Pokemon is a trademark of Nintendo and The Pokemon Company. This project is not affiliated with Nintendo or The Pokemon Company
