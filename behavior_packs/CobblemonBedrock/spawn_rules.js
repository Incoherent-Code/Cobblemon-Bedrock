//Debug JS File to delete all pokemon spawn files in a list
//Takes in the json array output by cobblemon bedrock
const fs = require("fs");
const path = require("path");

if (!process.argv[2]) throw new Error("No fileList provided");
console.log("Deleting Files...");
let pokemon = JSON.parse(process.argv[2]);
pokemon.forEach(x => {
  try {
    fs.unlinkSync(path.join(__dirname, "spawn_rules", "cobblemon", x + ".json"));
  }
  catch (e) {
    console.warn(e.message);
  }
});
console.log("Done");