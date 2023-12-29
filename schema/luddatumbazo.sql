DROP TABLE IF EXISTS GameExpansion;
CREATE TABLE GameExpansion (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,

    baseGameId INTEGER REFERENCES Game(id),
    baseGameBggId INTEGER DEFAULT(0),

    expansionGameId INTEGER REFERENCES Game(id),
    expansionGameBggId INTEGER DEFAULT(0),

    entryName TEXT
);
CREATE INDEX idx_game_expand_base ON GameExpansion(baseGameBggId, baseGameId);
CREATE INDEX idx_game_expand_expansion ON GameExpansion(expansionGameBggId, expansionGameId);

DROP TABLE IF EXISTS GameMetadataPlacement;
CREATE TABLE GameMetadataPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),

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
    teachingURL TEXT DEFAULT(''),
    imagePath TEXT DEFAULT('')
);


DROP TABLE IF EXISTS User;
CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    externalId TEXT UNIQUE NOT NULL,

    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED,

    emailAddress TEXT NOT NULL
);
CREATE INDEX idx_user_ext ON User(externalId);
CREATE UNIQUE INDEX idx_user_name ON User(firstName, lastName);

DROP TABLE IF EXISTS Household;
CREATE TABLE Household (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
);
CREATE INDEX idx_household_slug ON Household(slug);


DROP TABLE IF EXISTS UserHousehold;
CREATE TABLE UserHousehold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    userId INTEGER NOT NULL REFERENCES User(id),
    householdId INTEGER NOT NULL REFERENCES Household(id)
);
CREATE UNIQUE INDEX idx_user_household ON UserHousehold(userId, householdId);


DROP TABLE IF EXISTS GameOwners;
CREATE TABLE GameOwners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    householdId INTEGER NOT NULL REFERENCES Household(id),
    gameId INTEGER NOT NULL REFERENCES Game(id),

    gameName INTEGER NOT NULL REFERENCES GameName(id),
    gamePublisher INTEGER NOT NULL REFERENCES GameMetadata(id)
);


-- We could also add a table to track loan history, which would include when the loan happened
DROP TABLE IF EXISTS GameLoans;
CREATE TABLE GameLoans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    gameId INTEGER NOT NULL REFERENCES GameOwners(id),

    loanedTo INTEGER NOT NULL REFERENCES Household(id),
    loanTime DATE NOT NULL
);


DROP TABLE IF EXISTS Wishlist;
CREATE TABLE Wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    householdId INTEGER NOT NULL REFERENCES Household(id),
    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),

    addedByUserId INTEGER NOT NULL REFERENCES User(id)
);


DROP TABLE IF EXISTS GuestUser;
CREATE TABLE GuestUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED
);
CREATE UNIQUE INDEX idx_guest_name ON GuestUser(firstName, lastName);
INSERT INTO GuestUser VALUES(1,'Marisue','Martin');


DROP TABLE IF EXISTS SessionReportDetails;
CREATE TABLE SessionReportDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),

    title TEXT DEFAULT(''),
    content TEXT DEFAULT('')
);

DROP TABLE IF EXISTS SessionReportExpansions;
CREATE TABLE SessionReportExpansions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    expansionId INTEGER NOT NULL REFERENCES Game(id),
    expansionName INTEGER NOT NULL REFERENCES GameName(id)
);

DROP TABLE IF EXISTS SessionReportPlayer;
CREATE TABLE SessionReportPlayer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    userId INTEGER REFERENCES User(id),
    guestId INTEGER REFERENCES GuestUser(id),

    isReporter INTEGER DEFAULT(false),
    isStartingPlayer INTEGER DEFAULT(false),
    score INTEGER DEFAULT(0),
    isWinner INTEGER DEFAULT(false)
);

DROP TABLE IF EXISTS SessionReport;
CREATE TABLE SessionReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),

    sessionBegin TIME NOT NULL,
    sessionEnd TIME DEFAULT(NULL),

    isLearning INTEGER DEFAULT(false)
);
