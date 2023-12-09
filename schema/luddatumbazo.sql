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
    slug TEXT NOT NULL,

    name TEXT NOT NULL
);
CREATE INDEX idx_metadata_type_map ON GameMetadata(metatype, bggId);
CREATE UNIQUE INDEX idx_metadata_metaslug_map ON GameMetadata(metatype, slug);
CREATE INDEX idx_metadata_slug_map ON GameMetadata(slug);


DROP TABLE IF EXISTS GameName;
CREATE TABLE GameName (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),

    name TEXT NOT NULL,
    isPrimary INTEGER DEFAULT(false)
);
CREATE INDEX idx_gamename_id ON GameName(gameId);


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
