<script>
  import { theme } from '$stores/theme';

  const bggURL = 'https://boardgamegeek.com/';
</script>


<div class="home">
  <section class="home-hero" aria-labelledby="home-title">
    <p class="eyebrow">Luddatumbazo board game library</p>

    <p>
      Luddatumbazo is a homegrown, non-commercial board game database for our
      household and gaming group. It keeps the collection and wishlists in one
      place and records the games that actually make it to the table.
    </p>
    <p>
      Browse the collection to see what is on the shelf, or catch up on recent
      plays in the session reports.
    </p>

    <div class="home-actions">
      <a class="button primary" href="#/games/owned">Browse the collection</a>
      <a class="button" href="#/sessions">View session reports</a>
    </div>
  </section>

  <section class="bgg-credit" aria-labelledby="bgg-title">
    <div class="bgg-copy">
      <h3 id="bgg-title">Data from BoardGameGeek</h3>
      <p>
        When a game is added, its details and cover art are imported from
        BoardGameGeek. Our collection and session history stay here.
      </p>
      <p class="source-credit">
        Game data and images provided by
        <a href={bggURL} target="_blank" rel="noreferrer">BoardGameGeek</a>.
      </p>
    </div>

    <a class="bgg-link" href={bggURL} target="_blank" rel="noreferrer">
      <img
        class="bgg-logo"
        src={$theme === 'dark'
          ? '/img/powered-by-bgg-reversed.svg'
          : '/img/powered-by-bgg-color.svg'}
        alt="Powered by BGG"
        width="342"
        height="76"
      />
    </a>
  </section>
</div>


<style>
  .home {
    width: 100%;
    max-width: 74rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 4vw, 44px);
  }

  .home-hero {
    max-width: 62rem;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-top: clamp(4px, 2vw, 20px);
  }

  .eyebrow {
    margin: 0;
    color: var(--wa-color-brand-600);
    font-size: var(--wa-font-size-s);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .home-hero p {
    max-width: 68ch;
    margin: 0;
    color: var(--wa-color-text-body);
    font-size: var(--wa-font-size-l, 1.125rem);
    line-height: 1.6;
  }

  .home-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-medium, 10px);
    background: var(--wa-color-surface-raised);
    color: var(--wa-color-text-body);
    font-weight: 600;
    line-height: 1.2;
  }

  .button:hover {
    border-color: var(--wa-color-brand-600);
    text-decoration: none;
  }

  .button.primary {
    border-color: var(--wa-color-brand-fill-loud);
    background: var(--wa-color-brand-fill-loud);
    color: var(--wa-color-brand-on-loud);
  }

  .button.primary:hover {
    border-color: var(--wa-color-brand-border-loud);
    background: color-mix(in oklab, var(--wa-color-brand-fill-loud), var(--wa-color-mix-hover));
  }

  .bgg-credit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 24px;
    padding: clamp(18px, 3vw, 28px);
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-large, 16px);
    background: var(--wa-color-surface-raised);
  }

  .bgg-copy {
    flex: 1 1 30rem;
  }

  .bgg-copy h3 {
    margin-bottom: 6px;
  }

  .bgg-copy p {
    max-width: 62ch;
    margin: 0 0 8px;
    line-height: 1.5;
  }

  .bgg-copy .source-credit {
    margin: 0;
    color: var(--wa-color-text-secondary);
    font-size: var(--wa-font-size-s);
  }

  .bgg-link {
    display: block;
    flex: 0 0 auto;
  }

  .bgg-logo {
    display: block;
    width: clamp(180px, 22vw, 220px);
    height: auto;
  }

  @media (max-width: 640px) {
    .bgg-credit {
      align-items: flex-start;
    }

    .bgg-logo {
      width: min(180px, 100%);
    }
  }
</style>
