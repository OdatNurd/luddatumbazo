--------------------------------------------------------------------------------
-- Core Tables
--
-- Sections here carry metadata about a specific game. All of these work in a
-- similar way and provide a mapping between the name of a thing, a slug that
-- will identify it uniquely, our internal ID, and any applicable BGG ID, which
-- is used during imports only.
--------------------------------------------------------------------------------


-- Games can exist in one or more of the full list of category, mechanic,
-- designer and so on. These tables provide the association that allows us to
-- determine which items are which.
DROP TABLE IF EXISTS CategoryPlacement;
CREATE TABLE CategoryPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),
    categoryId INTEGER NOT NULL REFERENCES Category(id)
);


DROP TABLE IF EXISTS MechanicPlacement;
CREATE TABLE MechanicPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),
    mechanicId INTEGER NOT NULL REFERENCES Mechanic(id)
);


DROP TABLE IF EXISTS DesignerPlacement;
CREATE TABLE DesignerPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),
    designerId INTEGER NOT NULL REFERENCES Designer(id)
);


DROP TABLE IF EXISTS ArtistPlacement;
CREATE TABLE ArtistPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),
    artistId INTEGER NOT NULL REFERENCES Artist(id)
);


DROP TABLE IF EXISTS PublisherPlacement;
CREATE TABLE PublisherPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameID INTEGER NOT NULL REFERENCES Game(id),
    publisherId INTEGER NOT NULL REFERENCES Publisher(id)
);


-- These tables contain the actual data for the various types of metadata that
-- the placement tables above deal in.
DROP TABLE IF EXISTS Category;
CREATE TABLE Category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);


DROP TABLE IF EXISTS Mechanic;
CREATE TABLE Mechanic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);


DROP TABLE IF EXISTS Designer;
CREATE TABLE Designer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);


DROP TABLE IF EXISTS Artist;
CREATE TABLE Artist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);


DROP TABLE IF EXISTS Publisher;
CREATE TABLE Publisher (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);


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




