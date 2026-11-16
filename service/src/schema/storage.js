/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


const StorageNameSchema = z.string().trim().min(1).max(80);


/******************************************************************************/


/* Looking up the contents of a storage location requires the household and a
 * location identifier. The location value is either a numeric ID or the stored
 * slug used in links. */
export const StorageContentsIDSchema = z.object({
  householdIdOrSlug: z.string().transform(numberOrString),
  storageId: z.string()
});


/******************************************************************************/


/* The contents view defaults to the direct location; the UI asks for the
 * subtree explicitly when its toggle is on. */
export const StorageContentsQuerySchema = z.object({
  includeChildren: z.enum(['0', '1']).optional()
});


/******************************************************************************/


/* Creating a storage location requires a name and optionally identifies the
 * parent location. A null parent means a top-level location. */
export const StorageCreateSchema = z.object({
  name: StorageNameSchema,
  parentId: z.number().int().positive().nullable().optional()
});


/******************************************************************************/


/* Renaming a location requires its ID and a new name. Reparenting is not
 * supported in this version. */
export const StorageUpdateSchema = z.object({
  storageId: z.number().int().positive(),
  name: StorageNameSchema
});


/******************************************************************************/


/* Deleting a location requires only its ID. */
export const StorageDeleteSchema = z.object({
  storageId: z.number().int().positive()
});


/******************************************************************************/


/* Assigning an owned game requires the game identifier, the target location
 * (null means Unstored), and the on-shelf state. The route additionally checks
 * that the location belongs to the household and that an unstored game is not
 * marked as on shelf. */
export const StorageAssignSchema = z.object({
  game: z.string().or(z.number()).transform(numberOrString),
  storageLocationId: z.number().int().positive().nullable(),
  isOnShelf: z.boolean()
});


/******************************************************************************/


/* Bulk shelf changes operate on owned games that already have a storage
 * location. Reshelving and taking games off shelf share the same contract; a
 * location-less game is never affected. Duplicate identifiers are discarded. */
export const StorageShelfSchema = z.object({
  gameIds: z.array(z.coerce.number().int().positive()).min(1).max(500)
    .transform(ids => [...new Set(ids)]),
  isOnShelf: z.boolean()
});


/******************************************************************************/


/* Bulk location changes move one or more owned games to an existing storage
 * location. Duplicate identifiers are discarded; a null target is deliberately
 * not allowed here because clearing locations is a separate operation. */
export const StorageBulkLocationSchema = z.object({
  gameIds: z.array(z.coerce.number().int().positive()).min(1).max(500)
    .transform(ids => [...new Set(ids)]),
  storageLocationId: z.coerce.number().int().positive()
});


/******************************************************************************/
