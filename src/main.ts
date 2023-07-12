/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from "./App.vue";

// Composables
import { createApp, ref } from "vue";

// Plugins
import { registerPlugins } from "@/plugins";

const app = createApp(App);
app.provide('selectedDragTag', ref(null as null | string));

registerPlugins(app);

app.mount("#app");
