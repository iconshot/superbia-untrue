import { Context } from "untrue";

import { Client, EndpointRecord } from "@superbia/client";

type IdObject<U extends string> = {
  [K in U]: string;
};

export type ParsedResult<T, U extends string = "id"> = T extends IdObject<U>
  ? string
  : T extends IdObject<U> | null
  ? string | null
  : T extends IdObject<U>[]
  ? string[]
  : T extends (IdObject<U> | null)[]
  ? (string | null)[]
  : T extends null
  ? null
  : T extends object
  ? { [K in keyof T]: ParsedResult<T[K], U> }
  : T;

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
