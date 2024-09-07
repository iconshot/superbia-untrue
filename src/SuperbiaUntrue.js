import $, { Component, Hook } from "untrue";

import { v4 as uuid } from "uuid";

export default class SuperbiaUntrue {
  static useRequestKey(requestKeyExtractor = null) {
    return Hook.useMemo(() => {
      let key = null;

      if (requestKeyExtractor !== null) {
        if (typeof requestKeyExtractor === "function") {
          key = requestKeyExtractor();
        } else {
          key = requestKeyExtractor;
        }
      }

      if (key === null) {
        key = uuid();
      }

      return key;
    });
  }

  static wrapRequester(Child, requestKeyExtractor = null) {
    return class RequestComponent extends Component {
      constructor(props) {
        super(props);

        let key = null;

        if (requestKeyExtractor !== null) {
          if (typeof requestKeyExtractor === "function") {
            key = requestKeyExtractor(props);
          } else {
            key = requestKeyExtractor;
          }
        }

        if (key === null) {
          key = uuid();
        }

        this.requestKey = key;
      }

      render() {
        const { children, ...props } = this.props;

        return $(Child, { ...props, requestKey: this.requestKey }, children);
      }
    };
  }
}
