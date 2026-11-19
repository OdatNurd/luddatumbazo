/******************************************************************************/

/* Presentation metadata for the five game metadata types. Keeping the labels,
 * plurals, list routes and descriptions together prevents the list, detail and
 * add-dialog pages from drifting apart when a type is added or renamed. */

export const metadataLabels = {
  category:  'Categories',
  mechanic:  'Mechanics',
  designer:  'Designers',
  artist:    'Artists',
  publisher: 'Publishers'
};

export const metadataSingularLabels = {
  category:  'Category',
  mechanic:  'Mechanic',
  designer:  'Designer',
  artist:    'Artist',
  publisher: 'Publisher'
};

export const metadataPlurals = {
  category:  'categories',
  mechanic:  'mechanics',
  designer:  'designers',
  artist:    'artists',
  publisher: 'publishers'
};

export const metadataListRoutes = {
  category:  '#/categories',
  mechanic:  '#/mechanics',
  designer:  '#/designers',
  artist:    '#/artists',
  publisher: '#/publishers'
};

export const metadataDescriptions = {
  category:  'Categories used to classify games in the catalog.',
  mechanic:  'Mechanics used to describe how games play.',
  designer:  'Designers credited on games in the catalog.',
  artist:    'Artists credited on games in the catalog.',
  publisher: 'Publishers represented in the catalog.'
};


/******************************************************************************/
