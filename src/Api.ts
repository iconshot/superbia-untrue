import { Context, State, Hook } from "untrue";

import { v4 as uuid } from "uuid";

import {
  Client,
  EndpointRecord,
  Pagination,
  ResponseResult,
} from "@superbia/client";

import { DocumentSchemaRecord } from "./SuperbiaContext";

import { DocumentContext, Documents } from "./DocumentContext";

import {
  RequestContext,
  Request,
  PaginationResult,
  RequestResult,
} from "./RequestContext";

export default class Api<
  K extends DocumentSchemaRecord,
  M extends EndpointRecord,
  N extends EndpointRecord = {},
  O extends string = "id",
  P = any
> extends Context<State, P> {
  public readonly documents: DocumentContext<K, M, O>;
  public readonly requests: RequestContext<M, O>;

  constructor(public readonly client: Client<M, N>, idKey: string = "id") {
    super();

    this.documents = new DocumentContext<K, M, O>(client, idKey);
    this.requests = new RequestContext<M, O>(idKey);

    const listener = (): void => {
      this.update();
    };

    this.documents.on("update", listener);
    this.requests.on("update", listener);
  }

  public useDocuments<W>(selector: (documents: Documents<K, O>) => W): W {
    return Hook.useContext(
      this.documents,
      (): W => selector(this.documents.data)
    );
  }

  public useRequest<Y extends ResponseResult, W, X extends any[] = any[]>(
    key: string,
    selector: (request: Request<RequestResult<Y, O>>) => W,
    requester?: (...args: X) => Promise<Y>
  ): [W, (...args: X) => Promise<void>] {
    const value = Hook.useContext(this.requests, (): W => {
      let request = (this.requests.data[key] ?? null) as Request<
        RequestResult<Y, O>
      > | null;

      // dummy request

      request ??= {
        loading: false,
        done: false,
        result: null,
        error: null,
      };

      return selector(request);
    });

    const request = async (...args: X): Promise<void> => {
      if (requester === undefined) {
        throw new Error("Requester not defined in useRequest.");
      }

      const request: Request<any> = {
        loading: true,
        done: false,
        result: null,
        error: null,
      };

      this.requests.data[key] = request;

      this.requests.update();

      try {
        const result = await requester(...args);

        const parsedResult = this.requests.parseResult(result);

        request.loading = false;
        request.done = true;
        request.result = parsedResult;
        request.error = null;

        this.requests.update();
      } catch (error: any) {
        request.loading = false;
        request.done = false;
        request.result = null;
        request.error = error;

        this.requests.update();
      }
    };

    return [value, request];
  }

  public useLoad<Y extends ResponseResult, W, X extends any[]>(
    key: string,
    selector: (request: Request<RequestResult<Y, O>>) => W,
    loader: (...args: X) => Promise<Y>
  ): [W, (...args: X) => Promise<void>] {
    const value = Hook.useContext(this.requests, (): W => {
      let request = (this.requests.data[key] ?? null) as Request<
        RequestResult<Y, O>
      > | null;

      request ??= {
        loading: false,
        done: false,
        result: null,
        error: null,
      };

      return selector(request);
    });

    const load = async (...args: X): Promise<void> => {
      const request = (this.requests.data[key] ??
        null) as Request<ResponseResult> | null;

      if (request === null) {
        throw new Error("Request not initialized yet.");
      }

      if (request.loading) {
        throw new Error('Request is in "loading" state.');
      }

      if (request.error !== null) {
        throw new Error('Request is in "error" state.');
      }

      const tmpResult = request.result!;

      let tmpPagination: PaginationResult<Pagination<any>, string>;

      let endpointName: string;

      let rethrow = false;

      this.client.once("request", (endpoints): void => {
        const keys = Object.keys(endpoints);

        /*
      
        any error found here will reject the entire client.request
        before the request is actually sent to the server
        
        */

        try {
          if (keys.length === 0) {
            throw new Error(`Argument "endpoints" can't be empty.`);
          }

          endpointName = keys[0];

          tmpPagination = tmpResult[endpointName];

          if (tmpPagination === undefined) {
            throw new Error(
              `Endpoint "${endpointName}" not in request result.`
            );
          }

          if (!(tmpPagination instanceof PaginationResult)) {
            throw new Error(
              `Endpoint "${endpointName}" is not of Pagination type.`
            );
          }
        } catch (error) {
          rethrow = true;

          throw error;
        }

        tmpPagination.loading = true;
        tmpPagination.error = null;

        this.requests.update();
      });

      endpointName = endpointName!;
      tmpPagination = tmpPagination!;

      try {
        const result = await loader(...args);

        const parsedResult = this.requests.parseResult(result);

        const endpointResult = parsedResult[endpointName] as PaginationResult<
          Pagination<any>,
          string
        >;

        tmpPagination.loading = false;
        tmpPagination.error = null;

        tmpPagination.result.hasNextPage = endpointResult.result.hasNextPage;

        tmpPagination.result.nextPageCursor =
          endpointResult.result.nextPageCursor;

        tmpPagination.result.nodes = [
          ...tmpPagination.result.nodes,
          ...endpointResult.result.nodes,
        ];

        this.requests.update();
      } catch (error: any) {
        // error comes from the once listener, treat it as early throw

        if (rethrow) {
          throw error;
        }

        tmpPagination.loading = false;
        tmpPagination.error = error;

        this.requests.update();
      }
    };

    return [value, load];
  }

  public useRequestKey(params?: any[]): string {
    return Hook.useMemo((): string => uuid(), params);
  }
}
