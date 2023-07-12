import { createStore } from "vuex";
import { DeconstructedImageRecord, ImageRecord } from "@/types/AllTypes";
import * as Prompts from "@/utils/promptutils";

const store = createStore({
  state() {
    return {
      connected: false,
      taggingImages: {} as Record<number, DeconstructedImageRecord>,
      taggingHistory: [] as { imageId: number; fromPrompt: string }[],
      allTags: {} as Record<string, Set<string>>,
      filterTags: [] as string[],
      selectedTags: [] as string[],
      draggedTag: null as null | string,
      singleImage: null as null | DeconstructedImageRecord,
      settings: {
        grid_cols: 3,
      },
    };
  },
  mutations: {
    setConnected(state, newState: boolean) {
      state.connected = newState;
    },
    updateImage(state, newImage: ImageRecord) {
      //only reflect changes in UI as synchronised with server. There should be a callback in websockets.ts
      if (newImage.id in state.taggingImages && !newImage.undoState) {
        let oldImage = state.taggingImages[newImage.id];
        while (state.taggingHistory.length > 100) {
          state.taggingHistory.splice(0, 1);
        }
        state.taggingHistory.push({
          imageId: oldImage.id,
          fromPrompt: oldImage.prompt,
        });
      }
    },
    _updateImage(state, newImage: ImageRecord) {
      const deconstruction = Prompts.getAllTags(newImage.prompt);
      const newImageDeconstructed = {
        ...newImage,
        components: deconstruction,
      } as DeconstructedImageRecord;
      state.taggingImages[newImage.id] = newImageDeconstructed;
      for (let tag of deconstruction) {
        let root = tag.id.split(";")[0];
        if (!(root in state.allTags)) {
          state.allTags[root] = new Set<string>();
        }
        if (!tag.isRoot) {
          state.allTags[root].add(tag.raw);
        }
      }
      if (state.singleImage && newImage.id == state.singleImage.id) {
        state.singleImage = newImageDeconstructed;
      }
    },
    undoImage(state) {
      let historyItem = state.taggingHistory.pop();
      if (
        historyItem !== undefined &&
        historyItem.imageId in state.taggingImages
      ) {
        let image = state.taggingImages[historyItem.imageId];
        let newImage = { ...image };
        newImage.prompt = historyItem.fromPrompt;
        newImage.undoState = true;
        store.commit("updateImage", newImage);
      }
    },
    deleteImage(state, imageId: number) {
      delete state.taggingImages[imageId];
    },
    addTagFilter(state, token) {
      state.filterTags.push(token);
    },
    clearTagFilters(state) {
      while (state.filterTags.length > 0) state.filterTags.pop();
    },
    setSelectedTags(state, tags: string[]) {
      state.selectedTags = tags;
    },
    clearSelectedTags(state) {
      while (state.selectedTags.length > 0) state.selectedTags.pop();
    },
    changeSettings(state, payload: any) {
      for (let key of Object.keys(payload)) {
        if (key in state.settings) {
          (state.settings as any)[key] = payload[key];
        }
      }
    },
    defineLocalTag(state, payload: string) {
      const root = payload.split(";")[0];
      const subtag = payload.indexOf(";") > 0 ? payload.split(";")[1] : "";
      if (!(root in state.allTags)) {
        state.allTags[root] = new Set<string>();
      }
      if (subtag.length > 0) {
        state.allTags[root].add(subtag);
      }
    },
    setSingleImage(state, payload: DeconstructedImageRecord) {
      state.singleImage = payload;
    }
  },
  getters: {
    filteredTaggingImages(state): DeconstructedImageRecord[] {
      if (state.filterTags.length == 0)
        return Object.values(state.taggingImages);
      const filtered = [] as DeconstructedImageRecord[];
      for (const image of Object.values(state.taggingImages)) {
        let found = false;
        for (const filterTag of state.filterTags) {
          for (const tag of image.components) {
            if (tag.id == filterTag) found = true;
            break;
          }
          if (found) break;
        }
        if (found) {
          filtered.push(image);
        }
      }
      return filtered.sort((a, b) => a.name > b.name ? 1 : -1);
    },
  },
});
export default store;

import { webSocketStuff } from "@/store/websockets";
import { BASE_URL } from "@/constants";
webSocketStuff(store, BASE_URL.replace("http", "ws") + "/websocket");
