import {
  Result,
  Pagination,
  EndpointRecord,
  ResponseResult,
} from "@superbia/client";

import { ParsedResult, SuperbiaContext } from "./SuperbiaContext";

export class PaginationResult<O extends string, T extends Pagination<any>> {
  public loading: boolean;
  public result: ParsedResult<O, T>;
  public error: any;

  constructor({
    loading,
    result,
    error,
  }: {
    loading: boolean;
    result: ParsedResult<O, T>;
    error: any;
  }) {
    this.loading = loading;
    this.result = result;
    this.error = error;
  }
}

export type RequestResult<O extends string, T extends ResponseResult> = {
  [K in keyof T]: T[K] extends Pagination<any>
    ? PaginationResult<O, T[K]>
    : ParsedResult<O, T[K]>;
};

export type ApiRequest<T extends ResponseResult> = {
  loading: boolean;
  done: boolean;
  result: T | null;
  error: any;
};

export type ApiRequests<O extends string, T extends EndpointRecord> = Record<
  string,
  ApiRequest<
    Partial<RequestResult<O, { [K in keyof T]: Result<T[K]["result"]> }>>
  >
>;

export class RequestContext<
  O extends string,
  M extends EndpointRecord
> extends SuperbiaContext {
  public data: ApiRequests<O, M> = {} as ApiRequests<O, M>;

  public parseResult(result: ResponseResult): ResponseResult {
    const tmpResult: ResponseResult = {};

    for (const key in result) {
      const endpointResult = result[key];

      let tmpEndpointResult: any;

      if (
        endpointResult !== null &&
        typeof endpointResult === "object" &&
        this.typenameKey in endpointResult &&
        endpointResult[this.typenameKey] === "__pagination__"
      ) {
        tmpEndpointResult = new PaginationResult<O, Pagination<any>>({
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

  private parseResultValue(value: any): any {
    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((tmpValue): any => this.parseResultValue(tmpValue));
    }

    if (typeof value === "object") {
      const isIdDocument = this.isIdDocument(value);

      if (isIdDocument) {
        const id = value[this.idKey];

        return id;
      }

      const tmpValue: Record<string, any> = {};

      for (const key in value) {
        tmpValue[key] = this.parseResultValue(value[key]);
      }

      return tmpValue;
    }

    return value;
  }
}
