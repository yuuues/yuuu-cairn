-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "strength" INTEGER NOT NULL,
    "strengthMax" INTEGER NOT NULL,
    "dexterity" INTEGER NOT NULL,
    "dexterityMax" INTEGER NOT NULL,
    "willpower" INTEGER NOT NULL,
    "willpowerMax" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "hpMax" INTEGER NOT NULL,
    "deprived" BOOLEAN NOT NULL DEFAULT false,
    "panicked" BOOLEAN NOT NULL DEFAULT false,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "items" TEXT NOT NULL DEFAULT '[]',
    "containers" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "traits" TEXT,
    "notes" TEXT,
    "bonds" TEXT,
    "scars" TEXT,
    "omens" TEXT,
    "armor" TEXT,
    "imageUrl" TEXT,
    "partyId" INTEGER,
    CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "members" TEXT NOT NULL DEFAULT '[]',
    "subowners" TEXT NOT NULL DEFAULT '[]',
    "joinCode" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "containers" TEXT NOT NULL DEFAULT '[]',
    "events" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Party_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Party_joinCode_key" ON "Party"("joinCode");
