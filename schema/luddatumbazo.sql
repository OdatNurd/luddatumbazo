DROP TABLE IF EXISTS GameExpansion;
CREATE TABLE GameExpansion (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,

    baseGameId INTEGER REFERENCES Game(id),
    baseGameBggId INTEGER DEFAULT(0),

    expansionGameId INTEGER REFERENCES Game(id),
    expansionGameBggId INTEGER DEFAULT(0),

    entryName TEXT
);
CREATE INDEX idx_game_expand_base ON GameExpansion(baseGameId);
CREATE INDEX idx_game_expand_expansion ON GameExpansion(expansionGameId);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GameMetadataPlacement;
CREATE TABLE GameMetadataPlacement (
    id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),

    metatype TEXT CHECK(metatype in ("designer", "artist", "publisher", "mechanic", "category")),
    itemId INTEGER REFERENCES GameMetadata(id)
);
CREATE INDEX idx_metadata_place_map ON GameMetadataPlacement(gameId, metatype, itemId);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GameMetadata;
CREATE TABLE GameMetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    metatype TEXT CHECK(metatype in ("designer", "artist", "publisher", "mechanic", "category")),
    bggId INTEGER DEFAULT(0),
    slug TEXT NOT NULL,

    name TEXT NOT NULL
);
CREATE INDEX idx_metadata_type_map ON GameMetadata(metatype, bggId);
CREATE UNIQUE INDEX idx_metadata_metaslug_map ON GameMetadata(metatype, slug);
CREATE INDEX idx_metadata_slug_map ON GameMetadata(slug);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GameName;
CREATE TABLE GameName (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),

    name TEXT NOT NULL COLLATE NOCASE,
    isPrimary INTEGER DEFAULT(false)
);
CREATE INDEX idx_gamename_id ON GameName(gameId);
CREATE INDEX idx_gamename_primary on GameName(gameId, isPrimary) WHERE isPrimary = 1;
CREATE INDEX idx_gamename_name on GameName(name);


--------------------------------------------------------------------------------


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
CREATE INDEX idx_game_slug on Game(slug);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS User;
CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    externalId TEXT UNIQUE NOT NULL,

    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    displayName TEXT NOT NULL COLLATE NOCASE,

    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED,

    emailAddress TEXT NOT NULL
);
CREATE INDEX idx_user_ext ON User(externalId);

DROP TABLE IF EXISTS Household;
CREATE TABLE Household (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
);
CREATE INDEX idx_household_slug ON Household(slug);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS UserHousehold;
CREATE TABLE UserHousehold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    userId INTEGER NOT NULL REFERENCES User(id),
    householdId INTEGER NOT NULL REFERENCES Household(id),

    isPrimary INTEGER DEFAULT(false)
);
CREATE UNIQUE INDEX idx_user_household_combo ON UserHousehold(userId, householdId);
CREATE INDEX idx_user_household ON UserHousehold(householdId);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GameOwners;
CREATE TABLE GameOwners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    householdId INTEGER NOT NULL REFERENCES Household(id),
    gameId INTEGER NOT NULL REFERENCES Game(id),

    gameName INTEGER NOT NULL REFERENCES GameName(id),
    gamePublisher INTEGER NOT NULL REFERENCES GameMetadata(id)
);

CREATE INDEX idx_game_owner_games ON GameOwners(gameId);
CREATE INDEX idx_game_owner_list ON GameOwners(householdId, gameId, gameName);


--------------------------------------------------------------------------------


-- We could also add a table to track loan history, which would include when the loan happened
DROP TABLE IF EXISTS GameLoans;
CREATE TABLE GameLoans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    gameId INTEGER NOT NULL REFERENCES GameOwners(id),

    loanedTo INTEGER NOT NULL REFERENCES Household(id),
    loanTime DATE NOT NULL
);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS WishList;
CREATE TABLE WishList (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    householdId INTEGER NOT NULL REFERENCES Household(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    isRoot INTEGER DEFAULT(false)
);
CREATE UNIQUE INDEX idx_wishlist ON WishList(householdId, slug);
CREATE UNIQUE INDEX idx_wishlist_roots ON WishList(householdId, isRoot) WHERE isRoot = 1;


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS WishlistContents;
CREATE TABLE WishlistContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    householdId INTEGER NOT NULL REFERENCES Household(id),
    wishlistId INTEGER NOT NULL REFERENCES Wishlist(id),

    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),

    addedByUserId INTEGER NOT NULL REFERENCES User(id)
);
CREATE INDEX idx_wishlist_content ON WishlistContents(householdId, gameId, gameName, wishlistId);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS GuestUser;
CREATE TABLE GuestUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    displayName TEXT NOT NULL COLLATE NOCASE,

    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED
);
CREATE UNIQUE INDEX idx_guest_name ON GuestUser(firstName, lastName);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS SessionReportDetails;
CREATE TABLE SessionReportDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),

    title TEXT DEFAULT(''),
    content TEXT DEFAULT('')
);
CREATE INDEX idx_session_details on SessionReportDetails(sessionId);


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS SessionReportExpansions;
CREATE TABLE SessionReportExpansions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    expansionId INTEGER NOT NULL REFERENCES Game(id),
    expansionName INTEGER NOT NULL REFERENCES GameName(id)
);
CREATE INDEX idx_session_expansion_game ON SessionReportExpansions(sessionId, expansionId);


--------------------------------------------------------------------------------


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
CREATE INDEX idx_session_players on SessionReportPlayer(sessionId, userId) WHERE userId IS NOT NULL;
CREATE INDEX idx_session_guests on SessionReportPlayer(sessionId, guestId) WHERE guestId IS NOT NULL;


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS SessionGameType;
CREATE TABLE SessionGameType (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL
);


INSERT INTO SessionGameType VALUES(NULL, "cardboard",         "Physical Game",      "box-seam");
INSERT INTO SessionGameType VALUES(NULL, "boardgamearena",    "BoardGameArena",     "globe");
INSERT INTO SessionGameType VALUES(NULL, "steam",             "Computer (Steam)",   "steam");
INSERT INTO SessionGameType VALUES(NULL, "gog",               "Computer (GOG)",     "pc-display-horizontal");
INSERT INTO SessionGameType VALUES(NULL, "android",           "Mobile",             "andriod2");
INSERT INTO SessionGameType VALUES(NULL, "tabletopsimulator", "Tabletop Simulator", "headset-vr");
INSERT INTO SessionGameType VALUES(NULL, "drgncards",         "DrgnCards",          "person-vcard");


--------------------------------------------------------------------------------


DROP TABLE IF EXISTS SessionReport;
CREATE TABLE SessionReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),

    playType TEXT CHECK(playType in ("cardboard", "boardgamearena", "steam", "gog", "android")),

    sessionBegin TIME NOT NULL,
    sessionEnd TIME DEFAULT(NULL),

    isLearning INTEGER DEFAULT(false)
);
CREATE INDEX idx_session_game ON SessionReport(gameId);
CREATE INDEX idx_session_game_names ON SessionReport(gameId, gameName);


--------------------------------------------------------------------------------
