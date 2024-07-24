import $, { Component } from "untrue";

import { v4 as uuid } from "uuid";

export class RequestWrapper {
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
