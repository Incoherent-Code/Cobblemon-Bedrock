# Cobblemon Bedrock
Minecraft Bedrock Addon that aims to port Cobblemon to Minecraft Bedrock Edition

The original project can be found [here](https://gitlab.com/cable-mc/cobblemon).

# Build Steps
1. Ensure NodeJS is installed on your system.
2. Run `npm install` in the root folder of the project.
3. Modify cbconfig.json to point to where minecraft's com.mojang file is located. (This should not need to be changed on windows)
If you want to manually install the addon using the .mcaddon format, you can specify any valid folder and use `gulp release` instead.
5. Run `gulp` to build automatically to minecraft.

Note: If you want to quickly build only the scripts, you can run `gulp quick_scripts` to quickly build the scripts and apply to minecraft. From there, you can just use /reload to reload scripts in minecraft. `gulp watch_scripts` can do this automatically when you modify the script.

# Release
Run `gulp release` to create a .mcaddon file in the ./dist directory.

# Contributing
Contributions are welcome. 
The main thing to note is that this repo works in tandom with [CobbleBuild](https://github.com/Incoherent-Code/CobbleBuild) to import assets from the orignal source code. Textures, sounds, spawn rules, and even the pokemon themselves are usually imported with cobblebuild. Definition files generated this way will have a disclaimer at the top and should not be overwritten manually. There are exceptions, like when a texture had to be modified to work with the bedrock converted model. These exceptions should be kept out of folders that cobblebuild overrides. Ex: healing_machine_flipbook.png is in the root textures folder instead of textures/block. 

# Debugging
Debugging is done through the [Minecraft Bedrock Debugger](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger). This is exclusive to vscode, so do keep that in mind.

# Disclaimer
All Assets, including models, textures, and sounds, are licensed under CCPL. A copy of this license can be found in the /resource_packs/CobblemonBedrock/models/cobblemon folder. These assets were created by the cobblemon team, and may be modified from the original to work inside Minecraft: Bedrock Edition. Pokemon is a trademark of Nintendo and The Pokemon Company. This project is not affiliated with Nintendo or The Pokemon Company
