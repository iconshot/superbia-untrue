import { Context } from "untrue";

class SuperbiaContext extends Context {
  constructor(id = "id") {
    super();

    this.keys = { id, typename: "_typename" };
  }

  parseResult(result, data = {}) {
    if (result === null) {
      return null;
    }

    if (Array.isArray(result)) {
      return result.map((element) => this.parseResult(element, data));
    }

    if (typeof result === "object") {
      const newResult = {};

      for (const key in result) {
        newResult[key] = this.parseResult(result[key], data);
      }

      const isDocument = this.keys.id in result && this.keys.typename in result;

      if (!isDocument) {
        return newResult;
      }

      const id = result[this.keys.id];
      const typename = result[this.keys.typename];

      if (!(typename in data)) {
        data[typename] = {};
      }

      data[typename][id] = newResult;

      return result[this.keys.id];
    }

    return result;
  }
}

export default SuperbiaContext;
