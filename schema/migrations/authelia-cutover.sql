-- =============================================================================
-- The Authelia cutover migration.
--
-- The external identifiers that the system has been using are Cloudflare Access
-- UUIDs; with the move to an OpenID Connect provider those are meaningless and
-- each known user needs to be moved to the identifier that the new provider
-- assigns them.
--
-- Every reference to these users in the database goes through the internal
-- userId, so the external identifiers appear in exactly one place (User itself)
-- and replacing them here is all that is required.
--
-- The profile columns are also added here; the username is the login handle at
-- the provider and is what the profile picture URL is keyed on.
--
-- Apply with:
--   wrangler d1 execute luddatumbazo --remote --file=schema/migrations/authelia-cutover.sql
-- (or pipe the file into sqlite3 against the local development database).
-- =============================================================================


ALTER TABLE User ADD COLUMN username TEXT;
ALTER TABLE User ADD COLUMN picture TEXT;


UPDATE User
   SET externalId = 'e2398ed5-0f6e-4273-833d-feb58193b54a',
       username = 'tmartin',
       picture = 'https://profiles.thedragonland.net/tmartin'
 WHERE externalId = 'be916285-a022-5a5f-8006-82bd2e6b097d';


UPDATE User
   SET externalId = '914162bd-0e28-4b52-9fe1-1a86ca79db82',
       username = 'marisue',
       picture = 'https://profiles.thedragonland.net/marisue'
 WHERE externalId = 'ad262ae8-27f0-5d36-84c6-3addfd62a9cb';
