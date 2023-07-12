<template>
  <v-sheet
    :width="width + 'px'"
    :height="height + 'px'"
    variant="tonal"
    style="background-color: #eeeeee"
    class="d-flex flex-column flex-nowrap"
  >
    <v-img
      :src="base_url + '/api/image/' + image.id"
      :height="height - 120"
      :width="width"
      style="background-color: black"
      class="flex-shrink-1"
    ></v-img>
    <div
      style="text-align: center; min-height: 100px"
      class="flex-grow-0 flex-shrink-0 pa-1"
    >
      <div
        :style="$store.state.selectedTags.length > 0 ? 'cursor: pointer;' : ''"
      >
        <v-chip
          v-for="item in items"
          v-if="renderPrompt.length > 0"
          class="mr-1 pa-0"
          label
          ><v-chip color="primary" size="large" draggable label>{{
            item.title
          }}</v-chip>
          <v-chip
            v-for="child in item.children"
            class="ml-1 mr-1"
            draggable
            size="small"
            >{{ child.title }}</v-chip
          ></v-chip
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
    </div>
  </v-sheet>
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
    onUnpreviewTag(tag: string) {
      this.previewPrompt = [];
    },
    deleteTag(tag: string) {
      if (!this.image) return;
      let newPrompt = Prompts.removeTag(this.image.prompt, tag);
      let newImage = {...this.image};
      newImage.prompt = newPrompt;
      this.$store.commit("updateImage", newImage);
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
    items(): {
      title: string;
      value: string;
      children: { title: string; value: string }[];
    }[] {
      const output = [] as {
        title: string;
        value: string;
        children: { title: string; value: string }[];
      }[];
      let entry = {
        title: "",
        value: "",
        children: [] as { title: string; value: string }[],
      };
      for (let component of this.renderPrompt) {
        if (component.isRoot) {
          if (entry.title) {
            output.push(entry);
          }
          entry = {
            title: component.raw,
            value: component.id,
            children: [],
          };
        } else {
          entry.children.push({
            title: component.raw,
            value: component.id,
          });
        }
      }
      if (entry.title) {
        output.push(entry);
      }
      return output;
    },
  },
};
</script>

<style scoped>
.prompt-text {
  font-family: "Tahoma", "sans-serif";
  font-size: 8pt;
  padding: 4px;
  display: block;
}
.inline-prompt-text {
  font-family: "Tahoma", "sans-serif";
  font-size: 8pt;
}
.highlighted {
  color: red;
}
</style>
