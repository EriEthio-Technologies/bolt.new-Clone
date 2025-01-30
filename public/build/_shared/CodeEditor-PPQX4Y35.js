import {
  editorStore
} from "/build/_shared/chunk-6PPN52BK.js";
import {
  useStore
} from "/build/_shared/chunk-PLHX6T5Y.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-O3LOEUP4.js";
import {
  createHotContext
} from "/build/_shared/chunk-ZE7S64EJ.js";
import "/build/_shared/chunk-GEKJEUI6.js";
import "/build/_shared/chunk-EKEGKXS4.js";
import {
  __toESM
} from "/build/_shared/chunk-LKFSZYGT.js";

// app/components/editor/CodeEditor.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/editor/CodeEditor.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/editor/CodeEditor.tsx"
  );
  import.meta.hot.lastModified = "1738207474424.236";
}
var CodeEditor = () => {
  _s();
  const editor = useStore(editorStore);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "w-full h-full flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex-1 relative", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "absolute inset-0 overflow-auto", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", { className: "p-4 font-mono text-sm", children: editor.content }, void 0, false, {
      fileName: "app/components/editor/CodeEditor.tsx",
      lineNumber: 31,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/components/editor/CodeEditor.tsx",
      lineNumber: 30,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/editor/CodeEditor.tsx",
      lineNumber: 29,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "border-t border-gray-200 p-2 flex justify-between items-center", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "text-sm text-gray-600", children: [
        editor.language,
        " \u2022 ",
        editor.path
      ] }, void 0, true, {
        fileName: "app/components/editor/CodeEditor.tsx",
        lineNumber: 37,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex gap-2", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { className: "px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600", onClick: () => editor.save(), children: "Save" }, void 0, false, {
        fileName: "app/components/editor/CodeEditor.tsx",
        lineNumber: 41,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/editor/CodeEditor.tsx",
        lineNumber: 40,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/editor/CodeEditor.tsx",
      lineNumber: 36,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/editor/CodeEditor.tsx",
    lineNumber: 28,
    columnNumber: 10
  }, this);
};
_s(CodeEditor, "WTwxSOi8DxqGK/VTVRr3/fnwJv4=", false, function() {
  return [useStore];
});
_c = CodeEditor;
var CodeEditor_default = CodeEditor;
var _c;
$RefreshReg$(_c, "CodeEditor");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  CodeEditor_default as default
};
//# sourceMappingURL=/build/_shared/CodeEditor-PPQX4Y35.js.map
