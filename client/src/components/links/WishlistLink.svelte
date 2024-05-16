<script>
  import { Link } from "@axel669/zephyr"


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The information on the wishlist that should be linked to
  export let wishlist;

  // ---------------------------------------------------------------------------

</script>


<Link href={`#/games/wishlisted/${wishlist.slug}`}>
  {wishlist.name}
</Link>
