import {
  Client,
  Emitter,
  Result,
  EndpointInput,
  ResponseResult,
} from "@superbia/client";

import {
  IdDocument,
  IdDocumentRecord,
  ParsedResult,
  SuperbiaContext,
} from "./SuperbiaContext";

export type ApiDocument<O extends string, T extends IdDocument<O>> = {
  [K in keyof T]: ParsedResult<O, T[K]>;
};

export type ApiDocuments<
  O extends string,
  T extends IdDocumentRecord<O>
> = Partial<{
  [K in keyof T]: Record<string, Result<ApiDocument<O, T[K]>>>;
}>;

export class DocumentContext<
  O extends string,
  K extends IdDocumentRecord<O>
> extends SuperbiaContext {
  public data: ApiDocuments<O, K> = {} as ApiDocuments<O, K>;

  private updateAfterResultLoop: boolean = false;

  constructor(client: Client<any, any>, idKey: string) {
    super(idKey);

    const listener = (
      endpoints: EndpointInput,
      emitter: Emitter<ResponseResult>
    ): void => {
      emitter.on("result", (result): void => {
        this.handleResult(result);
      });
    };

    client.on("request", listener);
    client.on("subscribe", listener);
  }

  public handleResult(result: ResponseResult): void {
    const endpointResults = Object.values(result);

    for (const endpointResult of endpointResults) {
      this.parseResultValue(endpointResult);
    }

    if (this.updateAfterResultLoop) {
      this.update();
    }

    this.updateAfterResultLoop = false;
  }

  private parseResultValue(value: any): any {
    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue): any => this.parseResultValue(tmpValue));
    }

    if (typeof value === "object") {
      const tmpValue: Record<string, any> = {};

      for (const key in value) {
        tmpValue[key] = this.parseResultValue(value[key]);
      }

      const isIdDocument = this.isIdDocument(value);

      if (!isIdDocument) {
        return tmpValue;
      }

      const id = value[this.idKey];
      const typename = value[this.typenameKey];

      const documents = this.data as Record<
        string,
        Record<string, Record<string, any>>
      >;

      if (!(typename in documents)) {
        documents[typename] = {};
      }

      documents[typename][id] = tmpValue;

      this.updateAfterResultLoop = true;

      return id;
    }

    return value;
  }
}
