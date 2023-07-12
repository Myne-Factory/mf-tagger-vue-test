import { DeconstructedImageRecord, DeconstructedPrompt, ImageRecord } from '@/types/AllTypes'

export function getRootTags(prompt: string): string[] {
  let rootTags = [] as string[];

  if (prompt.length == 0) return rootTags;

  for (let subprompt of prompt.split(";")) {
    let tags = subprompt.split(",");
    if (tags.length == 0) continue; //idk how, but TS is happy
    let rootTagName = tags.shift() as string;
    rootTags.push(rootTagName.trim());
  }
  return rootTags;
}

export function getSubtags(prompt: string, rootTag: string): string[] {
  let subTags = [] as string[];

  for (let subprompt of prompt.split(";")) {
    let tags = subprompt.split(",");
    if (tags.length == 0) continue; //idk how, but TS is happy
    let rootTagName = tags.shift()?.trim() as string;
    if (rootTagName.toLowerCase() == rootTag.toLowerCase()) {
      for (let tag of tags) {
        subTags.push(tag.trim());
      }
      break;
    }
  }
  return subTags;
}

export function getAllTags(
  prompt: string
): DeconstructedPrompt {
  let allTags = [] as DeconstructedPrompt;

  let rootToken = "";
  let token = "";
  let isRoot = true;
  for (let i = 0; i < prompt.length; i++) {
    let char = prompt.charAt(i);
    if (char == ";") {
      if (isRoot) {
        allTags.push({
          id: token.trim() + ";",
          display: token + ";",
          raw: token.trim(),
          isRoot: true,
        });
      } else {
        allTags.push({
          id: rootToken.trim() + ";" + token.trim(),
          display: token + ";",
          raw: token.trim(),
          isRoot: false,
        });
      }
      isRoot = true;
      token = "";
    } else if (char == ",") {
      if (isRoot) {
        allTags.push({
          id: token.trim() + ";",
          display: token + ",",
          raw: token.trim(),
          isRoot: true,
        });
        rootToken = token;
      } else {
        allTags.push({
          id: rootToken.trim() + ";" + token.trim(),
          display: token + ",",
          raw: token.trim(),
          isRoot: false,
        });
      }
      isRoot = false;
      token = "";
    } else {
      token += char;
    }
  }
  if (token.length > 0) {
    if (isRoot) {
      allTags.push({
        id: token.trim() + ";",
        display: token,
        raw: token.trim(),
        isRoot: true,
      });
    } else {
      allTags.push({
        id: rootToken.trim() + ";" + token.trim(),
        display: token,
        raw: token.trim(),
        isRoot: false,
      });
    }
  }
  return allTags;
}

export function insertTag(prompt: string, tagId: string): string {
  if (tagId.indexOf(";") == -1 || tagId.split(";")[1].length == 0) {
    //insert root tag only
    return insertRootTag(prompt, tagId.replace(";", ""));
  }
  let addRootTag = tagId.split(";")[0];
  let addSubTag = tagId.split(";")[1];

  let token = "";
  let isRoot = true;
  let isRelevantRoot = false;
  for (let i = 0; i < prompt.length; i++) {
    let char = prompt.charAt(i);
    if (char == ";") {
      if (
        isRelevantRoot ||
        (isRoot && token.trim().toLowerCase() == addRootTag.toLowerCase())
      ) {
        return prompt.substring(0, i) + ", " + addSubTag + prompt.substring(i);
      }
      isRoot = true;
      token = "";
    } else if (char == ",") {
      if (isRoot && token.trim().toLowerCase() == addRootTag.toLowerCase()) {
        isRelevantRoot = true;
      }
      isRoot = false;
      token = "";
    } else {
      token += char;
    }
  }
  if (
    isRelevantRoot ||
    (isRoot && token.trim().toLowerCase() == addRootTag.toLowerCase())
  ) {
    return prompt + ", " + addSubTag; //can't end with a ";" or "; " or else previous for loop would've passed
  }
  //root tag not found
  if (prompt.endsWith(";")) {
    return prompt + " " + addRootTag + ", " + addSubTag;
  } else if (prompt.endsWith("; ")) {
    return prompt + addRootTag + ", " + addSubTag;
  } else if (prompt.length == 0) {
    return addRootTag + ", " + addSubTag;
  } else {
    return prompt + "; " + addRootTag + ", " + addSubTag;
  }
}

export function insertTagAfter(
  prompt: string | undefined,
  addTag: string,
  afterTagId: string
): string {
  if (prompt == undefined || prompt.length == 0) {
    return addTag;
  }
  let newPrompt = "";
  for (let tag of getAllTags(prompt)) {
    if (tag.id == afterTagId) {
      if (tag.display.endsWith(",") || tag.display.endsWith(";")) {
        newPrompt += tag.display.substring(0, tag.display.length - 1);
        newPrompt += ", " + addTag;
        newPrompt += tag.display.substring(tag.display.length - 1);
      } else {
        newPrompt += tag.display;
        newPrompt += ", " + addTag;
      }
    } else {
      newPrompt += tag.display;
    }
  }
  return newPrompt;
}

export function insertRootTag(prompt: string, tagId: string): string {
  if (tagId.endsWith(";")) {
    tagId = tagId.substring(0, tagId.length - 1);
  }
  for (let tag of getRootTags(prompt)) {
    if (tagId.toLowerCase() == tag.toLowerCase()) {
      return prompt; //already exists
    }
  }
  if (prompt.endsWith(";")) {
    return prompt + " " + tagId;
  } else if (prompt.endsWith("; ")) {
    return prompt + tagId;
  } else if (prompt.length == 0) {
    return tagId;
  } else {
    return prompt + "; " + tagId;
  }
}

export function removeTag(prompt: string, tagId: string): string {
  let deconstruction = getAllTags(prompt);
  let reconstruction = "";
  let traversingRoot = false;
  for (let tag of deconstruction) {
    if (tag.id == tagId) {
      if (tag.isRoot) {
        traversingRoot = true;
      } else if (tag.display.endsWith(";")) {
        reconstruction =
          reconstruction.substring(0, reconstruction.length - 1) + ";";
      } //ends with comma or the prompt, do nothing
    } else if (traversingRoot) {
      if (tag.isRoot) {
        reconstruction += tag.display;
        traversingRoot = false;
      }
    } else {
      reconstruction += tag.display;
    }
  }
  if (reconstruction.endsWith(", ")) {
    return reconstruction.substring(0, reconstruction.length - 2);
  } else if (reconstruction.endsWith(",")) {
    return reconstruction.substring(0, reconstruction.length - 1);
  } else {
    return reconstruction.trim();
  }
}

export function applyTags(image: DeconstructedImageRecord, toApply: string[]) {
  let changed = false;
  let prompt = image.prompt;

  for (let tag of toApply) {
    let has = (image.components as DeconstructedPrompt).some(item => item.id == tag);

    if (!has) {
      prompt = insertTag(prompt, tag);
      changed = true;
    }
  }

  if (!changed) {
    //delete tags instead
    let removeRoot = toApply.every(item => item.endsWith(";"));

    for (let tag of toApply) {
      if (tag.endsWith(";") && !removeRoot) continue;
      let newPrompt = removeTag(prompt, tag);
      if (newPrompt != prompt) {
        prompt = newPrompt;
        changed = true;
      }
    }
  }
  return prompt;
}
