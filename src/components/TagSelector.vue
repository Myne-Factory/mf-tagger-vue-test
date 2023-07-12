<template>
  <div>
    <div style="padding: 4px">
      <div v-if="selected.length > 0" style="padding-left: 8px">
        Your selection
        <v-chip v-for="value in selected" size="small" class="mr-1">
          {{ value }}
          <template v-slot:append>
            <v-btn
              @click="selected.splice(selected.indexOf(value), 1)"
              icon="mdi-close-circle"
              size="small"
              variant="text"
              density="compact"
            ></v-btn>
          </template>
        </v-chip>
      </div>
      <div v-else style="text-align: center; color: silver; padding: 1px">
        Selected tags will appear here
      </div>
    </div>
    <v-divider></v-divider>
    <v-list-item>
      <v-text-field
        placeholder="Search or create tag"
        single-line
        hide-details
        variant="plain"
        density="compact"
        v-model="filterTags"
        @keyup.enter="selectOrCreate"
      ></v-text-field>
    </v-list-item>
    <v-divider></v-divider>
    <v-list
      density="compact"
      :items="items"
      :lines="false"
      open-strategy="multiple"
      select-strategy="leaf"
      v-model:selected="selected"
    >
      <template v-slot:append="{ isActive, item }">
        <v-icon
          :style="
            'transition: transform 0.2s; transform: rotate(' +
            (isActive ? '-180deg' : '0deg') +
            ');'
          "
          v-if="item.children && item.children.length > 0"
          >mdi-chevron-down</v-icon
        >
        <v-tooltip
          :text="'Create new subtag for \'' + item.title + '\''"
          location="top"
          v-if="item.root && item.value != 'createNew'"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-folder-plus-outline"
              color="grey"
              variant="text"
              density="compact"
              @click.stop="
                createTagDialogForRoot = false;
                createTagDialogRootPrompt = item.title;
                createTagDialogNewPrompt = '';
                createTagDialog = true;
              "
            ></v-btn
          ></template>
        </v-tooltip>
        <v-tooltip
          :text="'Filter all images by \'' + item.title + '\''"
          location="top"
          v-if="!item.title.endsWith(' (Root)') && item.value != 'createNew'"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-filter-plus-outline"
              color="grey"
              variant="text"
              density="compact"
              @click.stop="$emit('filterTag', item.title)"
            ></v-btn
          ></template>
        </v-tooltip>
      </template>
    </v-list>
    <v-dialog v-model="createTagDialog" width="auto">
      <v-card>
        <v-card-title
          >Create
          {{
            createTagDialogForRoot
              ? "root tag"
              : "sub tag for " + createTagDialogRootPrompt
          }}</v-card-title
        >
        <v-card-text>
          <v-text-field v-model="createTagDialogNewPrompt"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="createTagDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="
              createTagDialog = false;
              createTagDialogForRoot
                ? defineAndSelectTag('', createTagDialogNewPrompt)
                : defineAndSelectTag(
                    createTagDialogNewPrompt,
                    createTagDialogRootPrompt
                  );
            "
            :disabled="createTagDialogNewPrompt.length == 0"
            >Create</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { inject } from "vue";
export default {
  props: {
    possibleTags: {
      type: Object,
      default() {
        return {} as Record<string, Set<string>>;
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
      selected: [] as string[],
      filterTags: "" as string,
      createTagDialog: false,
      createTagDialogForRoot: false,
      createTagDialogRootPrompt: "",
      createTagDialogNewPrompt: "",
      dummyItemsVar: 0,
    };
  },
  computed: {
    items(): {
      title: string;
      value: string;
      root: boolean;
      children?: { title: string; value: string; root: boolean }[];
    }[] {
      if (this.dummyItemsVar < 0) return [];
      const result = [];
      for (let tag in this.possibleTags) {
        let childTags = [] as { title: string; value: string; root: boolean }[];
        for (let child of this.possibleTags[tag]) {
          if (
            this.filterTags.length == 0 ||
            child.toLowerCase().includes(this.filterTags.toLowerCase())
          ) {
            childTags.push({
              title: child,
              value: tag + ";" + child,
              root: false,
            });
          }
        }
        if (
          this.filterTags.length == 0 ||
          tag.toLowerCase().includes(this.filterTags.toLowerCase()) ||
          childTags.length > 0
        ) {
          if (childTags.length == 0) {
            let obj = {
              title: tag,
              value: tag + ";",
              children: undefined,
              root: true,
            };
            result.push(obj);
          } else {
            childTags.unshift({
              title: tag + " (Root)",
              value: tag + ";",
              root: false,
            });
            let obj = {
              title: tag,
              value: tag + ";;", //should be impossible to select anyways
              root: true,
              children: childTags,
            };
            result.push(obj);
          }
        }
      }
      let item = {
        title:
          this.filterTags.length > 0
            ? "Create tag '" + this.filterTags + "'"
            : "Create new root tag",
        value: "createNew",
        root: true,
      };
      result.push(item);
      return result;
    },
  },
  watch: {
    selected: {
      deep: true,
      handler() {
        if (this.selected.indexOf("createNew") >= 0) {
          this.selected.splice(this.selected.indexOf("createNew"), 1);
          this.createTagDialogForRoot = true;
          this.createTagDialogRootPrompt = "";
          this.createTagDialogNewPrompt = "";
          this.createTagDialog = true;
        } else {
          this.$emit("selection", this.selected);
        }
      },
    },
    possibleTags: {
      deep: true,
      handler() {
        this.dummyItemsVar += 1;
      }
    }
  },
  methods: {
    defineAndSelectTag(tag: string, roottag = "") {
      let toAdd = tag;
      if (roottag != "") {
        toAdd = roottag + ";" + tag;
      }
      this.$emit("newtag", toAdd);
      this.selected.push(toAdd);
    },
    selectOrCreate() {
      if (!this.filterTags) return;
      let topItem = this.items[0];
      if (topItem.value == "createNew") {
        this.defineAndSelectTag("", this.filterTags);
      } else {
        if (topItem.children && topItem.children.length > 0) {
          this.selected.push(topItem.children[0].value);
        } else {
          this.selected.push(topItem.value);
        }
      }
      this.filterTags = "";
    },
  },
};
</script>

<style scoped></style>
