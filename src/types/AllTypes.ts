export interface TagDef {
  id: number;
  tag: string;
  category?: number; //0: booru. 4: booru character. 9: content rating
}

export interface ImageRecord {
  name: string;
  prompt: string;
  id: number;
  undoState?: boolean;
}

export interface DeconstructedImageRecord {
  name: string;
  prompt: string;
  id: number;
  components: DeconstructedPrompt;
  undoState?: boolean;
}

export interface DeconstructedPromptComponent {
  id: string;
  display: string;
  raw: string;
  isRoot?: boolean;
  colored?: boolean;
}
export type DeconstructedPrompt = DeconstructedPromptComponent[];

export type DatasetMetaResponse = {
  tagger_categories: TagDef[];
};
