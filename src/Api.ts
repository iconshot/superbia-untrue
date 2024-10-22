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
import { RequestContext, Request, PaginationResult } from "./RequestContext";

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
    selector: (request: Request<Y, O>) => W,
    requester?: (...args: X) => Promise<Y>
  ): [W, (...args: X) => Promise<void>] {
    const value = Hook.useContext(this.requests, (): W => {
      let request = (this.requests.data[key] ?? null) as Request<Y, O> | null;

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

      this.requests.data[key] = {
        loading: true,
        done: false,
        result: null,
        error: null,
      };

      this.requests.update();

      try {
        const result = await requester(...args);

        const parsedResult = this.requests.parseResult(result);

        this.requests.data[key] = {
          loading: false,
          done: true,
          result: parsedResult as any,
          error: null,
        };

        this.requests.update();
      } catch (error) {
        this.requests.data[key] = {
          loading: false,
          done: false,
          result: null,
          error,
        };

        this.requests.update();
      }
    };

    return [value, request];
  }

  public useLoad<Y extends ResponseResult, W, X extends any[]>(
    key: string,
    selector: (request: Request<Y, O>) => W,
    loader: (...args: X) => Promise<Y>
  ): [W, (...args: X) => Promise<void>] {
    const value = Hook.useContext(this.requests, (): W => {
      const request = this.requests.data[key] as Request<Y, O>;

      return selector(request);
    });

    const load = async (...args: X): Promise<void> => {
      const request: Request<ResponseResult, string> = this.requests.data[key];

      const tmpResult = request.result!;

      let tmpPagination: PaginationResult<Pagination<any>, string>;

      let endpointName: string;

      this.client.once("request", (endpoints): void => {
        endpointName = Object.keys(endpoints)[0];

        tmpPagination = tmpResult[endpointName];

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

        tmpPagination.result.nodes.push(...endpointResult.result.nodes);

        this.requests.update();
      } catch (error) {
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
