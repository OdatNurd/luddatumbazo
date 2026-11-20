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


CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    externalId TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    displayName TEXT NOT NULL,
    emailAddress TEXT NOT NULL
);


CREATE TABLE GuestUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    displayName TEXT NOT NULL
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


CREATE TABLE SessionReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),
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


INSERT INTO User (id, externalId, firstName, lastName, displayName, emailAddress)
     VALUES (1, 'user-1', 'Terence', 'Martin', 'Terence M.', 'terence@example.com'),
            (2, 'user-2', 'Marisue', 'Martin', 'Marisue M.', 'marisue@example.com');

INSERT INTO GuestUser (id, firstName, lastName, displayName)
     VALUES (50, 'Wayne', 'T', 'Wayne T.');

INSERT INTO Game (id, bggId, slug, description, publishedIn,
                  minPlayers, maxPlayers, minPlaytime, maxPlaytime, complexity)
     VALUES (100, 0, 'azul', 'A tile drafting game.', 2017, 2, 4, 30, 45, 1.8),
            (101, 0, 'calico', 'A quilt building game.', 2020, 1, 4, 30, 45, 2.2);

INSERT INTO GameName (id, gameId, name, isPrimary)
     VALUES (100, 100, 'Azul', 1),
            (101, 101, 'Calico', 1);

-- s1: two players, u1 starts and wins, 60 minutes.
-- s2: two players, tie (both winners), u1 starts, 30 minutes.
-- s3: two players, no winner, u2 starts, 20 minutes.
-- s4: solo u1, winner, 10 minutes.
-- s5: two players, u1 wins, nobody recorded as starter, 40 minutes.
-- s6: two players, end before start; u1 starts and wins.
-- s7: learning session, u1 starts and wins, 50 minutes.
-- s8: u1 plus a guest, u1 starts and wins, 25 minutes, BGA.
INSERT INTO SessionReport
  (id, gameId, gameName, playType, loggingPlayerId, sessionBegin, sessionEnd, isLearning)
     VALUES (1, 100, 100, 'cardboard', 1, '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z', 0),
            (2, 100, 100, 'cardboard', 1, '2024-01-02T10:00:00Z', '2024-01-02T10:30:00Z', 0),
            (3, 100, 100, 'cardboard', 1, '2024-01-03T10:00:00Z', '2024-01-03T10:20:00Z', 0),
            (4, 100, 100, 'cardboard', 1, '2024-01-04T10:00:00Z', '2024-01-04T10:10:00Z', 0),
            (5, 100, 100, 'cardboard', 1, '2024-01-05T10:00:00Z', '2024-01-05T10:40:00Z', 0),
            (6, 101, 101, 'cardboard', 1, '2024-01-06T10:00:00Z', '2024-01-06T09:00:00Z', 0),
            (7, 100, 100, 'cardboard', 1, '2024-01-07T10:00:00Z', '2024-01-07T10:50:00Z', 1),
            (8, 101, 101, 'boardgamearena', 1, '2024-01-08T10:00:00Z', '2024-01-08T10:25:00Z', 0);

INSERT INTO SessionReportPlayer
  (id, sessionId, userId, guestId, isReporter, isStartingPlayer, isWinner)
     VALUES (11, 1, 1, NULL, 1, 1, 1),
            (12, 1, 2, NULL, 0, 0, 0),
            (21, 2, 1, NULL, 1, 1, 1),
            (22, 2, 2, NULL, 0, 0, 1),
            (31, 3, 1, NULL, 0, 0, 0),
            (32, 3, 2, NULL, 1, 1, 0),
            (41, 4, 1, NULL, 1, 1, 1),
            (51, 5, 1, NULL, 1, 0, 1),
            (52, 5, 2, NULL, 0, 0, 0),
            (61, 6, 1, NULL, 1, 1, 1),
            (62, 6, 2, NULL, 0, 0, 0),
            (71, 7, 1, NULL, 1, 1, 1),
            (72, 7, 2, NULL, 0, 0, 0),
            (81, 8, 1, NULL, 1, 1, 1),
            (82, 8, NULL, 50, 0, 0, 0);
