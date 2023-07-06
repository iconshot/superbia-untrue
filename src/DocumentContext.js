import SuperbiaContext from "./SuperbiaContext";

export class DocumentContext extends SuperbiaContext {
  constructor(client, documentKeys) {
    super(documentKeys);

    this.documents = {};

    client
      .on("request", (endpoints, emitter) => {
        emitter.on("data", (data) => {
          this.onData(data);
        });
      })
      .on("subscribe", (endpoint, emitter) => {
        emitter.on("data", (data) => {
          this.onData(data);
        });
      });
  }

  // default persistence

  hydrate(documents) {
    this.documents = documents;
  }

  persist() {
    return this.documents;
  }

  getDocuments() {
    return this.documents;
  }

  onData(data) {
    const newData = {};

    Object.values(data).forEach((result) => {
      this.parseResult(result, newData);
    });

    const types = Object.keys(newData);

    if (types.length === 0) {
      return;
    }

    for (const type of types) {
      if (!(type in this.documents)) {
        this.documents[type] = {};
      }

      const newDocuments = newData[type];

      for (const id in newDocuments) {
        this.documents[type][id] = newDocuments[id];
      }
    }

    this.update();
  }
}
