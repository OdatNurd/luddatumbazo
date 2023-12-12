<script>
  import { wsx } from "@axel669/zephyr";
  import { Screen, Paper, Grid, Titlebar, Text, Link, Icon } from "@axel669/zephyr";

  console.log(`Game API URI: ${process.env.GAME_API_ROOT_URI}`);
</script>

<svelte:body use:wsx={{"$theme": 'dark', "$app": true, "p": "8px"}} />

<Screen>
  <Paper>
    <Titlebar slot="header">
      <Text slot="title" title>
        Luddatumbazo!
        <Text subtitle>Exactly like BoardGameGeek except not</Text>
      </Text>

      <Link button flat slot="action" href="/cdn-cgi/access/logout">
        <Icon name="logout"></Icon>
      </Link>
    </Titlebar>

    <Grid>
      <p>If this project were more well defined, there would be content here. </p>
      <p>Alas.</p>
    </Grid>

    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Let the turds hit the floor</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>