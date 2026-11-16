/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


const StorageNameSchema = z.string().trim().min(1).max(80);


/******************************************************************************/


/* Looking up the contents of a storage location requires the household and the
 * numeric location identifier. */
export const StorageContentsIDSchema = z.object({
  householdIdOrSlug: z.string().transform(numberOrString),
  storageId: z.string().transform(numberOrString)
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
