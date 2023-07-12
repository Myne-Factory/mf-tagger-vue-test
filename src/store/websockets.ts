import { Store } from "vuex";
import { ImageRecord } from "@/types/AllTypes";

interface WSResponse {
  images?: ImageRecord[];
}

export function webSocketStuff(
  store: Store<{ taggingImages: Record<number, ImageRecord> }>,
  url: string
) {
  var ws = new WebSocket(url);
  let unsubscribeFunctions = [] as Function[];
  ws.onopen = function () {
    store.commit("setConnected", true);
    unsubscribeFunctions.push(
      store.subscribe((mutation) => {
        const functionName = mutation.type;
        const value = mutation.payload;
        if (functionName == "updateImage") {
          ws.send(JSON.stringify({ images: [{id: value.id, prompt: value.prompt}] }));
        }
      })
    );
  };

  ws.onmessage = function (e) {
    const response = JSON.parse(e.data) as WSResponse;
    if (response.images) {
      for (let image of response.images) {
        store.commit("_updateImage", image);
      }
    }
  };

  ws.onclose = function () {
    store.commit("setConnected", false);
    for (let func of unsubscribeFunctions) {
      func();
    }
    setTimeout(function () {
      webSocketStuff(store, url);
    }, 1000);
  };

  ws.onerror = function (err) {
    console.error("Socket encountered error: ", err, "Closing socket");
    ws.close();
  };
}
