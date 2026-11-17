DROP TABLE IF EXISTS SessionReportPlayer;
DROP TABLE IF EXISTS SessionReportExpansions;
DROP TABLE IF EXISTS SessionReportDetails;
DROP TABLE IF EXISTS SessionReport;
DROP TABLE IF EXISTS GuestUser;
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
    username TEXT,
    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    displayName TEXT NOT NULL COLLATE NOCASE,
    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED,
    emailAddress TEXT NOT NULL,
    picture TEXT
);


CREATE TABLE UserHousehold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES User(id),
    householdId INTEGER NOT NULL REFERENCES Household(id),
    isPrimary INTEGER DEFAULT(false)
);


CREATE TABLE Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bggId INTEGER DEFAULT(0),
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    publishedIn INTEGER NOT NULL,
    imagePath TEXT DEFAULT('')
);


CREATE TABLE GameName (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    name TEXT NOT NULL COLLATE NOCASE,
    isPrimary INTEGER DEFAULT(false)
);


CREATE TABLE GuestUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL COLLATE NOCASE,
    lastName TEXT NOT NULL COLLATE NOCASE,
    displayName TEXT NOT NULL COLLATE NOCASE,
    name GENERATED ALWAYS AS (firstName || ' ' || lastName) STORED
);


CREATE TABLE SessionReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id),
    gameName INTEGER NOT NULL REFERENCES GameName(id),
    playType TEXT,
    loggingPlayerId INTEGER REFERENCES User(id),
    sessionBegin TIME NOT NULL,
    sessionEnd TIME DEFAULT(NULL),
    isLearning INTEGER DEFAULT(false)
);


CREATE TABLE SessionReportDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    title TEXT DEFAULT(''),
    content TEXT DEFAULT('')
);


CREATE TABLE SessionReportExpansions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId INTEGER NOT NULL REFERENCES SessionReport(id),
    expansionId INTEGER NOT NULL REFERENCES Game(id),
    expansionName INTEGER NOT NULL REFERENCES GameName(id)
);


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
