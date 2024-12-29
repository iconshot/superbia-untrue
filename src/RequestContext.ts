import {
  Result,
  Pagination,
  EndpointRecord,
  ResponseResult,
} from "@superbia/client";

import { ParsedResult, SuperbiaContext } from "./SuperbiaContext";

export class PaginationResult<
  T extends Pagination<any>,
  O extends string = "id"
> {
  public loading: boolean;
  public result: ParsedResult<T, O>;
  public error: Error | null;

  constructor({
    loading,
    result,
    error,
  }: {
    loading: boolean;
    result: ParsedResult<T, O>;
    error: Error | null;
  }) {
    this.loading = loading;
    this.result = result;
    this.error = error;
  }
}

export type RequestResult<T extends ResponseResult, O extends string = "id"> = {
  [K in keyof T]: T[K] extends Pagination<any>
    ? PaginationResult<T[K], O>
    : ParsedResult<T[K], O>;
};

export type Request<T extends ResponseResult> = {
  loading: boolean;
  done: boolean;
  result: T | null;
  error: Error | null;
};

export type Requests<
  T extends EndpointRecord,
  O extends string = "id"
> = Record<
  string,
  Request<Partial<RequestResult<{ [K in keyof T]: Result<T[K]["result"]> }, O>>>
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
        tmpEndpointResult = new PaginationResult<Pagination<any>, O>({
          loading: false,
          result: this.parseResultValue(endpointResult),
          error: null,
        });
      } else {
        tmpEndpointResult = this.parseResultValue(endpointResult);
      }

      tmpResult[key] = tmpEndpointResult;
    }

    return tmpResult;
  }
}
