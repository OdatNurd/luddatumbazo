# Luddatumbazo - Personalized Board Game Database

Luddatumbazo (Esperanto for "Game Database") is an application that was my
[Devember](https://devember.org/) 2023 project; a home grown, smaller scale
version of [BoardGameGeek](https://boardgamegeek.com/)), intended to be
something my wife and I (and our family and gaming group) can use to track the
specific board games we own, want and are playing.

Development work for this project was streamed live during the entire month of
December 2023 on my [Twitch channel](https://twitch.tv/odatnurd), where we
spent 128 hours and 37 minutes working on the project live (though of course at
least half of that time was spent chatting with people).

See [devember-2023](https://github.com/OdatNurd/devember-2023) to see what the
state of the project was at the point at which Devember ended; this version of
the repo was split from it and shares the same history, but is continually
developed.

This particular project is intended to be entirely cloud based and is using the
following technology:

- [Cloudflare Zero Trust](https://www.cloudflare.com/zero-trust/) for IAM
- [Cloudflare Pages](https://www.cloudflare.com/developer-platform/pages/) to host the front end
- [Cloudflare Workers](https://www.cloudflare.com/developer-platform/workers/) to host the functions driving the API
- [Cloudflare D1](https://www.cloudflare.com/developer-platform/d1/) as the backing database
- [Cloudflare Images](https://www.cloudflare.com/developer-platform/cloudflare-images/) for image storage


Libraries that are used in this project include (but are not limited to, based
on my ability to remember to update this):

- [Web Awesome Pro](https://webawesome.com/) for the front end interface
- [@axel669/sanic-xml](https://www.npmjs.com/package/@axel669/sanic-xml) for handling XML API data from BoardGameGeek


### Image variants

Game art is served through Cloudflare Images. The account defines four variants;
the sizes are also the layout sizes to design around for each position:

| Variant | Size | Fit | Used for |
| --- | --- | --- | --- |
| `thumb` | 32×32 | contain | table cells and compact lists |
| `entry` | 175×175 | contain | session report summary at rest |
| `cover` | 350×350 | contain | game detail at rest |
| `public` | 1366×768 | scale down | full-size lightbox images |

The application maps its internal image names onto these variants in
`wrangler.jsonc`: `thumbnail` → `thumb`, `smallboxart` → `entry`, `boxart` →
`cover`, and `full` → `public`. The `public` rendition is the largest one and is
what every full-size lightbox uses; the smaller variants are only the images at
rest.


The following things were planned inclusions in the project but the MVP that we
ended with at the end of Devember did not include them. Future development will
bring these changes in, or possibly already did and I just forgot to update this
README file.

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for object storage
- [@axel669/asuid](https://asuid.axel669.net/) for generating random, (almost) sortable ID's