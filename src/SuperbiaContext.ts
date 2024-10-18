import { Context } from "untrue";

import { Client, EndpointRecord } from "@superbia/client";

type IdObject<O extends string> = {
  [K in O]: string;
};

export type ParsedResult<T, O extends string = "id"> = T extends
  | string
  | number
  | boolean
  | null
  ? T
  : T extends IdObject<O>
  ? string
  : { [K in keyof T]: ParsedResult<T[K], O> };

export type DocumentSchema = Record<string, any>;

export type DocumentSchemaRecord = Record<string, DocumentSchema>;

export type DocumentData = Record<string, Record<string, DocumentSchema>>;

export class SuperbiaContext<M extends EndpointRecord> extends Context {
  protected typenameKey: string = "_typename";

  constructor(protected client: Client<M, any>, protected idKey: string) {
    super();
  }

  public parseResultValue(result: any, data: DocumentData = {}): any {
    if (result === null) {
      return null;
    }

    if (Array.isArray(result)) {
      return result.map((element): any => this.parseResultValue(element, data));
    }

    if (typeof result === "object") {
      const newResult = {};

      for (const key in result) {
        newResult[key] = this.parseResultValue(result[key], data);
      }

      const isDocument = this.idKey in result && this.typenameKey in result;

      if (!isDocument) {
        return newResult;
      }

      const id = result[this.idKey];
      const typename = result[this.typenameKey];

      if (!(typename in data)) {
        data[typename] = {};
      }

      data[typename][id] = newResult;

      return result[this.idKey];
    }

    return result;
  }
}
