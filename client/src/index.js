import '$lib/webawesome.js';
import { initIcons } from '$lib/icons.js';

import { mount } from 'svelte';
import App from './App.svelte';

// Point the Web Awesome icon libraries at the locally vendored glyphs before
// anything renders.
initIcons();

const app = mount(App, {
  target: document.body,
  props: {}
});

export default app;
