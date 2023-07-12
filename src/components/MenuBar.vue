<template>
  <v-toolbar color="primary" height="32" class="pl-4 pr-4">
    {{
      $store.state.filterTags.length > 0
        ? $store.getters.filteredTaggingImages.length +
          "/" +
          Object.keys($store.state.taggingImages).length +
          " images (filtered)"
        : Object.keys($store.state.taggingImages).length +
          " images (" +
          count_tagged +
          " tagged)"
    }}<v-progress-circular
      class="mr-2"
      size="24"
      indeterminate
      v-if="
        !$store.state.connected ||
        Object.keys($store.state.taggingImages).length == 0
      "
    ></v-progress-circular>
    <v-spacer></v-spacer>

    <v-tooltip
      :text="'Grid size: ' + $store.state.settings.grid_cols"
      location="top"
    >
      <template v-slot:activator="{ props }">
        <v-slider
          v-bind="props"
          color="white"
          prepend-icon="mdi-image-size-select-large"
          hide-details
          max="5"
          min="1"
          step="1"
          :thumb-size="16"
          style="max-width: 140px"
          v-model="gridCols"
          @wheel.prevent="
            $event.deltaY < 0
              ? (gridCols = Math.min(gridCols + 1, 5))
              : (gridCols = Math.max(gridCols - 1, 1))
          "
        ></v-slider>
      </template>
    </v-tooltip>
  </v-toolbar>
</template>

<script lang="ts">
import { ImageRecord } from "@/types/AllTypes";

export default {
  data() {
    return {};
  },
  computed: {
    count_tagged: function () {
      let i = 0;
      for (let image of Object.values(
        this.$store.state.taggingImages
      ) as ImageRecord[]) {
        if (image.prompt.length > 0) i++;
      }
      return i;
    },
    gridCols: {
      get() {
        return this.$store.state.settings.grid_cols;
      },
      set(value: number) {
        this.$store.commit("changeSettings", { grid_cols: value });
      },
    },
  },
};
</script>

<style scoped>
.v-expansion-panel--active > .v-expansion-panel-title,
.v-expansion-panel > .v-expansion-panel-title {
  min-height: 8px;
}
</style>
