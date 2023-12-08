--------------------------------------------------------------------------------
-- Core Tables
--
-- Sections here carry metadata about a specific game. All of these work in a
-- similar way and provide a mapping between the name of a thing, a slug that
-- will identify it uniquely, our internal ID, and any applicable BGG ID, which
-- is used during imports only.
--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GameMetadataPlacement;
CREATE TABLE GameMetadataPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),

    metatype VARCHAR CHECK(metatype in ("designer", "artist", "publisher", "mechanic", "category")),
    itemId INTEGER REFERENCES GameMetadata(id)
);
CREATE INDEX idx_metadata_place_map ON GameMetadataPlacement(metatype, itemId);


DROP TABLE IF EXISTS GameMetadata;
CREATE TABLE GameMetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    metatype VARCHAR CHECK(metatype in ("designer", "artist", "publisher", "mechanic", "category")),
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);
CREATE INDEX idx_metadata_type_map ON GameMetadata(metatype, bggId);
CREATE INDEX idx_metadata_slug_map ON GameMetadata(slug);


-- Games can have many names associates with them, such as for different
-- languages or when a reprint happens; this table tracks all the names a game
-- can be known by, and marks one as the name that the game is primarily known
-- by as well.
DROP TABLE IF EXISTS GameName;
CREATE TABLE GameName (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),

    name TEXT NOT NULL,
    isPrimary INTEGER DEFAULT(false)
);
CREATE INDEX idx_gamename_id ON GameName(gameId);


-- The main table that stores the core information about any specific game.
--
-- We key these on our own internal game ID but we also have an associated
-- BoardGameGeek ID so that we can cross associate; this is not required since
-- some games may be home grown and not stored there.
DROP TABLE IF EXISTS Game;
CREATE TABLE Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),
    expandsGameId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    publishedIn INTEGER NOT NULL,

    minPlayers INTEGER DEFAULT(1),
    maxPlayers INTEGER DEFAULT(1),

    minPlayerAge INTEGER DEFAULT(1),

    playtime INTEGER DEFAULT(1),
    minPlaytime INTEGER DEFAULT(1),
    maxPlaytime INTEGER DEFAULT(1),

    complexity REAL DEFAULT(1.0),

    officialURL TEXT DEFAULT(''),
    teachingURL TEXT DEFAULT('')
);
CREATE INDEX idx_game_slug ON Game(slug);
