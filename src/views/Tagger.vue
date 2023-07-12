<template>
  <div class="d-flex flex-wrap">
    <v-navigation-drawer
      location="left"
      elevation="4"
      style="position: static; height: 100vh"
      width="400"
      permanent
      floating
    >
      <template v-slot:prepend>
        <v-toolbar :elevation="2" color="primary">
          <template v-slot:prepend>
            <v-avatar size="48">
              <v-img src="/MyneSmile.png"></v-img>
            </v-avatar>
          </template>
          <v-app-bar-title>MF Tagger</v-app-bar-title>
        </v-toolbar>
      </template>
      <TagPicker />
    </v-navigation-drawer>
    <div class="flex-grow-1">
      <ImageGrid />
      <MenuBar />
    </div>
  </div>
</template>

<script lang="ts">
import { ImageRecord, DatasetMetaResponse, TagDef } from "@/types/AllTypes";
import ImageGrid from "@/components/ImageGrid.vue";
import TagPicker from "@/components/TagPicker.vue";
import MenuBar from "@/components/MenuBar.vue";
import axios from "axios";
import * as Prompts from "@/utils/promptutils";
import { BASE_URL } from "@/constants";
export default {
  data() {
    return {
      tagger_categories: [] as TagDef[],
      local_user_tags: {} as Record<string, Set<string>>,
    };
  },
  components: { ImageGrid, TagPicker, MenuBar },
  async mounted() {
    let response = await axios.get(BASE_URL + "/api/meta");
    if (response.status == 200) {
      let data = response.data as DatasetMetaResponse;
      this.tagger_categories = data.tagger_categories;
    }
  },
  created() {
    window.addEventListener("keydown", this.keydownHandler);
  },
  destroyed() {
    window.removeEventListener("keydown", this.keydownHandler);
  },
  methods: {
    updateLocalTags() {
      this.local_user_tags = {};
      for (let image of Object.values(
        this.$store.state.taggingImages
      ) as ImageRecord[]) {
        let prompt = image.prompt;
        let rootTags = Prompts.getRootTags(prompt);

        for (let rootTag of rootTags) {
          let set =
            rootTag in this.local_user_tags
              ? this.local_user_tags[rootTag]
              : new Set<string>();
          for (let tag of Prompts.getSubtags(prompt, rootTag)) {
            set.add(tag.trim());
          }
          this.local_user_tags[rootTag] = set;
        }
      }
    },
    keydownHandler: function (event: KeyboardEvent) {
      if (event.ctrlKey && event.key === "z") {
        this.$store.commit("undoImage");
        event.preventDefault();
      }
    },
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
  },
};
</script>
