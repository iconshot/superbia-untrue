import {
  Client,
  Emitter,
  Result,
  EndpointInput,
  ResponseResult,
  EndpointRecord,
} from "@superbia/client";

import {
  ParsedResult,
  SuperbiaContext,
  DocumentSchema,
  DocumentSchemaRecord,
  DocumentData,
} from "./SuperbiaContext";

export type Document<T extends DocumentSchema, O extends string = "id"> = {
  [K in keyof T]: ParsedResult<T[K], O>;
};

export type Documents<
  T extends DocumentSchemaRecord,
  O extends string = "id"
> = {
  [K in keyof T]: Record<string, Result<Document<T[K], O>>>;
};

export class DocumentContext<
  K extends DocumentSchemaRecord,
  M extends EndpointRecord,
  O extends string
> extends SuperbiaContext<M> {
  public data: Documents<K, O> = {} as Documents<K, O>;

  constructor(client: Client<M, any>, idKey: string) {
    super(client, idKey);

    const listener = (endpoints: EndpointInput, emitter: Emitter): void => {
      emitter.on("result", (result): void => {
        this.handleResult(result);
      });
    };

    client.on("request", listener);
    client.on("subscribe", listener);
  }

  private handleResult(result: ResponseResult): void {
    const data: DocumentData = {};

    for (const tmpResult of Object.values(result)) {
      this.parseResultValue(tmpResult, data);
    }

    const types = Object.keys(data);

    if (types.length === 0) {
      return;
    }

    const documents = this.data as DocumentData;

    for (const type of types) {
      if (!(type in documents)) {
        documents[type] = {};
      }

      const tmpDocuments = data[type];

      for (const id in tmpDocuments) {
        documents[type][id] = tmpDocuments[id];
      }
    }

    this.update();
  }
}
