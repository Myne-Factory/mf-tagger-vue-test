<template>
  <div>
    <v-text-field
      label="Filter or create new root tag"
      variant="outlined"
      hide-details
      density="compact"
      class="ma-2"
      ref="searchBox"
      append-inner-icon="mdi-magnify"
      @keyup.enter.prevent="searchEnter"
      @keyup.esc.prevent="searchTerm = ''"
      @click:append-inner="searchEnter"
      v-model="searchTerm"
    ></v-text-field>
    <v-list
      density="compact"
      :items="items"
      :lines="false"
      open-strategy="multiple"
      select-strategy="independent"
      v-model:selected="selected"
      v-model:opened="_opened"
      color="gray"
      nav
    >
      <template v-slot:item="{ props }">
        <v-list-item
          v-bind="props"
          @click.stop="select(props.value)"
          :style="
            'padding-inline-start: calc(4px + var(--indent-padding)) !important;' +
            (props.value === searchedTop
              ? 'color: white; background-color: blue;'
              : '')
          "
          v-if="props.title != 'createNew'"
        >
        </v-list-item>
        <v-list-item
          v-else
          style="
            padding-inline-start: calc(4px + var(--indent-padding)) !important;
          "
          ><v-text-field
            :label="'Enter a new subtag for ' + creatingNewUnder"
            variant="outlined"
            hide-details
            density="compact"
            style="margin-top: 8px"
            ref="createTagRef"
            append-inner-icon="mdi-send"
            @keyup.enter.prevent="createNewTag"
            @click:append-inner="createNewTag"
          ></v-text-field
        ></v-list-item>
        <v-divider></v-divider
      ></template>
      <template v-slot:header="{ props }">
        <v-list-item
          :active="selected.includes(props.value)"
          :value="props.value"
          :title="props.title"
          @click.stop="select(props.value)"
          :style="
            props.value === searchedTop
              ? 'color: white; background-color: blue;'
              : ''
          "
          ><template v-slot:append>
            <v-icon
              :style="
                'transition: transform 0.2s; transform: rotate(' +
                (opened.includes(props.value) ? '-180deg' : '0deg') +
                ');'
              "
              class="ma-0"
              @click.stop="
                opened.includes(props.value)
                  ? opened.splice(opened.indexOf(props.value), 1)
                  : opened.push(props.value)
              "
              v-if="!openAll && items_with_children.includes(props.value)"
              >mdi-chevron-down</v-icon
            >
            <v-icon
              class="ma-0"
              @click.stop="createNewButton(props.value)"
              v-if="props.value != 'createNewRoot'"
              >mdi-plus</v-icon
            >
          </template></v-list-item
        ><v-divider></v-divider>
      </template>
    </v-list>
  </div>
</template>

<script lang="ts">
import { DeconstructedImageRecord, DeconstructedPrompt } from "@/types/AllTypes";
import { nextTick } from "vue";
import { VTextField } from "vuetify/lib/components/index.mjs";
import * as Prompts from "@/utils/promptutils";
export default {
  data() {
    return {
      opened: [] as string[],
      creatingNewUnder: null as null | string,
      searchTerm: "",
    };
  },
  computed: {
    items(): {
      title: string;
      value: string;
      root: boolean;
      children?: { title: string; value: string; root: boolean }[];
    }[] {
      const output = [];
      for (let rootTag of Object.keys(this.$store.state.allTags)) {
        let children = [];
        for (let childTag of this.$store.state.allTags[rootTag]) {
          if (
            this.searchTerm.length == 0 ||
            childTag.toLowerCase().includes(this.searchTerm.toLowerCase())
          )
            children.push({
              title: childTag,
              value: rootTag + ";" + childTag,
              root: false,
            });
        }
        if (this.creatingNewUnder != null && this.creatingNewUnder == rootTag) {
          children.push({
            title: "createNew",
            value: rootTag + ";createnew",
            root: false,
          });
        }
        if (
          this.searchTerm.length == 0 ||
          children.length > 0 ||
          rootTag.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
          output.push({
            title: rootTag,
            value: rootTag + ";",
            root: true,
            children: children,
          });
      }
      if (this.searchTerm.length > 0) {
        output.push({
          title: "Create new root tag '" + this.searchTerm + "'",
          value: "createNewRoot",
          root: true,
          children: []
        });
      }
      return output;
    },
    items_with_children(): string[] {
      let output = [];
      for (let rootTag of Object.keys(this.$store.state.allTags)) {
        if (this.$store.state.allTags[rootTag].size > 0) {
          output.push(rootTag + ";");
        }
      }
      return output;
    },
    selected() {
      if (this.$store.state.settings.grid_cols == 1) {
        const image = this.$store.state.singleImage;
        if (image != null) {
          const output = [] as string[];
          image.components.forEach(item => output.push(item.id));
          return output;
        }
      }
      return this.$store.state.selectedTags;
    },
    _opened: {
      get(): string[] {
        if (this.openAll)
          return Object.keys(this.$store.state.allTags).map(
            (item) => item + ";"
          );
        return this.opened;
      },
      set(value: string[]) {
        this.opened = value;
      },
    },
    openAll() {
      return this.searchTerm.length > 0;
    },
    searchedTop() {
      if (this.searchTerm.length == 0) return "";
      const items = this.items;
      if (items[0].children && items[0].children.length > 0) {
        return items[0].children[0].value;
      } else {
        return items[0].value;
      }
    },
  },
  methods: {
    select(value: string) {
      if (value == "createNewRoot") {
        const newTagName = this.searchTerm + ";";
        this.$store.commit("defineLocalTag", newTagName);
        this.select(newTagName);
        this.searchTerm = "";
        return;
      }

      let wasSelected = false;
      let root = value.endsWith(";");
      let rootTag = value.split(";")[0] + ";";

      if (this.$store.state.settings.grid_cols == 1) {
        const image = this.$store.state.singleImage;
        if (image == null) return;
        const originalPrompt = image.prompt;
        const newPrompt = Prompts.applyTags(image as DeconstructedImageRecord, [value]);

        if (originalPrompt != newPrompt) {
          let newImage = {...image};
          newImage.prompt = newPrompt;
          newImage.components = Prompts.getAllTags(newPrompt);
          this.$store.commit("updateImage", newImage);
        }
        return;
      }

      let newSelection = [...this.$store.state.selectedTags];
      if (newSelection.indexOf(value) >= 0) {
        newSelection.splice(newSelection.indexOf(value), 1);
        wasSelected = true;
      } else {
        newSelection.push(value);
      }

      newSelection = newSelection.filter(
        (tag) => tag.split(";")[0] == value.split(";")[0]
      ); //deselect anything else with a different root tag
      if (wasSelected && root) {
        //clear selection if unselecting root tag
        newSelection = [];
      } else if (!wasSelected && !root) {
        //select root tag if selecting a child tag
        if (!newSelection.includes(rootTag)) {
          newSelection.push(rootTag);
        }
      }

      this.$store.commit("setSelectedTags", newSelection);

      if (root && !this.opened.includes(value) && !wasSelected) {
        this.opened.push(value);
      }
    },
    createNewButton: async function (value: string) {
      if (!this.opened.includes(value)) {
        this.opened.push(value);
      }
      this.creatingNewUnder = value.substring(0, value.length - 1);
      await nextTick();
      const inputBox = this.$refs.createTagRef as VTextField | undefined;
      if (inputBox) {
        inputBox.focus();
      }
    },
    createNewTag() {
      const inputBox = this.$refs.createTagRef as VTextField | undefined;
      if (inputBox && inputBox.value.length > 0) {
        const newTagName = this.creatingNewUnder + ";" + inputBox.value;
        this.$store.commit("defineLocalTag", newTagName);
        this.select(newTagName);
        this.creatingNewUnder = null;
      }
    },
    ctrlF: function (event: KeyboardEvent) {
      if (event.ctrlKey && event.key === "f" && this.$refs.searchBox) {
        event.preventDefault();
        (this.$refs.searchBox as VTextField).focus();
      }
    },
    searchEnter() {
      if (this.searchedTop) {
        this.select(this.searchedTop);
        this.searchTerm = "";
      }
    },
  },
  created() {
    window.addEventListener("keydown", this.ctrlF);
  },
  destroyed() {
    window.removeEventListener("keydown", this.ctrlF);
  },
};
</script>

<style>
.v-list-item--nav .v-list-item-title {
  font-size: 1rem !important;
  font-weight: 400 !important;
  line-height: 1.5rem !important;
}

.v-list .v-list-item--nav {
  margin-bottom: 1px !important;
  margin-top: 1px !important;
  border-radius: 12px;
}

.v-list-item--active > .v-list-item__overlay,
.v-list-item[aria-haspopup="menu"][aria-expanded="true"]
  > .v-list-item__overlay {
  opacity: 0.4;
}

.v-list-group__items {
  margin-left: calc(30px + var(--parent-padding));
  border-left: 4px solid black;
  padding-left: 10px;
}
</style>
