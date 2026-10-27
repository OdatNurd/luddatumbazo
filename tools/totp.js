/******************************************************************************/


import crypto from 'crypto';
import { config } from 'dotenv';

config({ path: ['.dev.vars'] });


/******************************************************************************/


/* Generate a current TOTP code for the integration test user.
 *
 * The seed comes from the INTEGRATION_AUTH_TOTP value in the .dev.vars file, and
 * is deliberately never printed; only the derived six digit code is ever
 * shown. The seed may be provided either as a bare base32 secret or as a full
 * otpauth:// URI, in which case the secret parameter is pulled out of it.
 *
 * Usage: node ./tools/totp.js
 *
 * Codes are valid for 30 seconds; if a login attempt fails because the window
 * rolled over, just run this again and use the new code. */


/******************************************************************************/


/* Decode a base32 encoded string into a Buffer. Whitespace and padding are
 * ignored, which keeps us tolerant of however the seed was formatted. */
function base32Decode(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let buffer = 0;
  const output = [];

  for (const char of clean) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}


/******************************************************************************/


/* Generate the current TOTP code (RFC 6238, SHA-1, 30 second window, six
 * digits, which is what authenticator apps default to). */
function totpCode(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / 30);

  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;

  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** 6);
  return code.toString().padStart(6, '0');
}


/******************************************************************************/


/* Entrypoint. */
function main() {
  let seed = process.env.INTEGRATION_AUTH_TOTP;
  if (seed === undefined || seed === '') {
    console.log('INTEGRATION_AUTH_TOTP is not set in .dev.vars');
    process.exit(1);
  }

  // If the value is a full otpauth URI, pull the bare secret out of it.
  if (seed.startsWith('otpauth://')) {
    seed = new URL(seed).searchParams.get('secret') ?? '';
    if (seed === '') {
      console.log('the INTEGRATION_AUTH_TOTP otpauth URI has no secret parameter');
      process.exit(1);
    }
  }

  // Only ever print the user name and the current code; never the seed.
  console.log(`user: ${process.env.INTEGRATION_AUTH_USERNAME ?? '(unset)'}`);
  console.log(`code: ${totpCode(seed)}`);
}


/******************************************************************************/


main();
