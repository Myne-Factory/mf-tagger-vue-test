<template>
  <v-card
    :width="width + 'px'"
    :height="height + 'px'"
    variant="outlined"
    :style="
      'background-color:' +
      cardColor +
      ' ; border: 3px solid ' +
      cardColor +
      '; border-radius: 5px;'
    "
    class="d-flex flex-column flex-nowrap"
  >
    <v-img
      :src="base_url + '/api/image/' + image.id"
      :width="width"
      :style="
        'background-color: black; cursor: ' +
        ($store.state.selectedTags.length > 0 ? 'pointer' : 'zoom-in') +
        ';'
      "
      @click="
        $store.state.selectedTags.length == 0
          ? $emit('maximiseImage')
          : applySelectedTags()
      "
      @dblclick="$emit('maximiseImage')"
      class="flex-shrink-1"
    ></v-img>
    <div
      class="prompt-text flex-grow-0 flex-shrink-0"
      @click="applySelectedTags"
      :style="($store.state.selectedTags.length > 0 ? 'cursor: pointer;' : '')"
    >
      <span
        v-for="tag in renderPrompt"
        v-if="renderPrompt.length > 0"
        class="token"
        @drop="onDropTag(tag.id)"
        @dragover.prevent
        @dragenter.prevent
        @dragenter="onPreviewTag(tag.id)"
        @dragleave="onUnpreviewTag()"
        @click="deleteTag(tag.id)"
        >{{ tag.display }}</span
      >
      <div
        v-else
        style="color: gray"
        @drop="onDropTag('')"
        @dragover.prevent
        @dragenter.prevent
        @dragenter="onPreviewTag('')"
        @dragleave="onUnpreviewTag()"
      >
        Wow such empty
      </div>
    </div>
  </v-card>
</template>

<script lang="ts">
import * as Prompts from "@/utils/promptutils";
import {
  DeconstructedPrompt,
  DeconstructedImageRecord,
} from "@/types/AllTypes";
import { BASE_URL } from "@/constants";
export default {
  props: {
    image: {
      type: Object,
      default() {
        return {} as DeconstructedImageRecord;
      },
    },
    width: {
      type: Number,
      default() {
        return 100;
      },
    },
    height: {
      type: Number,
      default() {
        return 100;
      },
    },
  },
  data() {
    return {
      previewPrompt: [] as DeconstructedPrompt,
      hoveringOverTagId: null as null | string,
    };
  },
  methods: {
    onDropTag(tag: string) {
      if (!this.$store.state.draggedTag) return;
      let newPrompt = Prompts.insertTagAfter(
        this.image.prompt,
        this.$store.state.draggedTag,
        tag
      );
      let newImage = this.image.prompt;
      newImage.prompt = newPrompt;
      this.$store.commit("updateImage", newImage);
      this.previewPrompt = [];
      this.hoveringOverTagId = null;
    },
    onPreviewTag(tag: string) {
      if (!this.$store.state.draggedTag) return;
      const previewPrompt = Prompts.insertTagAfter(
        this.image.prompt,
        this.$store.state.draggedTag,
        tag
      );
      this.previewPrompt = Prompts.getAllTags(previewPrompt);
      this.hoveringOverTagId = tag;
      for (let tag of this.previewPrompt) {
        if (tag.raw == this.$store.state.draggedTag) {
          tag.colored = true;
        }
      }
    },
    onUnpreviewTag() {
      this.previewPrompt = [];
    },
    deleteTag(tag: string) {
      if (!this.image.prompt) return;
      let newPrompt = Prompts.removeTag(this.image.prompt, tag);
      let newImage = this.image;
      newImage.prompt = newPrompt;
      this.$store.commit("updateImage", newImage);
    },
    applySelectedTags() {
      const selectedTags = this.$store.state.selectedTags;
      const originalPrompt = this.image.prompt;
      const newPrompt = Prompts.applyTags(this.image as DeconstructedImageRecord, selectedTags);

      if (originalPrompt != newPrompt) {
        let newImage = {...this.image};
        newImage.prompt = newPrompt;
        newImage.components = Prompts.getAllTags(newPrompt);
        this.$store.commit("updateImage", newImage);
      }
    },
  },
  computed: {
    base_url(): string {
      return BASE_URL;
    },
    renderPrompt(): DeconstructedPrompt {
      if (this.previewPrompt.length > 0) return this.previewPrompt;
      return this.image.components;
    },
    cardColor: function () {
      const mode = this.colorMode;
      switch (mode) {
        case "hasAll":
          return "#81C784";
        case "hasRoot":
          return "#90CAF9";
        default:
          return "#bbbbbb";
      }
    },
    colorMode: function () {
      const selectedTags = this.$store.state.selectedTags;
      const selectedRootTags = selectedTags.filter((item) =>
        item.endsWith(";")
      );
      if (selectedTags.length > 0 && !selectedTags.some(item => !(this.image.components as DeconstructedPrompt).some(tag => tag.id == item))) {
        return "hasAll";
      } else if (
        (this.image.components as DeconstructedPrompt).some((item) =>
          selectedRootTags.includes(item.id)
        )
      ) {
        return "hasRoot";
      } else {
        return "default";
      }
    },
  },
};
</script>

<style scoped>
.prompt-text {
  font-family: "Tahoma", "sans-serif";
  font-size: 8pt;
  padding-left: 4px;
  padding-right: 4px;
  display: block;
}
.inline-prompt-text {
  font-family: "Tahoma", "sans-serif";
  font-size: 8pt;
}
.highlighted {
  color: red;
}
.token:hover {
  text-decoration: line-through;
  cursor: pointer;
}
</style>
