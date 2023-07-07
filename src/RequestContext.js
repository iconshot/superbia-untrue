import SuperbiaContext from "./SuperbiaContext";

export class RequestContext extends SuperbiaContext {
  constructor(client, documentKeys) {
    super(documentKeys);

    this.requests = {};

    this.client = client;
  }

  // default persistence

  hydrate(requests) {
    this.requests = requests;
  }

  persist() {
    return this.requests;
  }

  getRequests() {
    return this.requests;
  }

  intercept() {
    return {};
  }

  parseRequestResult(result) {
    if (
      result !== null &&
      typeof result === "object" &&
      this.documentKeys.typename in result &&
      result[this.documentKeys.typename].endsWith("Pagination")
    ) {
      return { loading: false, error: null, data: this.parseResult(result) };
    } else {
      return this.parseResult(result);
    }
  }

  onRequest = async (key, endpoints, payload = null) => {
    key = key !== null && key !== undefined ? key : Date.now().toString();

    this.requests[key] = {
      loading: true,
      done: false,
      error: null,
      data: null,
    };

    const interceptors = this.intercept();

    const endpointKeys = Object.keys(endpoints);

    for (const endpointKey of endpointKeys) {
      if (endpointKey in interceptors && "load" in interceptors[endpointKey]) {
        interceptors[endpointKey].load(key, endpoints, payload);
      }
    }

    this.update();

    try {
      const response = await this.client.request(endpoints);

      const data = response.data();

      const newData = {};

      for (const key in data) {
        newData[key] = this.parseRequestResult(data[key]);
      }

      this.requests[key] = {
        loading: false,
        done: true,
        error: null,
        data: newData,
      };

      for (const endpointKey of endpointKeys) {
        if (
          endpointKey in interceptors &&
          "data" in interceptors[endpointKey]
        ) {
          interceptors[endpointKey].data(key, endpoints, payload, data);
        }
      }

      this.update();
    } catch (error) {
      this.requests[key] = { loading: false, done: false, error, data: null };

      for (const endpointKey of endpointKeys) {
        if (
          endpointKey in interceptors &&
          "error" in interceptors[endpointKey]
        ) {
          interceptors[endpointKey].error(key, endpoints, payload, error);
        }
      }

      this.update();
    }
  };

  onLoad = async (key, endpoints, payload = null) => {
    const interceptors = this.intercept();

    const endpointKey = Object.keys(endpoints)[0];

    const result = this.requests[key].data[endpointKey];

    result.loading = true;
    result.error = null;

    if (endpointKey in interceptors && "load" in interceptors[endpointKey]) {
      interceptors[endpointKey].load(key, endpoints, payload);
    }

    this.update();

    try {
      const response = await this.client.request(endpoints);

      const data = response.data();

      const endpointResult = this.parseResult(data[endpointKey]);

      result.loading = false;

      result.data = {
        ...endpointResult,
        nodes: [...result.data.nodes, ...endpointResult.nodes],
      };

      if (endpointKey in interceptors && "data" in interceptors[endpointKey]) {
        interceptors[endpointKey].data(key, endpoints, payload, data);
      }

      this.update();
    } catch (error) {
      result.loading = false;
      result.error = error;

      if (endpointKey in interceptors && "error" in interceptors[endpointKey]) {
        interceptors[endpointKey].error(key, endpoints, payload, error);
      }

      this.update();
    }
  };
}
