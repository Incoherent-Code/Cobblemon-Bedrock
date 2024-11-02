## Static Properties
- "cobblemon:in_battle" - All players and pokemon have this property that signifies wheteher or not a cobblemon or player is in battle
- "cobblemon:spawn_condition_used" - (Pokemon Only) - Indicates which spawn condition spawned a pokemon. Will be -1 if not spawned in naturally.
- "cobblemon:wild" - (Pokemon Only) - Indicates whether or not a pokemon is owned by a player
- "cobblemon:initialized" - Indicates whether or not the pokemon or player is initialized.
- "cobblemon:busy" - (Pokemon Only) - Indicates whether or not the pokemon is busy in another interaction.
- "cobblemon:disabled" - (Pokeball Only) - Indicates that the physics of the pokeball have been disabled to initiate a catch.

## Dynamic Properties
### Player
- "team" - a json of an array of 6 pokemon, either as the PokemonData class, or null. Use DecodePokemonArray() to decode.
- "initialized" - bool of whether or not the player is initialized. Will likely be undefined if uninitialized. Sorta deprecated because testing whether team is defined is a better method
- "box" + i - (Zero based indexing.) Json of BoxData interface in PokemonStorage.ts. Just use getBoxData().
- "in_battle" - UUID of battle they are currently in if they are in any.

### Pokemon
- "data" - json string of PokemonData. Use PokemonData.getFromJSON() or PokemonData.loadFromJSON()
- "uuid" - uuid of pokemon. Entity is also tagged with this uuid for better identification.
- "owner_name" - Name of player who owns the pokemon. Can be used to get the owner, but its better practive to get the owner id from the pokemon data
- "in_battle" - UUID of battle they are currently in if they are in any.

### Pokeball
- "player_id" - Entity id of thrower
- "activated" - Set to true if the pokeball has already hit a target (Prevents double hits)