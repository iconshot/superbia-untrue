import SuperbiaContext from "./SuperbiaContext";

export class DocumentContext extends SuperbiaContext {
  constructor(client, id) {
    super(id);

    this.documents = {};

    const listener = (endpoints, emitter) => {
      emitter.on("data", (data) => this.data(data));
    };

    client.on("request", listener);
    client.on("subscribe", listener);
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

  data(data) {
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
