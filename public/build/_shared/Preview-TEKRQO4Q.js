import {
  EditorStore,
  FilesStore,
  WORK_DIR_NAME,
  dirname,
  unreachable
} from "/build/_shared/chunk-6PPN52BK.js";
import {
  atom,
  createScopedLogger,
  map,
  useStore
} from "/build/_shared/chunk-PLHX6T5Y.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-O3LOEUP4.js";
import {
  createHotContext
} from "/build/_shared/chunk-ZE7S64EJ.js";
import "/build/_shared/chunk-GEKJEUI6.js";
import {
  require_react
} from "/build/_shared/chunk-EKEGKXS4.js";
import {
  __publicField,
  __toESM
} from "/build/_shared/chunk-LKFSZYGT.js";

// app/components/workbench/Preview.tsx
var import_react4 = __toESM(require_react(), 1);

// app/components/ui/IconButton.tsx
var import_react = __toESM(require_react(), 1);

// app/utils/classNames.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/classNames.ts"
  );
  import.meta.hot.lastModified = "1737602845915.224";
}
function classNames(...args) {
  let classes = "";
  for (const arg of args) {
    classes = appendClass(classes, parseValue(arg));
  }
  return classes;
}
function parseValue(arg) {
  if (typeof arg === "string" || typeof arg === "number") {
    return arg;
  }
  if (typeof arg !== "object") {
    return "";
  }
  if (Array.isArray(arg)) {
    return classNames(...arg);
  }
  let classes = "";
  for (const key in arg) {
    if (arg[key]) {
      classes = appendClass(classes, key);
    }
  }
  return classes;
}
function appendClass(value, newClass) {
  if (!newClass) {
    return value;
  }
  if (value) {
    return value + " " + newClass;
  }
  return value + newClass;
}

// app/components/ui/IconButton.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ui/IconButton.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ui/IconButton.tsx"
  );
  import.meta.hot.lastModified = "1738203238265.6326";
}
var IconButton = (0, import_react.memo)(_c = ({
  icon,
  size = "xl",
  className,
  iconClassName,
  disabledClassName,
  disabled = false,
  title,
  onClick,
  children
}) => {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { className: classNames("flex items-center text-gobezeai-elements-item-contentDefault bg-transparent enabled:hover:text-gobezeai-elements-item-contentActive rounded-md p-1 enabled:hover:bg-gobezeai-elements-item-backgroundActive disabled:cursor-not-allowed", {
    [classNames("opacity-30", disabledClassName)]: disabled
  }, className), title, disabled, onClick: (event) => {
    if (disabled) {
      return;
    }
    onClick?.(event);
  }, children: children ? children : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: classNames(icon, getIconSize(size), iconClassName) }, void 0, false, {
    fileName: "app/components/ui/IconButton.tsx",
    lineNumber: 42,
    columnNumber: 32
  }, this) }, void 0, false, {
    fileName: "app/components/ui/IconButton.tsx",
    lineNumber: 34,
    columnNumber: 10
  }, this);
});
_c2 = IconButton;
function getIconSize(size) {
  if (size === "sm") {
    return "text-sm";
  } else if (size === "md") {
    return "text-md";
  } else if (size === "lg") {
    return "text-lg";
  } else if (size === "xl") {
    return "text-xl";
  } else {
    return "text-2xl";
  }
}
var _c;
var _c2;
$RefreshReg$(_c, "IconButton$memo");
$RefreshReg$(_c2, "IconButton");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/lib/runtime/action-runner.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/runtime/action-runner.ts"
  );
  import.meta.hot.lastModified = "1738207898730.4854";
}
var logger = createScopedLogger("ActionRunner");
var ActionRunner = class {
  #webcontainer;
  #currentExecutionPromise = Promise.resolve();
  actions = map({});
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
  }
  addAction(data) {
    const { actionId } = data;
    const actions = this.actions.get();
    const action = actions[actionId];
    if (action) {
      return;
    }
    const abortController = new AbortController();
    this.actions.setKey(actionId, {
      ...data.action,
      status: "pending",
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: "aborted" });
      },
      abortSignal: abortController.signal
    });
    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: "running" });
    });
  }
  async runAction(data) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];
    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }
    if (action.executed) {
      return;
    }
    this.#updateAction(actionId, { ...action, ...data.action, executed: true });
    this.#currentExecutionPromise = this.#currentExecutionPromise.then(() => {
      return this.#executeAction(actionId);
    }).catch((error) => {
      console.error("Action failed:", error);
    });
  }
  async #executeAction(actionId) {
    const action = this.actions.get()[actionId];
    this.#updateAction(actionId, { status: "running" });
    try {
      switch (action.type) {
        case "shell": {
          await this.#runShellAction(action);
          break;
        }
        case "file": {
          await this.#runFileAction(action);
          break;
        }
      }
      this.#updateAction(actionId, { status: action.abortSignal.aborted ? "aborted" : "complete" });
    } catch (error) {
      this.#updateAction(actionId, { status: "failed", error: "Action failed" });
      throw error;
    }
  }
  async #runShellAction(action) {
    if (action.type !== "shell") {
      unreachable("Expected shell action");
    }
    const webcontainer2 = await this.#webcontainer;
    const process = await webcontainer2.spawn("jsh", ["-c", action.content], {
      env: { npm_config_yes: true }
    });
    action.abortSignal.addEventListener("abort", () => {
      process.kill();
    });
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        }
      })
    );
    const exitCode = await process.exit;
    logger.debug(`Process terminated with code ${exitCode}`);
  }
  async #runFileAction(action) {
    if (action.type !== "file") {
      unreachable("Expected file action");
    }
    const webcontainer2 = await this.#webcontainer;
    let folder = dirname(action.filePath);
    folder = folder.replace(/\/+$/g, "");
    if (folder !== ".") {
      try {
        await webcontainer2.fs.mkdir(folder, { recursive: true });
        logger.debug("Created folder", folder);
      } catch (error) {
        logger.error("Failed to create folder\n\n", error);
      }
    }
    try {
      await webcontainer2.fs.writeFile(action.filePath, action.content);
      logger.debug(`File written ${action.filePath}`);
    } catch (error) {
      logger.error("Failed to write file\n\n", error);
    }
  }
  #updateAction(id, newState) {
    const actions = this.actions.get();
    this.actions.setKey(id, { ...actions[id], ...newState });
  }
};

// node_modules/@webcontainer/api/dist/internal/constants.js
var DEFAULT_EDITOR_ORIGIN = "https://stackblitz.com";

// node_modules/@webcontainer/api/dist/internal/TypedEventTarget.js
var TypedEventTarget = class {
  _bus = new EventTarget();
  listen(listener) {
    function wrappedListener(event) {
      listener(event.data);
    }
    this._bus.addEventListener("message", wrappedListener);
    return () => this._bus.removeEventListener("message", wrappedListener);
  }
  fireEvent(data) {
    this._bus.dispatchEvent(new MessageEvent("message", { data }));
  }
};

// node_modules/@webcontainer/api/dist/internal/tokens.js
var IGNORED_ERROR = new Error();
IGNORED_ERROR.stack = "";
var accessTokenChangedListeners = new TypedEventTarget();
function addAccessTokenChangedListener(listener) {
  return accessTokenChangedListeners.listen(listener);
}

// node_modules/@webcontainer/api/dist/internal/iframe-url.js
var params = {};
var editorOrigin = null;
var iframeSettings = {
  get editorOrigin() {
    if (editorOrigin == null) {
      editorOrigin = new URL(globalThis.WEBCONTAINER_API_IFRAME_URL ?? DEFAULT_EDITOR_ORIGIN).origin;
    }
    return editorOrigin;
  },
  set editorOrigin(newOrigin) {
    editorOrigin = new URL(newOrigin).origin;
  },
  setQueryParam(key, value) {
    params[key] = value;
  },
  get url() {
    const url = new URL(this.editorOrigin);
    url.pathname = "/headless";
    for (const param in params) {
      url.searchParams.set(param, params[param]);
    }
    url.searchParams.set("version", "1.5.1-internal.7");
    return url;
  }
};

// node_modules/@webcontainer/api/dist/internal/reset-promise.js
function resettablePromise() {
  let resolve;
  let promise;
  function reset2() {
    promise = new Promise((_resolve) => resolve = _resolve);
  }
  reset2();
  return {
    get promise() {
      return promise;
    },
    resolve(value) {
      return resolve(value);
    },
    reset: reset2
  };
}

// node_modules/@webcontainer/api/dist/internal/auth-state.js
var authState = {
  initialized: false,
  bootCalled: false,
  authComplete: resettablePromise(),
  clientId: "",
  oauthScope: "",
  broadcastChannel: null,
  get editorOrigin() {
    return iframeSettings.editorOrigin;
  },
  tokens: null
};
var authFailedListeners = new TypedEventTarget();
var loggedOutListeners = new TypedEventTarget();
function assertAuthTokens(tokens) {
  if (!tokens) {
    throw new Error("Oops! Tokens is not defined when it always should be.");
  }
}

// node_modules/@webcontainer/api/dist/preview-message-types.js
var PreviewMessageType;
(function(PreviewMessageType2) {
  PreviewMessageType2["UncaughtException"] = "PREVIEW_UNCAUGHT_EXCEPTION";
  PreviewMessageType2["UnhandledRejection"] = "PREVIEW_UNHANDLED_REJECTION";
  PreviewMessageType2["ConsoleError"] = "PREVIEW_CONSOLE_ERROR";
})(PreviewMessageType || (PreviewMessageType = {}));

// node_modules/@webcontainer/api/dist/vendor/index.js
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var comlink_exports = {};
__export(comlink_exports, {
  createEndpoint: () => createEndpoint,
  expose: () => expose,
  proxy: () => proxy,
  proxyMarker: () => proxyMarker,
  releaseProxy: () => releaseProxy,
  transfer: () => transfer,
  transferHandlers: () => transferHandlers,
  windowEndpoint: () => windowEndpoint,
  wrap: () => wrap
});
var proxyMarker = Symbol("Comlink.proxy");
var createEndpoint = Symbol("Comlink.endpoint");
var releaseProxy = Symbol("Comlink.releaseProxy");
var throwMarker = Symbol("Comlink.thrown");
var isObject = (val) => typeof val === "object" && val !== null || typeof val === "function";
var proxyTransferHandler = {
  canHandle: (val) => isObject(val) && val[proxyMarker],
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port) {
    port.start();
    return wrap(port);
  }
};
var throwTransferHandler = {
  canHandle: (value) => isObject(value) && throwMarker in value,
  serialize({ value }) {
    let serialized;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack
        }
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }
    throw serialized.value;
  }
};
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler]
]);
function expose(obj, ep = self) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    const { id, type, path } = Object.assign({ path: [] }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
      const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
      switch (type) {
        case 0:
          {
            returnValue = rawValue;
          }
          break;
        case 1:
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case 2:
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case 3:
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case 4:
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case 5:
          {
            returnValue = void 0;
          }
          break;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    Promise.resolve(returnValue).catch((value) => {
      return { value, [throwMarker]: 0 };
    }).then((returnValue2) => {
      const [wireValue, transferables] = toWireValue(returnValue2);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
      if (type === 5) {
        ep.removeEventListener("message", callback);
        closeEndPoint(ep);
      }
    });
  });
  if (ep.start) {
    ep.start();
  }
}
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
function wrap(ep, target) {
  return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}
function createProxy(ep, path = [], target = function() {
}) {
  let isProxyReleased = false;
  const proxy2 = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      if (prop === releaseProxy) {
        return () => {
          return requestResponseMessage(ep, {
            type: 5,
            path: path.map((p) => p.toString())
          }).then(() => {
            closeEndPoint(ep);
            isProxyReleased = true;
          });
        };
      }
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy2 };
        }
        const r = requestResponseMessage(ep, {
          type: 0,
          path: path.map((p) => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: 1,
        path: [...path, prop].map((p) => p.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if (last === createEndpoint) {
        return requestResponseMessage(ep, {
          type: 4
        }).then(fromWireValue);
      }
      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 2,
        path: path.map((p) => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 3,
        path: path.map((p) => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }
  });
  return proxy2;
}
function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
var transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}
function proxy(obj) {
  return Object.assign(obj, { [proxyMarker]: true });
}
function windowEndpoint(w, context = self, targetOrigin = "*") {
  return {
    postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context)
  };
}
function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: 3,
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: 0,
      value
    },
    transferCache.get(value) || []
  ];
}
function fromWireValue(value) {
  switch (value.type) {
    case 3:
      return transferHandlers.get(value.name).deserialize(value.value);
    case 0:
      return value.value;
  }
}
function requestResponseMessage(ep, msg, transfers) {
  return new Promise((resolve) => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l);
      resolve(ev.data);
    });
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}

// node_modules/@webcontainer/api/dist/utils/is-preview-message.js
var PREVIEW_MESSAGE_TYPES = [
  PreviewMessageType.ConsoleError,
  PreviewMessageType.UncaughtException,
  PreviewMessageType.UnhandledRejection
];
function isPreviewMessage(data) {
  if (data == null || typeof data !== "object") {
    return false;
  }
  if (!("type" in data) || !PREVIEW_MESSAGE_TYPES.includes(data.type)) {
    return false;
  }
  return true;
}

// node_modules/@webcontainer/api/dist/utils/null-prototype.js
function nullPrototype(source) {
  const prototype = /* @__PURE__ */ Object.create(null);
  if (!source) {
    return prototype;
  }
  return Object.assign(prototype, source);
}

// node_modules/@webcontainer/api/dist/utils/file-system.js
function toInternalFileSystemTree(tree) {
  const newTree = { d: {} };
  for (const name of Object.keys(tree)) {
    const entry = tree[name];
    if ("file" in entry) {
      if ("symlink" in entry.file) {
        newTree.d[name] = { f: { l: entry.file.symlink } };
        continue;
      }
      const contents = entry.file.contents;
      const stringContents = typeof contents === "string" ? contents : binaryString(contents);
      const binary = typeof contents === "string" ? {} : { b: true };
      newTree.d[name] = { f: { c: stringContents, ...binary } };
      continue;
    }
    const newEntry = toInternalFileSystemTree(entry.directory);
    newTree.d[name] = newEntry;
  }
  return newTree;
}
function toExternalFileSystemTree(tree) {
  const newTree = nullPrototype();
  if ("f" in tree) {
    throw new Error("It is not possible to export a single file in the JSON format.");
  }
  if ("d" in tree) {
    for (const name of Object.keys(tree.d)) {
      const entry = tree.d[name];
      if ("d" in entry) {
        newTree[name] = nullPrototype({
          directory: toExternalFileSystemTree(entry)
        });
      } else if ("f" in entry) {
        if ("c" in entry.f) {
          newTree[name] = nullPrototype({
            file: nullPrototype({
              contents: entry.f.c
            })
          });
        } else if ("l" in entry.f) {
          newTree[name] = nullPrototype({
            file: nullPrototype({
              symlink: entry.f.l
            })
          });
        }
      }
    }
  }
  return newTree;
}
function binaryString(bytes) {
  let result = "";
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return result;
}

// node_modules/@webcontainer/api/dist/index.js
var bootPromise = null;
var cachedServerPromise = null;
var cachedBootOptions = {};
var decoder = new TextDecoder();
var encoder = new TextEncoder();
var _WebContainer = class {
  _instance;
  _runtimeInfo;
  /**
   * Gives access to the underlying file system.
   */
  fs;
  // #region internal
  internal;
  _tornDown = false;
  _unsubscribeFromTokenChangedListener = () => {
  };
  /** @internal */
  constructor(_instance, fs, _runtimeInfo) {
    this._instance = _instance;
    this._runtimeInfo = _runtimeInfo;
    this.fs = new FileSystemAPIClient(fs);
    this.internal = new WebContainerInternal(_instance);
    if (authState.initialized) {
      this._unsubscribeFromTokenChangedListener = addAccessTokenChangedListener((accessToken) => {
        this._instance.setCredentials({ accessToken, editorOrigin: authState.editorOrigin });
      });
      (async () => {
        await authState.authComplete.promise;
        if (this._tornDown) {
          return;
        }
        assertAuthTokens(authState.tokens);
        await this._instance.setCredentials({
          accessToken: authState.tokens.access,
          editorOrigin: authState.editorOrigin
        });
      })().catch((error) => {
        console.error(error);
      });
    }
  }
  async spawn(command, optionsOrArgs, options) {
    let args = [];
    if (Array.isArray(optionsOrArgs)) {
      args = optionsOrArgs;
    } else {
      options = optionsOrArgs;
    }
    let output = void 0;
    let outputStream = new ReadableStream();
    if (options?.output !== false) {
      const result = streamWithPush();
      output = result.push;
      outputStream = result.stream;
    }
    let stdout = void 0;
    let stdoutStream;
    let stderr = void 0;
    let stderrStream;
    stdoutStream = new ReadableStream();
    stderrStream = new ReadableStream();
    if (options?.stdout) {
      const result = streamWithPush();
      stdout = result.push;
      stdoutStream = result.stream;
    }
    if (options?.stderr) {
      const result = streamWithPush();
      stderr = result.push;
      stderrStream = result.stream;
    }
    const wrappedOutput = proxyListener(binaryListener(output));
    const wrappedStdout = proxyListener(binaryListener(stdout));
    const wrappedStderr = proxyListener(binaryListener(stderr));
    const process = await this._instance.run({
      command,
      args,
      cwd: options?.cwd,
      env: options?.env,
      terminal: options?.terminal
    }, wrappedStdout, wrappedStderr, wrappedOutput);
    return new WebContainerProcessImpl(process, outputStream, stdoutStream, stderrStream);
  }
  async export(path, options) {
    const serializeOptions = {
      format: options?.format ?? "json",
      includes: options?.includes,
      excludes: options?.excludes,
      external: true
    };
    const result = await this._instance.serialize(path, serializeOptions);
    if (serializeOptions.format === "json") {
      const data = JSON.parse(decoder.decode(result));
      return toExternalFileSystemTree(data);
    }
    return result;
  }
  on(event, listener) {
    if (event === "preview-message") {
      const originalListener = listener;
      listener = (message) => {
        if (isPreviewMessage(message)) {
          originalListener(message);
        }
      };
    }
    const { listener: wrapped, subscribe } = syncSubscription(listener);
    return subscribe(this._instance.on(event, comlink_exports.proxy(wrapped)));
  }
  /**
   * Mounts a tree of files into the filesystem. This can be specified as a tree object ({@link FileSystemTree})
   * or as a binary snapshot generated by [`@webcontainer/snapshot`](https://www.npmjs.com/package/@webcontainer/snapshot).
   *
   * @param snapshotOrTree - A tree of files, or a binary snapshot. Note that binary payloads will be transferred.
   * @param options.mountPoint - Specifies a nested path where the tree should be mounted.
   */
  mount(snapshotOrTree, options) {
    const payload = snapshotOrTree instanceof Uint8Array ? snapshotOrTree : snapshotOrTree instanceof ArrayBuffer ? new Uint8Array(snapshotOrTree) : encoder.encode(JSON.stringify(toInternalFileSystemTree(snapshotOrTree)));
    return this._instance.loadFiles(comlink_exports.transfer(payload, [payload.buffer]), {
      mountPoints: options?.mountPoint
    });
  }
  /**
   * Set a custom script to be injected into all previews. When this function is called, every
   * future page reload will contain the provided script tag on all HTML responses.
   *
   * Note:
   *
   * When this function resolves, every preview reloaded _after_ will have the new script.
   * Existing preview have to be explicitely reloaded.
   *
   * To reload a preview you can use `reloadPreview`.
   *
   * @param scriptSrc Source for the script tag.
   * @param options Options to define which type of script this is.
   */
  setPreviewScript(scriptSrc, options) {
    return this._instance.setPreviewScript(scriptSrc, options);
  }
  /**
   * The default value of the `PATH` environment variable for processes started through {@link spawn}.
   */
  get path() {
    return this._runtimeInfo.path;
  }
  /**
   * The full path to the working directory (see {@link FileSystemAPI}).
   */
  get workdir() {
    return this._runtimeInfo.cwd;
  }
  /**
   * Destroys the WebContainer instance, turning it unusable, and releases its resources. After this,
   * a new WebContainer instance can be obtained by calling {@link WebContainer.boot | `boot`}.
   *
   * All entities derived from this instance (e.g. processes, the file system, etc.) also become unusable
   * after calling this method.
   */
  teardown() {
    if (this._tornDown) {
      throw new Error("WebContainer already torn down");
    }
    this._tornDown = true;
    this._unsubscribeFromTokenChangedListener();
    this.fs._teardown();
    this._instance.teardown();
    this._instance[comlink_exports.releaseProxy]();
    if (_WebContainer._instance === this) {
      _WebContainer._instance = null;
    }
  }
  /**
   * Boots a WebContainer. Only a single instance of WebContainer can be booted concurrently
   * (see {@link WebContainer.teardown | `teardown`}).
   *
   * Booting WebContainer is an expensive operation.
   */
  static async boot(options = {}) {
    const { workdirName } = options;
    if (window.crossOriginIsolated && options.coep === "none") {
      console.warn(`A Cross-Origin-Embedder-Policy header is required in cross origin isolated environments.
Set the 'coep' option to 'require-corp'.`);
    }
    if (workdirName?.includes("/") || workdirName === ".." || workdirName === ".") {
      throw new Error("workdirName should be a valid folder name");
    }
    authState.bootCalled = true;
    while (bootPromise) {
      await bootPromise;
    }
    if (_WebContainer._instance) {
      throw new Error("Only a single WebContainer instance can be booted");
    }
    const instancePromise = unsynchronizedBoot(options);
    bootPromise = instancePromise.catch(() => {
    });
    try {
      const instance = await instancePromise;
      _WebContainer._instance = instance;
      return instance;
    } finally {
      bootPromise = null;
    }
  }
};
var WebContainer = _WebContainer;
// #endregion
__publicField(WebContainer, "_instance", null);
var WebContainerInternal = class {
  _instance;
  constructor(_instance) {
    this._instance = _instance;
  }
  watchPaths(options, cb) {
    const { listener, subscribe } = syncSubscription(cb);
    return subscribe(this._instance.watchPaths(options, comlink_exports.proxy(listener)));
  }
  getProcesses() {
    return this._instance.getProcesses();
  }
  onProcessesRemove(cb) {
    const { listener, subscribe } = syncSubscription(cb);
    return subscribe(this._instance.onProcessesRemove(comlink_exports.proxy(listener)));
  }
  serialize(path, options) {
    return this._instance.serialize(path, options);
  }
  setCORSProxy(options) {
    return this._instance.setCORSProxy(options);
  }
  setCORSAuthToken(token) {
    return this._instance.setCORSAuthToken(token);
  }
};
var DIR_ENTRY_TYPE_FILE = 1;
var DIR_ENTRY_TYPE_DIR = 2;
var DirEntImpl = class {
  name;
  _type;
  constructor(name, _type) {
    this.name = name;
    this._type = _type;
  }
  isFile() {
    return this._type === DIR_ENTRY_TYPE_FILE;
  }
  isDirectory() {
    return this._type === DIR_ENTRY_TYPE_DIR;
  }
};
var FSWatcher = class {
  _apiClient;
  _path;
  _options;
  _listener;
  _wrappedListener;
  _watcher;
  _closed = false;
  constructor(_apiClient, _path, _options, _listener) {
    this._apiClient = _apiClient;
    this._path = _path;
    this._options = _options;
    this._listener = _listener;
    this._apiClient._watchers.add(this);
    this._wrappedListener = (event, filename) => {
      if (this._listener && !this._closed) {
        this._listener(event, filename);
      }
    };
    this._apiClient._fs.watch(this._path, this._options, proxyListener(this._wrappedListener)).then((_watcher) => {
      this._watcher = _watcher;
      if (this._closed) {
        this._teardown();
      }
    }).catch(console.error);
  }
  close() {
    if (!this._closed) {
      this._closed = true;
      this._apiClient._watchers.delete(this);
      this._teardown();
    }
  }
  /**
   * @internal
   */
  _teardown() {
    this._watcher?.close().finally(() => {
      this._watcher?.[comlink_exports.releaseProxy]();
    });
  }
};
var WebContainerProcessImpl = class {
  output;
  input;
  exit;
  _process;
  stdout;
  stderr;
  constructor(process, output, stdout, stderr) {
    this.output = output;
    this._process = process;
    this.input = new WritableStream({
      write: (data) => {
        this._getProcess()?.write(data).catch(() => {
        });
      }
    });
    this.exit = this._onExit();
    this.stdout = stdout;
    this.stderr = stderr;
  }
  kill() {
    this._getProcess()?.kill();
  }
  resize(dimensions) {
    this._getProcess()?.resize(dimensions);
  }
  async _onExit() {
    try {
      return await this._process.onExit;
    } finally {
      this._process?.[comlink_exports.releaseProxy]();
      this._process = null;
    }
  }
  _getProcess() {
    if (this._process == null) {
      console.warn("This process already exited");
    }
    return this._process;
  }
};
var FileSystemAPIClient = class {
  _fs;
  _watchers = /* @__PURE__ */ new Set([]);
  constructor(fs) {
    this._fs = fs;
  }
  rm(...args) {
    return this._fs.rm(...args);
  }
  async readFile(path, encoding) {
    return await this._fs.readFile(path, encoding);
  }
  async rename(oldPath, newPath) {
    return await this._fs.rename(oldPath, newPath);
  }
  async writeFile(path, data, options) {
    if (data instanceof Uint8Array) {
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      data = comlink_exports.transfer(new Uint8Array(buffer), [buffer]);
    }
    await this._fs.writeFile(path, data, options);
  }
  async readdir(path, options) {
    const result = await this._fs.readdir(path, options);
    if (isStringArray(result)) {
      return result;
    }
    if (isTypedArrayCollection(result)) {
      return result;
    }
    const entries = result.map((entry) => new DirEntImpl(entry.name, entry["Symbol(type)"]));
    return entries;
  }
  async mkdir(path, options) {
    return await this._fs.mkdir(path, options);
  }
  watch(path, options, listener) {
    if (typeof options === "function") {
      listener = options;
      options = null;
    }
    return new FSWatcher(this, path, options, listener);
  }
  /**
   * @internal
   */
  _teardown() {
    this._fs[comlink_exports.releaseProxy]();
    for (const watcherWrapper of this._watchers) {
      watcherWrapper.close();
    }
  }
};
async function unsynchronizedBoot(options) {
  const { serverPromise } = serverFactory(options);
  const server = await serverPromise;
  const instance = await server.build({
    host: window.location.host,
    version: "1.5.1-internal.7",
    workdirName: options.workdirName,
    forwardPreviewErrors: options.forwardPreviewErrors
  });
  const fs = await instance.fs();
  const runtimeInfo = await instance.runtimeInfo();
  return new WebContainer(instance, fs, runtimeInfo);
}
function binaryListener(listener) {
  if (listener == null) {
    return void 0;
  }
  return (data) => {
    if (data instanceof Uint8Array) {
      listener(decoder.decode(data));
    } else if (data == null) {
      listener(null);
    }
  };
}
function proxyListener(listener) {
  if (listener == null) {
    return void 0;
  }
  return comlink_exports.proxy(listener);
}
function serverFactory(options) {
  if (cachedServerPromise != null) {
    if (options.coep !== cachedBootOptions.coep) {
      console.warn(`Attempting to boot WebContainer with 'coep: ${options.coep}'`);
      console.warn(`First boot had 'coep: ${cachedBootOptions.coep}', new settings will not take effect!`);
    }
    return { serverPromise: cachedServerPromise };
  }
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("allow", "cross-origin-isolated");
  const url = iframeSettings.url;
  if (options.coep) {
    url.searchParams.set("coep", options.coep);
  }
  iframe.src = url.toString();
  const { origin } = url;
  cachedBootOptions = { ...options };
  cachedServerPromise = new Promise((resolve) => {
    const onMessage = (event) => {
      if (event.origin !== origin) {
        return;
      }
      const { data } = event;
      if (data.type === "init") {
        resolve(comlink_exports.wrap(event.ports[0]));
        return;
      }
      if (data.type === "warning") {
        console[data.level].call(console, data.message);
        return;
      }
    };
    window.addEventListener("message", onMessage);
  });
  document.body.insertBefore(iframe, null);
  return { serverPromise: cachedServerPromise };
}
function isStringArray(list) {
  return typeof list[0] === "string";
}
function isTypedArrayCollection(list) {
  return list[0] instanceof Uint8Array;
}
function streamWithPush() {
  let controller = null;
  const stream = new ReadableStream({
    start(controller_) {
      controller = controller_;
    }
  });
  const push = (item) => {
    if (item != null) {
      controller?.enqueue(item);
    } else {
      controller?.close();
      controller = null;
    }
  };
  return { stream, push };
}
function syncSubscription(listener) {
  let stopped = false;
  let unsubscribe = () => {
  };
  const wrapped = (...args) => {
    if (stopped) {
      return;
    }
    listener(...args);
  };
  return {
    subscribe(promise) {
      promise.then((unsubscribe_) => {
        unsubscribe = unsubscribe_;
        if (stopped) {
          unsubscribe();
        }
      });
      return () => {
        stopped = true;
        unsubscribe();
      };
    },
    listener: wrapped
  };
}

// app/lib/webcontainer/index.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/webcontainer/index.ts"
  );
  import.meta.hot.lastModified = "1737602845912.6218";
}
var webcontainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false
};
if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}
var webcontainer = new Promise(() => {
});
if (!import.meta.env.SSR) {
  webcontainer = import.meta.hot?.data.webcontainer ?? Promise.resolve().then(() => {
    return WebContainer.boot({ workdirName: WORK_DIR_NAME });
  }).then((webcontainer2) => {
    webcontainerContext.loaded = true;
    return webcontainer2;
  });
  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}

// app/lib/stores/previews.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/previews.ts"
  );
  import.meta.hot.lastModified = "1737602845912.0254";
}
var PreviewsStore = class {
  #availablePreviews = /* @__PURE__ */ new Map();
  #webcontainer;
  previews = atom([]);
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
    this.#init();
  }
  async #init() {
    const webcontainer2 = await this.#webcontainer;
    webcontainer2.on("port", (port, type, url) => {
      let previewInfo = this.#availablePreviews.get(port);
      if (type === "close" && previewInfo) {
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));
        return;
      }
      const previews = this.previews.get();
      if (!previewInfo) {
        previewInfo = { port, ready: type === "open", baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }
      previewInfo.ready = type === "open";
      previewInfo.baseUrl = url;
      this.previews.set([...previews]);
    });
  }
};

// app/utils/promises.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/promises.ts"
  );
  import.meta.hot.lastModified = "1737602845916.0728";
}
function withResolvers() {
  if (typeof Promise.withResolvers === "function") {
    return Promise.withResolvers();
  }
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    resolve,
    reject,
    promise
  };
}

// app/utils/shell.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/shell.ts"
  );
  import.meta.hot.lastModified = "1737602845916.2407";
}
async function newShellProcess(webcontainer2, terminal) {
  const args = [];
  const process = await webcontainer2.spawn("/bin/jsh", ["--osc", ...args], {
    terminal: {
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15
    }
  });
  const input = process.input.getWriter();
  const output = process.output;
  const jshReady = withResolvers();
  let isInteractive = false;
  output.pipeTo(
    new WritableStream({
      write(data) {
        if (!isInteractive) {
          const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];
          if (osc === "interactive") {
            isInteractive = true;
            jshReady.resolve();
          }
        }
        terminal.write(data);
      }
    })
  );
  terminal.onData((data) => {
    if (isInteractive) {
      input.write(data);
    }
  });
  await jshReady.promise;
  return process;
}

// app/utils/terminal.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/terminal.ts"
  );
  import.meta.hot.lastModified = "1737602845916.416";
}
var reset = "\x1B[0m";
var escapeCodes = {
  reset,
  clear: "\x1B[g",
  red: "\x1B[1;31m"
};
var coloredText = {
  red: (text) => `${escapeCodes.red}${text}${reset}`
};

// app/lib/stores/terminal.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/terminal.ts"
  );
  import.meta.hot.lastModified = "1737602845912.2175";
}
var TerminalStore = class {
  #webcontainer;
  #terminals = [];
  showTerminal = import.meta.hot?.data.showTerminal ?? atom(false);
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }
  toggleTerminal(value) {
    this.showTerminal.set(value !== void 0 ? value : !this.showTerminal.get());
  }
  async attachTerminal(terminal) {
    try {
      const shellProcess = await newShellProcess(await this.#webcontainer, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
    } catch (error) {
      terminal.write(coloredText.red("Failed to spawn shell\n\n") + error.message);
      return;
    }
  }
  onTerminalResize(cols, rows) {
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }
};

// app/lib/stores/workbench.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/workbench.ts"
  );
  import.meta.hot.lastModified = "1737602845912.4082";
}
var WorkbenchStore = class {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);
  artifacts = import.meta.hot?.data.artifacts ?? map({});
  showWorkbench = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView = import.meta.hot?.data.currentView ?? atom("code");
  unsavedFiles = import.meta.hot?.data.unsavedFiles ?? atom(/* @__PURE__ */ new Set());
  modifiedFiles = /* @__PURE__ */ new Set();
  artifactIdList = [];
  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
    }
  }
  get previews() {
    return this.#previewsStore.previews;
  }
  get files() {
    return this.#filesStore.files;
  }
  get currentDocument() {
    return this.#editorStore.currentDocument;
  }
  get selectedFile() {
    return this.#editorStore.selectedFile;
  }
  get firstArtifact() {
    return this.#getArtifact(this.artifactIdList[0]);
  }
  get filesCount() {
    return this.#filesStore.filesCount;
  }
  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }
  toggleTerminal(value) {
    this.#terminalStore.toggleTerminal(value);
  }
  attachTerminal(terminal) {
    this.#terminalStore.attachTerminal(terminal);
  }
  onTerminalResize(cols, rows) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }
  setDocuments(files) {
    this.#editorStore.setDocuments(files);
    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === void 0) {
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === "file") {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }
  setShowWorkbench(show) {
    this.showWorkbench.set(show);
  }
  setCurrentDocumentContent(newContent) {
    const filePath = this.currentDocument.get()?.filePath;
    if (!filePath) {
      return;
    }
    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== void 0 && originalContent !== newContent;
    this.#editorStore.updateFile(filePath, newContent);
    const currentDocument = this.currentDocument.get();
    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();
      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }
      const newUnsavedFiles = new Set(previousUnsavedFiles);
      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }
      this.unsavedFiles.set(newUnsavedFiles);
    }
  }
  setCurrentDocumentScrollPosition(position) {
    const editorDocument = this.currentDocument.get();
    if (!editorDocument) {
      return;
    }
    const { filePath } = editorDocument;
    this.#editorStore.updateScrollPosition(filePath, position);
  }
  setSelectedFile(filePath) {
    this.#editorStore.setSelectedFile(filePath);
  }
  async saveFile(filePath) {
    const documents = this.#editorStore.documents.get();
    const document2 = documents[filePath];
    if (document2 === void 0) {
      return;
    }
    await this.#filesStore.saveFile(filePath, document2.value);
    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);
    this.unsavedFiles.set(newUnsavedFiles);
  }
  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();
    if (currentDocument === void 0) {
      return;
    }
    await this.saveFile(currentDocument.filePath);
  }
  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();
    if (currentDocument === void 0) {
      return;
    }
    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);
    if (!file) {
      return;
    }
    this.setCurrentDocumentContent(file.content);
  }
  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }
  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }
  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }
  abortAllActions() {
  }
  addArtifact({ messageId, title, id }) {
    const artifact = this.#getArtifact(messageId);
    if (artifact) {
      return;
    }
    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }
    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      runner: new ActionRunner(webcontainer)
    });
  }
  updateArtifact({ messageId }, state) {
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      return;
    }
    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }
  async addAction(data) {
    const { messageId } = data;
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      unreachable("Artifact not found");
    }
    artifact.runner.addAction(data);
  }
  async runAction(data) {
    const { messageId } = data;
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      unreachable("Artifact not found");
    }
    artifact.runner.runAction(data);
  }
  #getArtifact(id) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }
};
var workbenchStore = new WorkbenchStore();

// app/components/workbench/PortDropdown.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/workbench/PortDropdown.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/workbench/PortDropdown.tsx"
  );
  import.meta.hot.lastModified = "1738201815622.2751";
}
var PortDropdown = _s((0, import_react2.memo)(_c3 = _s(({
  activePreviewIndex,
  setActivePreviewIndex,
  isDropdownOpen,
  setIsDropdownOpen,
  setHasSelectedPreview,
  previews
}) => {
  _s();
  const dropdownRef = (0, import_react2.useRef)(null);
  const sortedPreviews = previews.map((previewInfo, index) => ({
    ...previewInfo,
    index
  })).sort((a, b) => a.port - b.port);
  (0, import_react2.useEffect)(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    } else {
      window.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "relative z-port-dropdown", ref: dropdownRef, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(IconButton, { icon: "i-ph:plug", onClick: () => setIsDropdownOpen(!isDropdownOpen) }, void 0, false, {
      fileName: "app/components/workbench/PortDropdown.tsx",
      lineNumber: 58,
      columnNumber: 9
    }, this),
    isDropdownOpen && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "absolute right-0 mt-2 bg-gobezeai-elements-background-depth-2 border border-gobezeai-elements-borderColor rounded shadow-sm min-w-[140px] dropdown-animation", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "px-4 py-2 border-b border-gobezeai-elements-borderColor text-sm font-semibold text-gobezeai-elements-textPrimary", children: "Ports" }, void 0, false, {
        fileName: "app/components/workbench/PortDropdown.tsx",
        lineNumber: 60,
        columnNumber: 13
      }, this),
      sortedPreviews.map((preview) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "flex items-center px-4 py-2 cursor-pointer hover:bg-gobezeai-elements-item-backgroundActive", onClick: () => {
        setActivePreviewIndex(preview.index);
        setIsDropdownOpen(false);
        setHasSelectedPreview(true);
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { className: activePreviewIndex === preview.index ? "text-gobezeai-elements-item-contentAccent" : "text-gobezeai-elements-item-contentDefault group-hover:text-gobezeai-elements-item-contentActive", children: preview.port }, void 0, false, {
        fileName: "app/components/workbench/PortDropdown.tsx",
        lineNumber: 68,
        columnNumber: 17
      }, this) }, preview.port, false, {
        fileName: "app/components/workbench/PortDropdown.tsx",
        lineNumber: 63,
        columnNumber: 44
      }, this))
    ] }, void 0, true, {
      fileName: "app/components/workbench/PortDropdown.tsx",
      lineNumber: 59,
      columnNumber: 28
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/workbench/PortDropdown.tsx",
    lineNumber: 57,
    columnNumber: 10
  }, this);
}, "lBksDI189chlgqHe47LAOFZSkUw=")), "lBksDI189chlgqHe47LAOFZSkUw=");
_c22 = PortDropdown;
var _c3;
var _c22;
$RefreshReg$(_c3, "PortDropdown$memo");
$RefreshReg$(_c22, "PortDropdown");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/workbench/Preview.tsx
var import_jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/workbench/Preview.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/workbench/Preview.tsx"
  );
  import.meta.hot.lastModified = "1738201800711.2502";
}
var Preview = _s2((0, import_react4.memo)(_c4 = _s2(() => {
  _s2();
  const iframeRef = (0, import_react4.useRef)(null);
  const inputRef = (0, import_react4.useRef)(null);
  const [activePreviewIndex, setActivePreviewIndex] = (0, import_react4.useState)(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = (0, import_react4.useState)(false);
  const hasSelectedPreview = (0, import_react4.useRef)(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [url, setUrl] = (0, import_react4.useState)("");
  const [iframeUrl, setIframeUrl] = (0, import_react4.useState)();
  (0, import_react4.useEffect)(() => {
    if (!activePreview) {
      setUrl("");
      setIframeUrl(void 0);
      return;
    }
    const {
      baseUrl
    } = activePreview;
    setUrl(baseUrl);
    setIframeUrl(baseUrl);
  }, [activePreview, iframeUrl]);
  const validateUrl = (0, import_react4.useCallback)((value) => {
    if (!activePreview) {
      return false;
    }
    const {
      baseUrl
    } = activePreview;
    if (value === baseUrl) {
      return true;
    } else if (value.startsWith(baseUrl)) {
      return ["/", "?", "#"].includes(value.charAt(baseUrl.length));
    }
    return false;
  }, [activePreview]);
  const findMinPortIndex = (0, import_react4.useCallback)((minIndex, preview, index, array) => {
    return preview.port < array[minIndex].port ? index : minIndex;
  }, []);
  (0, import_react4.useEffect)(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);
      setActivePreviewIndex(minPortIndex);
    }
  }, [previews]);
  const reloadPreview2 = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "w-full h-full flex flex-col", children: [
    isPortDropdownOpen && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "z-iframe-overlay w-full h-full absolute", onClick: () => setIsPortDropdownOpen(false) }, void 0, false, {
      fileName: "app/components/workbench/Preview.tsx",
      lineNumber: 81,
      columnNumber: 30
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "bg-gobezeai-elements-background-depth-2 p-2 flex items-center gap-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(IconButton, { icon: "i-ph:arrow-clockwise", onClick: reloadPreview2 }, void 0, false, {
        fileName: "app/components/workbench/Preview.tsx",
        lineNumber: 83,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex items-center gap-1 flex-grow bg-gobezeai-elements-preview-addressBar-background border border-gobezeai-elements-borderColor text-gobezeai-elements-preview-addressBar-text rounded-full px-3 py-1 text-sm hover:bg-gobezeai-elements-preview-addressBar-backgroundHover hover:focus-within:bg-gobezeai-elements-preview-addressBar-backgroundActive focus-within:bg-gobezeai-elements-preview-addressBar-backgroundActive\n        focus-within-border-gobezeai-elements-borderColorActive focus-within:text-gobezeai-elements-preview-addressBar-textActive", children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("input", { ref: inputRef, className: "w-full bg-transparent outline-none", type: "text", value: url, onChange: (event) => {
        setUrl(event.target.value);
      }, onKeyDown: (event) => {
        if (event.key === "Enter" && validateUrl(url)) {
          setIframeUrl(url);
          if (inputRef.current) {
            inputRef.current.blur();
          }
        }
      } }, void 0, false, {
        fileName: "app/components/workbench/Preview.tsx",
        lineNumber: 86,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/workbench/Preview.tsx",
        lineNumber: 84,
        columnNumber: 9
      }, this),
      previews.length > 1 && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(PortDropdown, { activePreviewIndex, setActivePreviewIndex, isDropdownOpen: isPortDropdownOpen, setHasSelectedPreview: (value) => hasSelectedPreview.current = value, setIsDropdownOpen: setIsPortDropdownOpen, previews }, void 0, false, {
        fileName: "app/components/workbench/Preview.tsx",
        lineNumber: 97,
        columnNumber: 33
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/workbench/Preview.tsx",
      lineNumber: 82,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex-1 border-t border-gobezeai-elements-borderColor", children: activePreview ? /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("iframe", { ref: iframeRef, className: "border-none w-full h-full bg-white", src: iframeUrl }, void 0, false, {
      fileName: "app/components/workbench/Preview.tsx",
      lineNumber: 100,
      columnNumber: 26
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex w-full h-full justify-center items-center bg-white", children: "No preview available" }, void 0, false, {
      fileName: "app/components/workbench/Preview.tsx",
      lineNumber: 100,
      columnNumber: 118
    }, this) }, void 0, false, {
      fileName: "app/components/workbench/Preview.tsx",
      lineNumber: 99,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/workbench/Preview.tsx",
    lineNumber: 80,
    columnNumber: 10
  }, this);
}, "KPc+AXRJmC5LZAbeVusVSZ+btZk=", false, function() {
  return [useStore];
})), "KPc+AXRJmC5LZAbeVusVSZ+btZk=", false, function() {
  return [useStore];
});
_c23 = Preview;
var _c4;
var _c23;
$RefreshReg$(_c4, "Preview$memo");
$RefreshReg$(_c23, "Preview");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Preview
};
//# sourceMappingURL=/build/_shared/Preview-TEKRQO4Q.js.map
