# BoardGameGeek API access

The service looks games up on BoardGameGeek through its XML API. Since mid-2025
every request to that API must be authorized with an application token —
without one, every lookup fails with HTTP 401. This is what is needed to get
the BGG code (the `Search` prefill in the game add/edit dialog, the
`/api/v1/bgg/boardgame/[bggId]` lookup route, expansion and import updates)
working against live data.

## Getting a token

1. Sign in to BGG and open <https://boardgamegeek.com/applications>.
2. **Create an application** — describe the app and how it will be used, and
   choose Commercial or Non-commercial (commercial means: for-profit org,
   fundraising, ads, or paid benefits).
3. **Wait for BGG's review.** Their guide says a response may take a week or
   more, and approval is not guaranteed (apps judged to compete with or harm
   BGG may be declined).
4. Once approved, open the application's **Tokens** section and create a
   token. It is sent as `Authorization: Bearer <token>` to
   `boardgamegeek.com` (no `www`); there is no OAuth client-id/secret
   exchange, and the token does not currently expire.

## Where the token goes

- **Local dev**: `.dev.vars` (gitignored) already has a
  `BGG_API_TOKEN=paste-your-bgg-token-here` placeholder. Replace the
  placeholder with the token and restart `wrangler dev`.
- **Deployed**: set `BGG_API_TOKEN` as an encrypted secret through the
  dashboard (see the commented reminder in `wrangler.jsonc`). Never put the
  value in `wrangler.jsonc` or any committed file.

The service makes all BGG calls server-side and sends the token as a bearer
token; the browser never sees it.

## When it is missing or wrong

The lookup errors say exactly what is wrong instead of a bare "Unauthorized":

- no token configured → `BGG API token is not configured; set BGG_API_TOKEN in
  .dev.vars`
- token rejected by BGG → `BGG rejected the API token (401); check
  BGG_API_TOKEN in .dev.vars`

## Notes

- Rate limits are not published numerically; usage shows under
  Applications → Usage and the wiki suggests leaving ~5s between requests.
- BGG asks public apps to show the "Powered by BGG" logo and to make requests
  server-side (which this service does).
- Both the old `/xmlapi/` and the new `/xmlapi2/` APIs require authorization.
- Handy test ID: `1472` is *Five Crowns* (1996).

Sources: <https://boardgamegeek.com/using_the_xml_api>,
<https://boardgamegeek.com/wiki/page/XML_API>,
<https://boardgamegeek.com/wiki/page/BGG_XML_API2>.
