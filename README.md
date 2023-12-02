# Devember 2023 - Luddatumbazo

This repository represents my entry into [Devember](https://devember.org/) 2023
and is a home grown, smaller scale version of [BoardGameGeek](https://boardgamegeek.com/)),
intended to be something my wife and I (and our family and gaming group) can
use to track the specific board games we own, want and are playing.

If you're viewing this in December of 2023, development work is ongoing live on
my [Twitch channel](https://twitch.tv/odatnurd), which is serving as the daily
devlog requirement of Devember. What better way to follow what the day's work
was than to actually watch the day's work?

At the end of each day, the last commit made on that day (if any) is tagged,
allowing for easy viewing of the progression of the project over the given time
period.

THe project is code named <code>Luddatumbazo</code>, which is the translation
of "Game Database" into Esperanto, because naming things is hard.

This particular project is intended to be entirely cloud based and is (or will
be, depending on the part of the month) using the following technology:

- [Cloudflare Zero Trust](https://www.cloudflare.com/zero-trust/) for IAM
- [Cloudflare Pages](https://www.cloudflare.com/developer-platform/pages/) to host the front end
- [Cloudflare Workers](https://www.cloudflare.com/developer-platform/workers/) to host the functions driving the API
- [Cloudflare D1](https://www.cloudflare.com/developer-platform/d1/) as the backing database
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for object storage
- [Cloudflare Images](https://www.cloudflare.com/developer-platform/cloudflare-images/) for image storage


Libraries that are used in this project include (but are not limited to, based
on my ability to remember to update this):

 - [@axel669/Windstorm](https://windstorm.axel669.net/)/[@axel669/Zephyr](https://zephyr.axel669.net/) for the front end interface
 - [@axel669/sanic-xml](https://www.npmjs.com/package/@axel669/sanic-xml) for handling XML API data from BoardGameGeek
 - [@axel669/asuid](https://asuid.axel669.net/) for generating random, (almost) sortable ID's