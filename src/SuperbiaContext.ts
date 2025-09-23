import { Context } from "untrue";

import { Document } from "@superbia/client";

export type IdDocument<O extends string> = Document & {
  [K in O]: string;
};

export type IdDocumentRecord<O extends string> = Record<string, IdDocument<O>>;

export type ParsedResult<O extends string, T> = T extends
  | string
  | number
  | boolean
  | null
  ? T
  : T extends IdDocument<O>
  ? string
  : { [K in keyof T]: ParsedResult<O, T[K]> };

export class SuperbiaContext extends Context {
  protected typenameKey: string = "__typename__";

  constructor(protected idKey: string) {
    super();
  }

  protected isIdDocument(value: Record<string, any>): boolean {
    return (
      this.idKey in value &&
      this.typenameKey in value &&
      typeof value[this.idKey] === "string" &&
      typeof value[this.typenameKey] === "string"
    );
  }
}
