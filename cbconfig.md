This is documentation for all of the cbconfig settings.

## formatVersion
Ignore this property, it is for CobbleBuild

## cobblemonPath
Path to the cobblemon source. If this is not a valid path, Cobblebuild will download a copy of the source to the extractedResources folder.

## minecraftJavaPath
Path to either the minecraft java .jar or an already extracted form of that jar. If it is the jar, a copy will be extracted to ./extractedResources.

## minecraftPath and minecraftPreviewPath
Path to the com.mojang folder for either minecraft or minecraft preview. You only need to define the preview path if you are using useMinecraftPreview

## useMinecraftPreview
Whether or not to use minecraftPreview. This only affects what path gulp uses and what minecraft CobbleBuild will launch with the "launch" parameter.

## BPName and RPName
The folder name of the main behavior path and resource pack.

## usePowershell
(Windows Only) - Runs commands in powershell instead of using the crossplatform runner. Only works on windows.

## minify
Enables minification in esbuild and makes cobblebuild output json files without indentation.

## temporaryExtract
Makes it so that automatically extracted resources like the minecraft .jar and the cobblemon source code delete upon finishing. Generally not recomended anymore.

## gulpArgs
Arguments gulp should run with using the deploy task.

## cachePosers
Tells cobblebuild to output posers in the ./poserCache directory. This allows cobblebuild to run even if "translatePosers" is not included in the tasks.

## tasks
What tasks CobbleBuild will do by default. These tasks can also be run individually by using them as an argument to cobblebuild.
The avaliable tasks are as follows:
- clean - Cleans the old data out
- translate - Converts all the cobblemon text translations to bedrock edition and inserts the keys specified in the ./base_translations folder
- posers - Converts all the posers to a format that CobbleBuild can understand. Must be done at least once for Cobblebuild to be able to assemble the pack properly.
- sounds - Imports all of the sounds from cobblemon to bedrock edition. Empty sounds that are just filler are filtered out during this process
- build - The main build task of cobblebuild. Imports pokemon, pokeballs, berries, recipies, and much more
- deploy - After cobblebuild completes, gulp will run to deploy the changes to minecraft.
- launch - After cobblebuild completes, this should launch minecraft or minecraft preview depending on "useMinecraftPreview". This uses minecraft's URI `minecraft://`, so it should be multiplatform.