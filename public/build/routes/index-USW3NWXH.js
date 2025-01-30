import {
  LoadingSpinner_default
} from "/build/_shared/chunk-CXX2F2IM.js";
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
  __toESM
} from "/build/_shared/chunk-LKFSZYGT.js";

// app/routes/index.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/index.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/index.tsx"
  );
  import.meta.hot.lastModified = "1737869338821.7512";
}
var CodeEditor = (0, import_react.lazy)(_c = () => import("/build/_shared/CodeEditor-PPQX4Y35.js"));
_c2 = CodeEditor;
var Preview = (0, import_react.lazy)(_c3 = () => import("/build/_shared/Preview-TEKRQO4Q.js"));
_c4 = Preview;
function Workbench() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingSpinner_default, {}, void 0, false, {
    fileName: "app/routes/index.tsx",
    lineNumber: 28,
    columnNumber: 30
  }, this), children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CodeEditor, {}, void 0, false, {
      fileName: "app/routes/index.tsx",
      lineNumber: 29,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Preview, {}, void 0, false, {
      fileName: "app/routes/index.tsx",
      lineNumber: 30,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/index.tsx",
    lineNumber: 28,
    columnNumber: 10
  }, this);
}
_c5 = Workbench;
var _c;
var _c2;
var _c3;
var _c4;
var _c5;
$RefreshReg$(_c, "CodeEditor$lazy");
$RefreshReg$(_c2, "CodeEditor");
$RefreshReg$(_c3, "Preview$lazy");
$RefreshReg$(_c4, "Preview");
$RefreshReg$(_c5, "Workbench");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Workbench as default
};
//# sourceMappingURL=/build/routes/index-USW3NWXH.js.map
