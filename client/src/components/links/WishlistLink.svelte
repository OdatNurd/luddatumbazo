<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The information on the wishlist that should be linked to
  export let wishlist;

  // ---------------------------------------------------------------------------

</script>


<a href={`#/games/wishlisted/${wishlist.slug}`}>
  {wishlist.name}
</a>
