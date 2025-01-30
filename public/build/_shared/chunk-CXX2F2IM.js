import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-O3LOEUP4.js";
import {
  createHotContext
} from "/build/_shared/chunk-ZE7S64EJ.js";
import {
  __toESM
} from "/build/_shared/chunk-LKFSZYGT.js";

// app/components/LoadingSpinner.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/LoadingSpinner.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/LoadingSpinner.tsx"
  );
  import.meta.hot.lastModified = "1738206977289.1594";
}
var LoadingSpinner = () => {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" }, void 0, false, {
    fileName: "app/components/LoadingSpinner.tsx",
    lineNumber: 24,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/LoadingSpinner.tsx",
    lineNumber: 23,
    columnNumber: 10
  }, this);
};
_c = LoadingSpinner;
var LoadingSpinner_default = LoadingSpinner;
var _c;
$RefreshReg$(_c, "LoadingSpinner");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

export {
  LoadingSpinner_default
};
//# sourceMappingURL=/build/_shared/chunk-CXX2F2IM.js.map
