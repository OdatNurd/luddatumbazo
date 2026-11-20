DROP TABLE IF EXISTS SessionReportPlayer;
DROP TABLE IF EXISTS SessionReportExpansions;
DROP TABLE IF EXISTS SessionReportDetails;
DROP TABLE IF EXISTS SessionReport;
DROP TABLE IF EXISTS GuestUser;
DROP TABLE IF EXISTS GameOwners;
DROP TABLE IF EXISTS GameLoans;
DROP TABLE IF EXISTS WishlistContents;
DROP TABLE IF EXISTS WishList;
DROP TABLE IF EXISTS StorageLocation;
DROP TABLE IF EXISTS GameExpansion;
DROP TABLE IF EXISTS GameMetadataPlacement;
DROP TABLE IF EXISTS GameMetadata;
DROP TABLE IF EXISTS GamePickerFilter;
DROP TABLE IF EXISTS UserHousehold;
DROP TABLE IF EXISTS GameName;
DROP TABLE IF EXISTS Game;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Household;


CREATE TABLE Household (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
);

CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    externalId TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    displayName TEXT NOT NULL,
    emailAddress TEXT NOT NULL
);

CREATE TABLE UserHousehold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES User(id),
    householdId INTEGER NOT NULL REFERENCES Household(id),
    isPrimary INTEGER DEFAULT(false)
);

CREATE TABLE GamePickerFilter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    householdId INTEGER NOT NULL REFERENCES Household(id) ON DELETE CASCADE,
    userId INTEGER NOT NULL REFERENCES User(id),
    name TEXT NOT NULL COLLATE NOCASE,
    filterJson TEXT NOT NULL,
    createdAt TIME NOT NULL,
    updatedAt TIME DEFAULT(NULL)
);

CREATE TABLE Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    publishedIn INTEGER NOT NULL,
    minPlayers INTEGER DEFAULT(1),
    maxPlayers INTEGER DEFAULT(1),
    minPlaytime INTEGER DEFAULT(1),
    maxPlaytime INTEGER DEFAULT(1),
    complexity REAL DEFAULT(1.0),
    imagePath TEXT DEFAULT('')
);

CREATE TABLE GameName (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    name TEXT NOT NULL,
    isPrimary INTEGER DEFAULT(false)
);

CREATE TABLE GameOwners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    householdId INTEGER NOT NULL REFERENCES Household(id),
    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),
    gamePublisher INTEGER NOT NULL REFERENCES GameMetadata(id),
    storageLocationId INTEGER,
    isOnShelf INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE GameExpansion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baseGameId INTEGER,
    baseGameBggId INTEGER DEFAULT(0),
    expansionGameId INTEGER,
    expansionGameBggId INTEGER DEFAULT(0),
    entryName TEXT
);

CREATE TABLE GameMetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metatype TEXT,
    bggId INTEGER DEFAULT(0),
    slug TEXT NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE GameMetadataPlacement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    metatype TEXT,
    itemId INTEGER REFERENCES GameMetadata(id)
);

CREATE TABLE SessionReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL,
    playType TEXT,
    loggingPlayerId INTEGER,
    sessionBegin TIME NOT NULL,
    sessionEnd TIME DEFAULT(NULL),
    isLearning INTEGER DEFAULT(false)
);

CREATE TABLE SessionReportPlayer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    userId INTEGER,
    guestId INTEGER,
    isReporter INTEGER DEFAULT(false),
    isStartingPlayer INTEGER DEFAULT(false),
    score INTEGER DEFAULT(0),
    isWinner INTEGER DEFAULT(false)
);


INSERT INTO Household (id, name, slug)
     VALUES (10, 'Martins', 'martins'),
            (11, 'Other', 'other');

INSERT INTO User (id, externalId, firstName, lastName, displayName, emailAddress)
     VALUES (1, 'user-1', 'Terence', 'Martin', 'Terence M.', 'terence@example.com'),
            (2, 'user-2', 'Marisue', 'Martin', 'Marisue M.', 'marisue@example.com');

INSERT INTO UserHousehold (userId, householdId, isPrimary)
     VALUES (1, 10, 1),
            (2, 10, 1);

INSERT INTO Game (id, bggId, slug, description, publishedIn,
                  minPlayers, maxPlayers, minPlaytime, maxPlaytime, complexity)
     VALUES (100, 800, 'wingspan', 'Birds.', 2019, 1, 5, 40, 70, 2.46),
            (101, 801, 'calico', 'Quilts.', 2020, 1, 4, 30, 45, 2.18),
            (102, 802, 'harmonies', 'Habitats.', 2024, 1, 4, 30, 45, 1.96),
            (103, 803, 'forest-shuffle', 'Forest.', 2023, 2, 5, 40, 60, 2.17),
            (104, 804, 'azul', 'Tiles.', 2017, 2, 4, 30, 45, 1.8),
            (105, 805, 'long-epic', 'Long.', 2021, 2, 4, 120, 180, 4.2),
            (106, 806, 'wingspan-europe', 'Expansion.', 2019, 1, 5, 40, 70, 2.46),
            (107, 900, 'bgg-only-expansion', 'Imported expansion.', 2020, 1, 2, 30, 30, 1.5),
            (108, 807, 'another-base', 'Another base.', 2022, 2, 6, 90, 120, 3.0),
            (109, 808, 'both-base-and-expansion', 'Both.', 2021, 2, 4, 45, 75, 2.5),
            (110, 809, 'not-owned', 'Not ours.', 2020, 2, 4, 30, 45, 2.0),
            (111, 810, 'tiny-duel', 'Two only.', 2022, 2, 2, 10, 20, 1.2);

INSERT INTO GameName (id, gameId, name, isPrimary)
     VALUES (100, 100, 'Wingspan', 1),
            (101, 101, 'Calico', 1),
            (102, 102, 'Harmonies', 1),
            (103, 103, 'Forest Shuffle', 1),
            (104, 104, 'Azul', 1),
            (105, 105, 'Long Epic', 1),
            (106, 106, 'Wingspan: European Expansion', 1),
            (107, 107, 'Imported Expansion', 1),
            (108, 108, 'Another Base', 1),
            (109, 109, 'Both Base and Expansion', 1),
            (110, 110, 'Not Owned', 1),
            (111, 111, 'Tiny Duel', 1);

INSERT INTO GameMetadata (id, metatype, slug, name)
     VALUES (1, 'category', 'animals', 'Animals'),
            (2, 'category', 'environmental', 'Environmental'),
            (3, 'category', 'puzzle', 'Puzzle'),
            (4, 'mechanic', 'open-drafting', 'Open Drafting'),
            (5, 'mechanic', 'hand-management', 'Hand Management'),
            (99, 'publisher', 'test-publisher', 'Test Publisher');

INSERT INTO GameMetadataPlacement (gameId, metatype, itemId)
     VALUES (100, 'category', 1), (100, 'category', 2), (100, 'mechanic', 4),
            (101, 'category', 1), (101, 'mechanic', 4),
            (102, 'category', 1),
            (103, 'category', 1),
            (104, 'category', 3),
            (105, 'category', 2), (105, 'mechanic', 5),
            (106, 'category', 1),
            (108, 'category', 2),
            (109, 'category', 1), (109, 'mechanic', 5);

INSERT INTO GameOwners (householdId, gameId, gameName, gamePublisher, isOnShelf)
     VALUES (10, 100, 100, 99, 0),
            (10, 101, 101, 99, 0),
            (10, 102, 102, 99, 0),
            (10, 103, 103, 99, 0),
            (10, 104, 104, 99, 0),
            (10, 105, 105, 99, 0),
            (10, 106, 106, 99, 0),
            (10, 107, 107, 99, 0),
            (10, 108, 108, 99, 0),
            (10, 109, 109, 99, 0),
            (10, 111, 111, 99, 0),
            (11, 100, 100, 99, 0);

-- 106 is a pure local expansion of 100.
-- 107 is an expansion known only by BGG id.
-- 109 is an expansion of 100 but also a base for 106, so it stays eligible.
INSERT INTO GameExpansion (baseGameId, baseGameBggId, expansionGameId, expansionGameBggId, entryName)
     VALUES (100, 0, 106, 0, 'European Expansion'),
            (0, 800, 0, 900, 'Imported Expansion'),
            (100, 0, 109, 0, 'Both'),
            (109, 0, 106, 0, 'European Expansion');

INSERT INTO SessionReport (id, gameId, gameName, playType, loggingPlayerId, sessionBegin, sessionEnd, isLearning)
     VALUES (1, 100, 100, 'cardboard', 1, '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z', 0),
            (2, 101, 101, 'cardboard', 1, '2024-06-01T10:00:00Z', '2024-06-01T10:30:00Z', 0),
            (3, 100, 100, 'cardboard', 1, '2025-02-01T10:00:00Z', '2025-02-01T11:00:00Z', 1),
            (4, 104, 104, 'boardgamearena', 2, '2025-03-01T10:00:00Z', '2025-03-01T10:20:00Z', 0),
            (5, 102, 102, 'cardboard', 2, '2025-01-15T10:00:00Z', '2025-01-15T10:30:00Z', 0);

INSERT INTO SessionReportPlayer (sessionId, userId, guestId, isReporter, isStartingPlayer, isWinner)
     VALUES (1, 1, NULL, 1, 1, 1),
            (2, 1, NULL, 1, 1, 1),
            (3, 1, NULL, 1, 1, 1),
            (4, NULL, 50, 1, 1, 1),
            (5, 2, NULL, 1, 1, 1);
