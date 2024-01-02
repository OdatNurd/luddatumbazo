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

- [@axel669/Windstorm](https://windstorm.axel669.net/)/[@axel669/Zephyr](https://zephyr.axel669.net/) for the front end interface
- [@axel669/sanic-xml](https://www.npmjs.com/package/@axel669/sanic-xml) for handling XML API data from BoardGameGeek


The following things were planned inclusions in the project but the MVP that we
ended with at the end of Devember did not include them. Future development will
bring these changes in, or possibly already did and I just forgot to update this
README file.

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for object storage
- [@axel669/asuid](https://asuid.axel669.net/) for generating random, (almost) sortable ID's