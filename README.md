# @superbia/untrue

Integrate Superbia and Untrue.

## Installation

```
npm i @superbia/untrue
```

## Get started

We will use the Untrue's Context API to integrate Superbia and Untrue. Two contexts are needed:

- `DocumentContext`: It will store all the documents returned by the Superbia requests and subscriptions, e.g., users, posts, comments, etc.
- `RequestContext` It will store all the requests we do via a Superbia client.

#### What is a Document?

A document is an object that has an ID and a typename.

```json
{
  "user": {
    "_typename": "User",
    "_id": "123",
    "name": "Jhon Doe"
  }
}
```

In this case the ID is found at `_id`. This may change from app to app according to how your data has been structured. Common keys for ID are: `id`, `ID`, `_id`.

`_typename`, on the other hand, is automatically added by Superbia in the server side.

## DocumentContext

`DocumentContext` will intercept any data handled by the `client` and it will group the documents based on their ID and typename.

If we receive some client data like:

```json
{
  "user": {
    "_typename": "User",
    "_id": "123",
    "name": "Jhon Doe",
    "lastPost": {
      "_typename": "Post",
      "_id": "456",
      "text": "Hello world"
    }
  }
}
```

... the `DocumentContext` data will be:

```js
this.documents = {
  User: {
    123: {
      _typename: "User",
      _id: "123",
      name: "Jhon Doe",
      lastPost: "456",
    },
  },
  Post: {
    456: {
      _typename: "Post",
      _id: "456",
      text: "Hello world",
    },
  },
};
```

Notice how for `lastPost` we only store the `id`. We do this to have a single source of truth for every document.

### Creation

`AppDocumentContext.js`

```js
import { DocumentContext } from "@superbia/untrue";

import { client } from "./client";

class AppDocumentContext extends DocumentContext {
  // we'll have the documents in this.documents

  onFollow = (userId) => {
    const user = this.documents.User[userId]; // get the user

    // update user

    user.following = true;
    user.followersCount++;

    this.update(); // notify the Wrapper of changes
  };

  onUnfollow = (userId) => {
    const user = this.documents.User[userId]; // get the user

    // update user

    user.following = false;
    user.followersCount--;

    this.update(); // notify the Wrapper of changes
  };
}

export default new AppDocumentContext(client, {
  id: "_id",
  typename: "_typename",
}); // the client and the keys of documents
```

### Usage

`User.js`

```js
import { Node, Wrapper } from "untrue";

import AppDocumentContext from "./AppDocumentContext";

function User({ userId, name, following, onFollow, onUnfollow }) {
  const onFollowUser = () => onFollow(userId);
  const onUnfollowUser = () => onUnfollow(userId);

  return [
    new Node("span", name),
    following
      ? new Node("button", { onclick: onUnfollowUser }, "unfollow")
      : new Node("button", { onclick: onFollowUser }, "follow"),
  ];
}

export default Wrapper.wrapContext(User, AppDocumentContext, (props) => {
  const { userId } = props; // we receive the userId as a prop

  const documents = AppDocumentContext.getDocuments(); // all the documents

  const { name, following } = documents.User[userId]; // the desired user document

  const { onFollow, onUnfollow } = AppDocumentContext; // context handlers

  return { name, following, onFollow, onUnfollow }; // data the component needs
});
```

## RequestContext

`RequestContext` will keep the state of the requests.

Every `request` has 4 properties:

- `loading`: `Boolean`. `true` if the request is loading.
- `done`: `Boolean`. `true` if the request has been completed and it has no error.
- `data`: `Object`. Result of the request. `null` if the request hasn't been completed yet or an error was found.
- `error`: `Error` object or `null`. It's an `Error` object if the request has been completed but there's an error in the request itself or in any endpoint.

Let's say we have an endpoint `userPosts` that returns an array of `Post` documents:

```json
{
  "userPosts": [
    { "_typename": "Post", "_id": "123", "text": "Hello world" },
    { "_typename": "Post", "_id": "456", "text": "Lorem ipsum" }
  ]
}
```

The `requests` inside `RequestContext` would be:

```js
this.requests = {
  someUniqueRequestKey: {
    loading: false,
    done: true,
    error: null,
    data: { userPosts: ["123", "456"] },
  },
  // more requests
};
```

Just as in `DocumentContext`, we won't store the entire documents but their IDs only.

### Creation

`AppRequestContext.js`

```js
import { RequestContext } from "@superbia/untrue";

import { client } from "./client";

class AppRequestContext extends RequestContext {
  onSomeHandler = () => {
    // we can update this.requests data directly from here
  };
}

export default new AppRequestContext(client, {
  id: "_id",
  typename: "_typename",
}); // the client and the keys of documents
```

### Usage

`PostList.js`

```js
import { Component, Node, Wrapper } from "untrue";

import { RequestWrapper } from "@superbia/untrue";

import AppRequestContext from "./AppRequestContext";

import Post from "./Post";

class PostList extends Component {
  constructor(props) {
    super(props);

    this.on("mount", this.handleMountRequest); // request on mount
  }

  handleMountRequest = () => {
    const { requestKey, onRequest } = this.props;

    // it will be requested as:
    // client.request({ posts: null })

    onRequest(requestKey, { posts: null });
  };

  render() {
    const { loading, done, error, postIds } = this.props;

    if (loading) {
      return new Node("span", "Loading...");
    }

    if (error !== null) {
      return new Node("span", error.message);
    }

    if (done) {
      return postIds.map((postId) => new Node(Post, { postId }));
    }

    return null;
  }
}

// RequestWrapper will add the `requestKey` prop

export default RequestWrapper.wrapRequester(
  Wrapper.wrapContext(PostList, AppRequestContext, (props) => {
    const { requestKey } = props;

    const requests = AppRequestContext.getRequests(); // all the requests

    // the desired request, it's undefined until onRequest is fired

    const {
      loading = false,
      done = false,
      error = null,
      data = null,
    } = requests?.[requestKey] ?? {};

    const postIds = data !== null ? data.posts : [];

    const { onRequest } = AppRequestContext; // context handler

    return { loading, done, error, postIds, onRequest }; // data the component needs
  })
);
```

`Post.js`

```js
import { Node, Wrapper } from "untrue";

import AppDocumentContext from "./AppDocumentContext";

function Post({ text }) {
  return new Node("div", text);
}

export default Wrapper.wrapContext(Post, AppDocumentContext, (props) => {
  const { postId } = props;

  const documents = AppDocumentContext.getDocuments();

  const { text } = documents.Post[postId];

  return { text };
});
```

### Intercepting requests

As we know, documents are stored in `DocumentContext` and requests are stored in `RequestContext`.

Let's say you want to update a document when a specific endpoint is requested.

You can `intercept` a request to do so. You need to override the `intercept` method to return an object of interceptors.

`AppDocumentContext.js`:

```js
class AppDocumentContext extends DocumentContext {
  onLike = (postId) => {
    const post = this.documents.Post[postId];

    post.liked = true;
    post.likesCount++;

    this.update();
  };
}
```

`AppRequestContext.js`:

```js
import AppDocumentContext from "./AppDocumentContext";

class AppRequestContext extends RequestContext {
  intercept() {
    return {
      likePost: {
        load: (requestKey, endpoints) => {
          // every time `likePost` is requested, this closure will be executed

          const { postId } = endpoints.likePost;

          AppDocumentContext.onLike(postId);
        },
      },
    };
  }
}
```

Then in the component, we call the handler:

```js
const onLike = () => {
  onRequest(null, { likePost: { postId } }); // postId comes from props
};
```

### Paginated requests

To implement paginated requests the server must return a Pagination object.

```json
{
  "userPosts": {
    "_typename": "PostPagination",
    "nodes": [
      { "_typename": "Post", "_id": "123", "text": "Hello world" },
      { "_typename": "Post", "_id": "456", "text": "Lorem ipsum" }
    ],
    "pageInfo": {
      "_typename": "PaginationPageInfo",
      "hasNextPage": true,
      "nextPageCursor": "789"
    }
  }
}
```

`RequestContext` will manage to store the data like:

```js
this.requests = {
  someRequestKey: {
    loading: false,
    done: false,
    error: null,
    data: {
      userPosts: {
        loading: false,
        error: null,
        data: {
          nodes: ["123", "456"],
          pageInfo: { hasNextPage: true, nextPageCursor: "789" },
        },
      },
    },
  },
};
```

Notice how we have two set of properties for `loading`, `error` and `data`. The first set will belong to the `onRequest` call while the second one will belong to the `onLoad` calls.

The rules of documents will be applied here, so every `node` will be stored as an ID only.

#### Usage

We will need two different components: one for the initial `onRequest` call and another one for the subsequent `onLoad` calls.

`PaginatedPostList.js`

```js
import { Component, Node, Wrapper } from "untrue";

import { RequestWrapper } from "@superbia/untrue";

import AppRequestContext from "./AppRequestContext";

import Content from "./Content";

class PaginatedPostList extends Component {
  constructor(props) {
    super(props);

    this.on("mount", this.handleMountRequest); // request on mount
  }

  handleMountRequest = () => {
    const { requestKey, onRequest } = this.props;

    onRequest(requestKey, { posts: { limit: 2 } });
  };

  render() {
    const { requestKey, loading, done, error } = this.props;

    if (loading) {
      return new Node("span", "Loading...");
    }

    if (error !== null) {
      return new Node("span", error.message);
    }

    if (done) {
      return new Node(Content, { requestKey }); // pass requestKey as prop
    }

    return null;
  }
}

export default RequestWrapper.wrapRequester(
  Wrapper.wrapContext(PaginatedPostList, AppRequestContext, (props) => {
    const { requestKey } = props;

    const requests = AppRequestContext.getRequests(); // all the requests

    const {
      loading = false,
      done = false,
      error = null,
    } = requests?.[requestKey] ?? {}; // the desire request

    const { onRequest } = AppRequestContext; // context handler

    return { loading, done, error, onRequest }; // data the component needs
  })
);
```

`Content.js`

```js
import { Node, Wrapper } from "untrue";

import AppRequestContext from "./AppRequestContext";

import Post from "./Post";

function Content({
  requestKey,
  loading,
  error,
  postIds,
  hasNextPage,
  nextPageCursor,
  onLoad,
}) {
  const onLoadNext = () => {
    onLoad(requestKey, { posts: { limit: 2, cursor: nextPageCursor } });
  };

  return [
    postIds.map((postId) => new Node(Post, { postId })),
    hasNextPage
      ? new Node("button", { onclick: onLoadNext }, "load next page")
      : null,
    loading ? new Node("span", "Loading next page...") : null,
    error !== null ? new Node("span", error.message) : null,
  ];
}

// here we don't need RequestWrapper because we receive the "requestKey" as a prop already

export default Wrapper.wrapContext(Content, AppRequestContext, (props) => {
  const { requestKey } = props;

  const requests = AppRequestContext.getRequests(); // all the requests

  const {
    loading,
    error,
    data: {
      nodes: postIds, // renaming for convenience
      pageInfo: { hasNextPage, nextPageCursor },
    },
  } = requests[requestKey].data.posts; // the desired request's data

  const { onLoad } = AppRequestContext; // context handler

  return { loading, error, postIds, hasNextPage, nextPageCursor, onLoad }; // data the component needs
});
```

## RequestWrapper

`RequestWrapper` exposes a method `wrapRequester`. This method will add a `requestKey` prop to the component.

```js
import { RequestWrapper } from "@superbia/untrue";

function Child({ requestKey }) {
  // ...
}

const UsernameRequester = RequestWrapper.wrapRequester(Child, (props) => {
  const { username } = props;

  return username;
}); // requestKey will be the username prop

const ValueRequester = RequestWrapper.wrapRequester(Child, "profile"); // requestKey will be "profile"

const UniqueRequester = RequestWrapper.wrapRequester(Child); // requestKey will be a unique id
```
