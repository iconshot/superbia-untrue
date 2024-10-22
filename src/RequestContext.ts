import {
  Result,
  Pagination,
  EndpointRecord,
  ResponseResult,
} from "@superbia/client";

import { ParsedResult, SuperbiaContext } from "./SuperbiaContext";

export interface PaginationResult<T, O extends string = "id"> {
  loading: boolean;
  result: ParsedResult<T, O>;
  error: Error | null;
}

export type Request<T extends ResponseResult, O extends string = "id"> = {
  loading: boolean;
  done: boolean;
  result:
    | {
        [K in keyof T]: T[K] extends Pagination<any>
          ? PaginationResult<T[K], O>
          : ParsedResult<T[K], O>;
      }
    | null;
  error: Error | null;
};

export type Requests<
  T extends EndpointRecord,
  O extends string = "id"
> = Record<
  string,
  Request<Partial<{ [K in keyof T]: Result<T[K]["result"]> }>, O>
>;

export class RequestContext<
  M extends EndpointRecord,
  O extends string
> extends SuperbiaContext {
  public data: Requests<M, O> = {} as Requests<M, O>;

  public parseResult(result: ResponseResult): ResponseResult {
    const tmpResult: ResponseResult = {};

    for (const key in result) {
      const endpointResult = result[key];

      let tmpEndpointResult: any;

      if (
        endpointResult !== null &&
        typeof endpointResult === "object" &&
        this.typenameKey in endpointResult &&
        endpointResult[this.typenameKey].endsWith("Pagination")
      ) {
        tmpEndpointResult = {
          loading: false,
          result: this.parseResultValue(endpointResult),
          error: null,
        };
      } else {
        tmpEndpointResult = this.parseResultValue(endpointResult);
      }

      tmpResult[key] = tmpEndpointResult;
    }

    return tmpResult;
  }
}
