<template>
  <div>
    <v-virtual-scroll
      :items="image_items"
      :item-height="card_height + 4"
      :height="inner_height"
      :key="card_height"
      v-if="$store.state.settings.grid_cols > 1"
      @scroll="onScrolled"
      ref="virtualScroll"
    >
      <template v-slot:default="{ item }"
        ><div class="d-flex flex-wrap" style="margin-top: 2px;">
          <ImageGridItem
            v-for="i in item"
            :key="i.id"
            style="margin: auto;"
            :image="i"
            :width="card_width"
            :height="card_height"
            @maximiseImage="showImage(i)"
          ></ImageGridItem></div
      ></template>
    </v-virtual-scroll>
    <ImageSingle
      :image="topLeftImage"
      :width="window_width - 417"
      :height="inner_height"
      v-else-if="topLeftImage != null"
      @wheel="onWheel"
    ></ImageSingle>
  </div>
</template>

<script lang="ts">
import { DeconstructedImageRecord } from "@/types/AllTypes";
import ImageGridItem from "@/components/ImageGridItem.vue";
import ImageSingle from "@/components/ImageSingle.vue";
import { BASE_URL } from "@/constants";
import { VVirtualScroll } from "vuetify/lib/components/index.mjs";
import { nextTick } from "vue";
export default {
  data() {
    return {
      window_width: window.innerWidth,
      window_height: window.innerHeight,
      topLeftImage: null as null | DeconstructedImageRecord,
      topLeftIndex: 0,
    };
  },
  components: { ImageGridItem, ImageSingle },
  created() {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.myKeyHandler);
  },
  destroyed() {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.myKeyHandler);
  },
  methods: {
    onResize () {
      this.window_width = window.innerWidth;
      this.window_height = window.innerHeight;
    },
    showImage: function (image: DeconstructedImageRecord) {
      const scrollY = (this.$refs.virtualScroll as VVirtualScroll).$el
        .scrollTop;
      const scrollRows = Math.floor(scrollY / (this.card_height + 4));
      this.topLeftImage = image;
      this.topLeftIndex = scrollRows * this.$store.state.settings.grid_cols;
      this.$store.commit("changeSettings", { grid_cols: 1 });
      this.$store.commit("setSingleImage", this.topLeftImage);
    },
    onScrolled() {
      const scrollY = (this.$refs.virtualScroll as VVirtualScroll).$el
        .scrollTop;
      const scrollRows = Math.floor(scrollY / (this.card_height + 4));
      const items = this.image_items;
      let firstItem = null as null | DeconstructedImageRecord;
      if (items.length > scrollRows) {
        firstItem = items[scrollRows][0];
      } else {
        firstItem = items[items.length - 1][0];
      }
      this.topLeftImage = firstItem;
      this.topLeftIndex = this.$store.getters.filteredTaggingImages.indexOf(
        this.topLeftImage
      );
    },
    onWheel(event: WheelEvent) {
      const taggedImages = this.$store.getters.filteredTaggingImages; //vue doesn't cache this in the current version. Don't compute it twice
      event.deltaY < 0 ? (this.topLeftIndex -= 1) : (this.topLeftIndex += 1);
      if (this.topLeftIndex < 0) this.topLeftIndex = 0;
      if (this.topLeftIndex >= taggedImages.length)
        this.topLeftIndex = taggedImages.length - 1;
      this.topLeftImage = taggedImages[this.topLeftIndex];
      this.$store.commit("setSingleImage", this.topLeftImage);
    },
    myKeyHandler: async function (event: KeyboardEvent) {
      let changed = false;
      if (event.key === "ArrowLeft") {
        changed = true;
        this.topLeftIndex -= this.$store.state.settings.grid_cols;
      } else if (event.key === "ArrowRight") {
        changed = true;
        this.topLeftIndex += this.$store.state.settings.grid_cols;
      }
      if (changed) {
        const taggedImages = this.$store.getters.filteredTaggingImages;
        if (this.topLeftIndex < 0) this.topLeftIndex = 0;
        if (this.topLeftIndex >= taggedImages.length)
          this.topLeftIndex = taggedImages.length - 1;
        this.topLeftImage = taggedImages[this.topLeftIndex];
        this.$store.commit("setSingleImage", this.topLeftImage);

        await nextTick();
        const scroller = this.$refs.virtualScroll as VVirtualScroll;
        if (scroller != null) {
          scroller.scrollToIndex(
            Math.floor(this.topLeftIndex / this.$store.state.settings.grid_cols)
          );
        }
      }
    },
  },
  computed: {
    card_width(): number {
      if (!this.$store.state.settings.grid_cols) return 0;
      return (
        Math.floor((this.window_width - 436) / this.$store.state.settings.grid_cols) - 2
      );
    },
    card_height(): number {
      let width = this.card_width;
      return Math.ceil((width / 16) * 9) + 48;
    },
    base_url(): string {
      return BASE_URL;
    },
    image_items: function (): DeconstructedImageRecord[][] {
      if (!this.$store.state.settings.grid_cols) return [];
      var arrayOfArrays = [];
      const filteredImages = this.$store.getters.filteredTaggingImages;
      for (
        var i = 0;
        i < filteredImages.length;
        i += this.$store.state.settings.grid_cols
      ) {
        arrayOfArrays.push(
          filteredImages.slice(i, i + this.$store.state.settings.grid_cols)
        );
      }
      if (this.topLeftImage == null && arrayOfArrays.length > 0) {
        this.topLeftImage = arrayOfArrays[0][0];
        this.$store.commit("setSingleImage", this.topLeftImage);
      }
      return arrayOfArrays;
    },
    count_tagged: function (): number {
      let i = 0;
      for (let image of Object.values(this.$store.state.taggingImages)) {
        if (image.prompt.length > 0) i++;
      }
      return i;
    },
    inner_height() {
      return this.window_height - 32;
    }
  },
  watch: {
    card_width: async function () {
      await nextTick();
      const scroller = this.$refs.virtualScroll as VVirtualScroll;
      if (scroller != null) {
        scroller.scrollToIndex(
          Math.floor(this.topLeftIndex / this.$store.state.settings.grid_cols)
        );
      }
      //todo sometimes scroller doesn't re-render
    },
    '$store.state.singleImage'(newValue: DeconstructedImageRecord) {
      this.topLeftImage = newValue;
    }
  },
};
</script>
