/******************************************************************************/


import { z } from 'zod';
import { asNumber, numberOrString, makeSlug } from '#schema/common';

import { metadataTypeList } from '#db/metadata';


/******************************************************************************/


/* Operations to get at some core data can only search via a numeric gameId and
 * via a combination of an ID value or a Slug. */
export const GameIDSchema = z.object({
  gameId: z.string().transform(asNumber(true))
});


/******************************************************************************/


/* Operations to look up games can take as a search parameter either a numeric
 * id value of the game, or a string slug. */
export const GameLookupIDSchema = z.object({
  idOrSlug: z.string().transform(numberOrString)
});


/******************************************************************************/


/* Operations to insert lists of games accept a list of BGG ID Values. */
export const BGGGameIDListSchema = z.array(z.number());


/******************************************************************************/


/* Operations to look up games can take as a search parameter either a numeric
 * id value of the game, or a string slug. */
export const GameLookupIDListSchema = z.array(
  z.string().or(z.number())
);


/******************************************************************************/


/* Games can contain an array of various metadata objects, where the field name
 * that stores the array specifies what kind of metadata the object contains.
 *
 * Members in the list must have a name but may also have an associated bggId
 * on them, if they refer to data from BGG. */
export const GameMetadataSchema = z.array(
  z.object({
    name: z.string(),

    // The slug is set to a default here, but if it ends up as a default it will
    // be populated from the name by the transform.
    slug: z.string().default(''),
    bggId: z.number().default(0),
  }).optional().transform(makeSlug('name', 'slug'))
);


/******************************************************************************/


/* When games are added, they can have records of the expansions that they
 * have. */
export const GameExpansionSchema = z.array(
  z.object({
    // Each record is either telling us about an expansion to the game the
    // record is for (value is true), or that we are an expansion for some other
    // game (false). In both cases, the name field tells us the primary name of
    // the other side of the correlation.
    isExpansion: z.boolean(),
    name: z.string(),

    // gameId tracks our internal gameId for this, which can be null if this
    // expansion is for a game that does not currently exist in the database.
    //
    // Similarly, bggId is the BGG game ID of the expansion, or 0 if BGG does
    // not know about the value.
    //
    // The rules of the object state that at least one of the two values needs
    // to be specified; otherwise, the expansion contains data that we can't
    // insert because we won't know how to associate it with the actual game.
    gameId: z.number().nullish().default(null),
    bggId: z.number().default(0)

    // To be valid, there has to be at least one of the two fields; if both are
    // at their defaults, the field is useless.
  }).optional().refine(val => !(val.gameId === null && val.bggId === 0))
);


/******************************************************************************/


/* New games that are added to the system require that their data conform to the
 * following schema, or the request will fail. */
export const NewGameSchema = z.object({
  // Games can be associated with their BoardGameGeek ID value; this is optional
  // and can be 0 to indicate that this is a game that BGG doesn't know about.
  bggId: z.number().default(0),

  // The list of names that the game is known by; this must always contain at
  // least one name, and the first name is the "primary" name.
  name: z.array(z.string()).min(1),

  // The textual slug that the game is known by.
  slug: z.string(),

  // A descriptive text of the game itself.
  description: z.string(),

  // The year this game was published; this is required because there are many
  // publishing's of a given game, and this helps distinguish the correct one.
  published: z.number(),

  // Optional fields that track some game data; these default as a convenience
  // for partially entering games that are currently being designed.
  minPlayers: z.number().default(1),
  maxPlayers: z.number().default(1),
  minPlayerAge: z.number().default(1),
  playTime: z.number().default(1),
  minPlayTime: z.number().default(1),
  maxPlayTime: z.number().default(1),
  complexity: z.number().default(1.0),

  // Game Metadata; these are optional arrays of values, but any values
  // presented must contain at least a name, and optionally also a bggId.
  category: GameMetadataSchema.optional().default([]),
  mechanic: GameMetadataSchema.optional().default([]),
  designer: GameMetadataSchema.optional().default([]),
  artist: GameMetadataSchema.optional().default([]),
  publisher: GameMetadataSchema.optional().default([]),

  // The list of possible expansions, if any; this is optional.
  expansions: GameExpansionSchema.optional().default([]),

  // These store the official link to the publisher page for this game (if any)
  // and a link to a YouTube video that teaches how to play (if any).
  officialUrl: z.string().default(''),
  teachingUrl: z.string().default(''),

  // Optionally, the record can include the full URL of an external image which
  // should be ingested into the image system and used to set up the final
  // image.
  image: z.string().default('')
});


/******************************************************************************/


/* When updating session data, the request requires the id of the game whose
 * expansions are being updated, a potential BGGId, and a list of the expansion
 * records.
 *
 * Expansions can only be updated for games that actually exist in the DB; the
 * only un-established links that can be created are as a result of the direct
 * inclusion of the game that provides the other end of the expansion. */
export const ExpansionUpdateSchema = z.object({
  // The game the expansions are for is strictly required; the BGGId is optional
  // for this portion, since the relation requires at least one side and we
  // enforce that the gameId is valid.
  gameId: z.number(),
  bggId: z.number().default(0),

  // The list of expansions to update with
  expansions: GameExpansionSchema,
});


/******************************************************************************/


/* All of the requests that adjust metadata require, at a minimum, a metaType
 * somewhere in their request parameter that tells us which of the various
 * metadata groups it is adjusting; they all take the same data otherwise. */
export const MetadataTypeSchema = z.enum(metadataTypeList);


/******************************************************************************/


/* For use in requests whose body and parameters are wholly within either the
 * JSON body or within query parameters. Requests of this variety require that
 * their path contains a metaType key that selects the data set to be operated
 * on. */
export const MetadataTypeSelectSchema = z.object({
  metaType: MetadataTypeSchema
})


/******************************************************************************/


/* For use in requests whose body and parameters are wholly within either the
 * JSON body or within query parameters. Requests of this variety require that
 * their path contains a metaType key that selects the data set to be operated
 * on. */
export const MetadataQuerySchema = z.object({
  // The metatype of the data to query
  metaType: MetadataTypeSchema,

  // The incoming query can contain either a numeric ID or a textual slug name.
  idOrSlug: z.string().transform(numberOrString)
})


/******************************************************************************/


/* When making some metadata queries, query parameters are allowed to control
 * how the query proceeds. These generally fall into the realm of a value that
 * is either present or not as a boolean, with any value being true and no
 * value being false. */
export const MetaDataQueryParamsSchema = z.object({
  // When present, this value in the query string will cause cause a list of
  // games associated with that metadata to be included in the returned result.
  games: z.any().transform((value, zCtx) => value !== undefined),
});


/******************************************************************************/