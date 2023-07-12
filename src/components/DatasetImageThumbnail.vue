<template>
  <v-card
    width="320px"
    height="260px"
    variant="tonal"
    :style="'margin-bottom: 10px; background-color:' + cardColor + ' ;'"
  >
    <v-img
      :src="url + 'api/image/large/' + imageid"
      height="180px"
      width="320px"
      style="background-color: black; cursor: zoom-in"
      @click="$emit('maximiseImage')"
    ></v-img>
    <div
      class="prompt-text"
      @click="applySelectedTags"
      :style="
        mode == 'tagging' && selectedtags && selectedtags.length > 0
          ? 'cursor: pointer;'
          : ''
      "
    >
      <span
        v-for="tag in deconstructedPrompt"
        v-if="deconstructedPrompt.length > 0"
        @drop="onDropTag(tag.id)"
        @dragover.prevent
        @dragenter.prevent
        @dragenter="onPreviewTag(tag.id)"
        @dragleave="onUnpreviewTag(tag.id)"
        @contextmenu.prevent="deleteTag(tag.id)"
        :class="
          mode == 'tagging' && selectedtags && selectedtags.indexOf(tag.id) >= 0
            ? 'highlighted'
            : ''
        "
        :style="tag.colored ? 'color: red;' : ''"
        >{{ tag.display }}</span
      >
      <div
        v-else
        style="color: gray"
        @drop="onDropTag('')"
        @dragover.prevent
        @dragenter.prevent
        @dragenter="onPreviewTag('')"
        @dragleave="onUnpreviewTag('')"
      >
        Wow such empty
      </div>
    </div>
    <div
      v-if="imageid !== undefined && imageid >= 0 && hackyRefreshSuggestions"
    >
      <div v-if="mode == 'suggestions'">
        <v-chip
          v-for="tag in suggestions"
          :key="tag.id"
          class="ml-1"
          draggable
          style="font-family: Tahoma, sans-serif; font-size: 8pt; cursor: grab"
          size="x-small"
          @dragstart="
            selectedDragTag = tag.tag;
            $event.target.style.opacity = 0.2;
          "
          @dragend="$event.target.style.opacity = 1"
          >{{ tag.tag }}</v-chip
        >
      </div>
    </div>
  </v-card>
</template>

<script lang="ts">
import axios from "axios";
import { TagDef } from "@/types/AllTypes";
import * as Prompts from "@/utils/promptutils";
import { inject } from "vue";
export default {
  props: {
    imageid: Number,
    url: String,
    prompt: String,
    mode: String,
    selectedtags: Array<string>,
    taggercategories: {
      type: Object,
      default() {
        return [] as TagDef[];
      },
    },
  },
  setup() {
    const selectedDragTag = inject("selectedDragTag") as null | string;
    return {
      selectedDragTag,
    };
  },
  data() {
    return {
      suggestions: [] as TagDef[],
      selectedSuggestion: null as null | string,
      deconstructedPrompt: [] as {
        id: string;
        display: string;
        raw: string;
        colored?: boolean;
      }[],
      previewPrompt: null as null | string,
      hoveringOverTagId: null as null | string,
    };
  },
  mounted() {
    this.deconstructPrompt();
  },
  watch: {
    mode: async function () {
      await this.updateState();
    },
    prompt: function () {
      this.deconstructPrompt();
    },
  },
  methods: {
    updateState: async function () {
      if (this.mode == "suggestions") {
        this.selectedDragTag = null;
        this.suggestions = [];
        let response = await axios.get(
          this.url + "api/suggestions/" + this.imageid
        );
        if (response.status == 200) {
          let suggestion = response.data as number[] | { error: string };
          if (!("error" in suggestion)) {
            for (let id of suggestion) {
              let tagDef = this.taggercategories[id];
              this.suggestions.push(tagDef);
            }
          }
        }
      } else {
        this.suggestions = [];
      }
    },
    deconstructPrompt: function () {
      if (this.previewPrompt) {
        this.deconstructedPrompt = Prompts.getAllTags(this.previewPrompt);
      } else if (this.prompt) {
        this.deconstructedPrompt = Prompts.getAllTags(this.prompt);
      } else {
        this.deconstructedPrompt = [];
      }
    },
    onDropTag(tag: string) {
      if (!this.selectedDragTag) return;
      let newPrompt = Prompts.insertTagAfter(
        this.prompt,
        this.selectedDragTag,
        tag
      );
      this.$emit("changePrompt", this.imageid, newPrompt);
      this.previewPrompt = null;
      this.hoveringOverTagId = null;
      this.deconstructPrompt();
    },
    onPreviewTag(tag: string) {
      if (!this.selectedDragTag) return;
      this.previewPrompt = Prompts.insertTagAfter(
        this.prompt,
        this.selectedDragTag,
        tag
      );
      this.deconstructPrompt();
      this.hoveringOverTagId = tag;
      for (let tag of this.deconstructedPrompt) {
        if (tag.raw == this.selectedDragTag) {
          tag.colored = true;
        }
      }
    },
    onUnpreviewTag(tag: string) {
      if (!this.prompt) return;
      if (this.hoveringOverTagId == tag) {
        this.previewPrompt = null;
        this.hoveringOverTagId = null;
        this.deconstructPrompt();
      }
    },
    deleteTag(tag: string) {
      if (!this.prompt) return;
      let newPrompt = Prompts.removeTag(this.prompt, tag);
      this.$emit("changePrompt", this.imageid, newPrompt);
    },
    applySelectedTags() {
      if (
        this.mode == "tagging" &&
        this.selectedtags &&
        this.selectedtags.length > 0
      ) {
        let prompt = this.prompt ? this.prompt : "";
        let deconstructed = Prompts.getAllTags(prompt);
        let hasEverything = true;
        for (let tag of this.selectedtags) {
          let exists = false;
          for (let dTag of deconstructed) {
            if (dTag.id == tag) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            hasEverything = false;
            prompt = Prompts.insertTag(prompt, tag);
            deconstructed = Prompts.getAllTags(prompt);
          }
        }
        if (hasEverything) {
          for (let tag of this.selectedtags) {
            prompt = Prompts.removeTag(prompt, tag);
          }
        }
        this.$emit("changePrompt", this.imageid, prompt);
      }
    },
  },
  computed: {
    hackyRefreshSuggestions: function () {
      this.updateState();
      return true;
    },
    cardColor: function () {
      //return ((!this.prompt || this.prompt.length == 0) ? '#ddd' : ());
      if (!this.prompt || this.prompt.length == 0) {
        return "#efefef";
      } else {
        if (
          !this.selectedtags ||
          this.selectedtags.length == 0 ||
          this.mode != "tagging"
        ) {
          return "#cccccc";
        }
        let hasEverything = true;
        let hasOne = false;
        for (let tag of this.selectedtags) {
          let exists = false;
          for (let dTag of this.deconstructedPrompt) {
            if (dTag.id == tag) {
              exists = true;
              break;
            }
          }
          if (exists) {
            hasOne = true;
          } else {
            hasEverything = false;
          }
        }
        if (hasEverything) {
          return "#ccffcc";
        } else if (hasOne) {
          return "#ccffff";
        } else {
          return "#cccccc";
        }
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
  width: 320px;
  height: 54px;
}
.inline-prompt-text {
  font-family: "Tahoma", "sans-serif";
  font-size: 8pt;
}
.highlighted {
  color: red;
}
</style>
