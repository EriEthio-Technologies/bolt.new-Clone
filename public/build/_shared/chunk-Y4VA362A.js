import {
  createScopedLogger,
  map,
  useStore
} from "/build/_shared/chunk-PLHX6T5Y.js";
import {
  LoadingSpinner_default
} from "/build/_shared/chunk-CXX2F2IM.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-O3LOEUP4.js";
import {
  createHotContext
} from "/build/_shared/chunk-ZE7S64EJ.js";
import {
  require_react
} from "/build/_shared/chunk-EKEGKXS4.js";
import {
  __commonJS,
  __decorateClass,
  __toESM
} from "/build/_shared/chunk-LKFSZYGT.js";

// empty-module:@remix-run/node
var require_node = __commonJS({
  "empty-module:@remix-run/node"(exports, module) {
    module.exports = {};
  }
});

// app/routes/_index.tsx
var import_node = __toESM(require_node(), 1);
var import_react7 = __toESM(require_react(), 1);

// app/components/chat/EnhancedChat.tsx
var import_react2 = __toESM(require_react(), 1);

// app/errors/AIServiceError.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/errors/AIServiceError.ts"
  );
  import.meta.hot.lastModified = "1738206963587.5757";
}
var AIServiceError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "AIServiceError";
  }
};

// app/utils/ErrorHandler.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/ErrorHandler.ts"
  );
  import.meta.hot.lastModified = "1738207733871.948";
}
var logger = createScopedLogger("ErrorHandler");
var ErrorHandler = class {
  static handle(error) {
    if (error instanceof AIServiceError) {
      logger.error("AI Service Error:", error.message);
      return;
    }
    if (error instanceof Error) {
      logger.error("Application Error:", error.message);
      return;
    }
    logger.error("Unknown Error:", error);
  }
  static async handleAsync(promise) {
    try {
      return await promise;
    } catch (error) {
      this.handle(error);
      throw error;
    }
  }
};

// app/utils/RetryManager.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/RetryManager.ts"
  );
  import.meta.hot.lastModified = "1737871365533.2034";
}
var RetryManager = class {
  constructor(config) {
    this.config = config;
  }
  async execute(fn) {
    let lastError;
    let delay = this.config.initialDelay;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === this.config.maxRetries)
          break;
        await this.delay(delay);
        delay *= this.config.backoffFactor;
      }
    }
    throw lastError;
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

// app/utils/CircuitBreaker.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/CircuitBreaker.ts"
  );
  import.meta.hot.lastModified = "1737871365533.0837";
}
var CircuitBreaker = class {
  constructor(config) {
    this.config = config;
  }
  failures = 0;
  lastFailureTime = 0;
  state = "CLOSED";
  async ensureAvailable() {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }
  }
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }
  recordSuccess() {
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
    }
    this.failures = 0;
  }
};

// app/lib/services/ai/AIService.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/services/ai/AIService.ts"
  );
  import.meta.hot.lastModified = "1737871365503.2385";
}
var AIService = class {
  constructor(nlpProcessor, knowledgeGraph, inferenceEngine, contextManager, emotionalProcessor, causalReasoner, workflowEngine) {
    this.nlpProcessor = nlpProcessor;
    this.knowledgeGraph = knowledgeGraph;
    this.inferenceEngine = inferenceEngine;
    this.contextManager = contextManager;
    this.emotionalProcessor = emotionalProcessor;
    this.causalReasoner = causalReasoner;
    this.workflowEngine = workflowEngine;
    this.retryManager = new RetryManager({
      maxRetries: 3,
      backoffFactor: 1.5,
      initialDelay: 1e3
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 6e4
    });
    this.errorHandler = new ErrorHandler();
  }
  retryManager;
  circuitBreaker;
  errorHandler;
  async processQuery(query, context) {
    const processingStages = [];
    try {
      await this.circuitBreaker.ensureAvailable();
      const nlpResult = await this.executeWithRetry(
        "nlp_processing",
        async () => this.nlpProcessor.process(query, context),
        { critical: true }
      );
      processingStages.push({ stage: "nlp", result: nlpResult });
      const enrichedContext2 = await this.executeWithRetry(
        "context_enrichment",
        async () => this.contextManager.enrichContext({
          query,
          ...nlpResult,
          ...context
        })
      );
      processingStages.push({ stage: "context", result: enrichedContext2 });
      const reasoningChain = await this.executeWithRetry(
        "reasoning",
        async () => this.causalReasoner.analyze({
          context: enrichedContext2,
          knowledgeGraph: this.knowledgeGraph
        })
      );
      processingStages.push({ stage: "reasoning", result: reasoningChain });
      const workflowPlan = await this.executeWithRetry(
        "workflow_planning",
        async () => this.workflowEngine.createPlan(reasoningChain)
      );
      processingStages.push({ stage: "workflow", result: workflowPlan });
      const executionResults = await this.executeWithRetry(
        "workflow_execution",
        async () => this.workflowEngine.execute(workflowPlan)
      );
      processingStages.push({ stage: "execution", result: executionResults });
      const emotionalContext = await this.executeWithRetry(
        "emotional_processing",
        async () => this.emotionalProcessor.analyze(query)
      );
      processingStages.push({ stage: "emotional", result: emotionalContext });
      return await this.executeWithRetry(
        "response_generation",
        async () => this.generateResponse({
          results: executionResults,
          reasoning: reasoningChain,
          emotional: emotionalContext
        })
      );
    } catch (error) {
      const errorMetadata = {
        query,
        processingStages,
        lastStage: processingStages[processingStages.length - 1]?.stage,
        context: enrichedContext
      };
      this.circuitBreaker.recordFailure();
      return this.handleProcessingError(error, errorMetadata);
    }
  }
  async executeWithRetry(operation, fn, options = {}) {
    try {
      return await this.retryManager.execute(fn);
    } catch (error) {
      if (options.critical) {
        throw new AIServiceError(
          `Critical operation failed: ${operation}`,
          error,
          "CRITICAL_FAILURE"
        );
      }
      this.errorHandler.handle(error, { operation });
      return this.getFallbackResult(operation);
    }
  }
  async generateResponse(data) {
    try {
      return await this.inferenceEngine.generateResponse(data);
    } catch (error) {
      throw new AIServiceError("Response generation failed", error);
    }
  }
  async handleProcessingError(error, metadata) {
    this.errorHandler.handle(error, metadata);
    return {
      text: this.getErrorResponse(error, metadata),
      reasoning: this.getFallbackReasoning(metadata),
      confidence: 0.5,
      suggestedActions: this.getFallbackActions(metadata)
    };
  }
  getErrorResponse(error, metadata) {
    const stage = metadata.lastStage;
    const templates = {
      nlp: "I'm having trouble understanding your request. Could you rephrase it?",
      context: "I'm missing some context. Could you provide more details?",
      reasoning: "I'm having trouble reasoning about this problem.",
      workflow: "I couldn't create a plan to handle your request.",
      execution: "I encountered an error while processing your request.",
      emotional: "I couldn't properly analyze the context of your request.",
      default: "An unexpected error occurred. Please try again."
    };
    return templates[stage] || templates.default;
  }
  getFallbackReasoning(metadata) {
    return {
      steps: [{
        type: "deductive",
        description: "Fallback reasoning due to error",
        evidence: [],
        confidence: 0.5
      }],
      confidence: 0.5,
      alternatives: []
    };
  }
  getFallbackActions(metadata) {
    return [{
      type: "error_recovery",
      description: "Try alternative approach",
      parameters: {
        suggestedAction: "rephrase_request",
        context: metadata.lastStage
      }
    }];
  }
  getFallbackResult(operation) {
    const fallbacks = {
      nlp_processing: { entities: [], intent: { type: "unknown", confidence: 0.5 } },
      context_enrichment: { context: {}, confidence: 0.5 },
      reasoning: { steps: [], confidence: 0.5 },
      workflow_planning: { steps: [], fallback: true },
      workflow_execution: { success: false, fallback: true },
      emotional_processing: { sentiment: "neutral", confidence: 0.5 }
    };
    return fallbacks[operation] || {};
  }
};
AIService = __decorateClass([
  Service()
], AIService);

// app/lib/stores/chat.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/chat.ts"
  );
  import.meta.hot.lastModified = "1737869880656.2656";
}
var aiService = new AIService();
var chatStore = map({
  messages: [],
  context: {}
});

// app/components/chat/ConversationHistory.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/chat/ConversationHistory.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/chat/ConversationHistory.tsx"
  );
  import.meta.hot.lastModified = "1738207451007.2249";
}
var ConversationHistory = () => {
  _s();
  const chat = useStore(chatStore);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex flex-col gap-4 p-4 bg-gray-50 rounded-lg", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { className: "text-lg font-semibold", children: "Conversation History" }, void 0, false, {
      fileName: "app/components/chat/ConversationHistory.tsx",
      lineNumber: 29,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex flex-col gap-2", children: chat.messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: `p-3 rounded-lg ${message.role === "user" ? "bg-blue-100" : "bg-white"}`, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "font-medium", children: message.role === "user" ? "You" : "Assistant" }, void 0, false, {
        fileName: "app/components/chat/ConversationHistory.tsx",
        lineNumber: 32,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mt-1", children: message.content }, void 0, false, {
        fileName: "app/components/chat/ConversationHistory.tsx",
        lineNumber: 33,
        columnNumber: 13
      }, this)
    ] }, index, true, {
      fileName: "app/components/chat/ConversationHistory.tsx",
      lineNumber: 31,
      columnNumber: 48
    }, this)) }, void 0, false, {
      fileName: "app/components/chat/ConversationHistory.tsx",
      lineNumber: 30,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/chat/ConversationHistory.tsx",
    lineNumber: 28,
    columnNumber: 10
  }, this);
};
_s(ConversationHistory, "pgt61aUQRoUeT7qCxTcEar+0J8s=", false, function() {
  return [useStore];
});
_c = ConversationHistory;
var _c;
$RefreshReg$(_c, "ConversationHistory");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/chat/GuidelinePanel.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/chat/GuidelinePanel.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/chat/GuidelinePanel.tsx"
  );
  import.meta.hot.lastModified = "1738207461416.962";
}
var GuidelinePanel = () => {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "flex flex-col gap-4 p-4 bg-gray-50 rounded-lg", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h2", { className: "text-lg font-semibold", children: "Guidelines" }, void 0, false, {
      fileName: "app/components/chat/GuidelinePanel.tsx",
      lineNumber: 24,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("ul", { className: "list-disc list-inside space-y-2", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "Be clear and specific in your requests" }, void 0, false, {
        fileName: "app/components/chat/GuidelinePanel.tsx",
        lineNumber: 26,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "Provide context when needed" }, void 0, false, {
        fileName: "app/components/chat/GuidelinePanel.tsx",
        lineNumber: 27,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "Use code blocks for code snippets" }, void 0, false, {
        fileName: "app/components/chat/GuidelinePanel.tsx",
        lineNumber: 28,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "Ask follow-up questions if needed" }, void 0, false, {
        fileName: "app/components/chat/GuidelinePanel.tsx",
        lineNumber: 29,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "Report any issues or bugs" }, void 0, false, {
        fileName: "app/components/chat/GuidelinePanel.tsx",
        lineNumber: 30,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/chat/GuidelinePanel.tsx",
      lineNumber: 25,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "mt-4 text-sm text-gray-600", children: "For more information, please refer to the documentation." }, void 0, false, {
      fileName: "app/components/chat/GuidelinePanel.tsx",
      lineNumber: 32,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/chat/GuidelinePanel.tsx",
    lineNumber: 23,
    columnNumber: 10
  }, this);
};
_c2 = GuidelinePanel;
var _c2;
$RefreshReg$(_c2, "GuidelinePanel");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/chat/EnhancedChat.tsx
var import_jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/chat/EnhancedChat.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/chat/EnhancedChat.tsx"
  );
  import.meta.hot.lastModified = "1737869880645.0571";
}
function EnhancedChat() {
  _s2();
  const [input, setInput] = (0, import_react2.useState)("");
  const chatHistory = useStore(chatStore.history);
  const messagesEndRef = (0, import_react2.useRef)(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  (0, import_react2.useEffect)(() => {
    scrollToBottom();
  }, [chatHistory]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex h-full", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex-1 flex flex-col", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(ConversationHistory, { messages: chatHistory }, void 0, false, {
        fileName: "app/components/chat/EnhancedChat.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { className: "flex-shrink-0 p-4 border-t", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("textarea", { value: input, onChange: (e) => setInput(e.target.value), className: "w-full p-2 border rounded", placeholder: "Ask me anything about your code..." }, void 0, false, {
          fileName: "app/components/chat/EnhancedChat.tsx",
          lineNumber: 44,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { onClick: () => chatStore.sendMessage(input), className: "mt-2 px-4 py-2 bg-blue-500 text-white rounded", children: "Send" }, void 0, false, {
          fileName: "app/components/chat/EnhancedChat.tsx",
          lineNumber: 45,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/chat/EnhancedChat.tsx",
        lineNumber: 43,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/chat/EnhancedChat.tsx",
      lineNumber: 41,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(GuidelinePanel, {}, void 0, false, {
      fileName: "app/components/chat/EnhancedChat.tsx",
      lineNumber: 50,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/chat/EnhancedChat.tsx",
    lineNumber: 40,
    columnNumber: 10
  }, this);
}
_s2(EnhancedChat, "mNZrfdSFGOtuvy04n3LSqKSrcz0=", false, function() {
  return [useStore];
});
_c3 = EnhancedChat;
var _c3;
$RefreshReg$(_c3, "EnhancedChat");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/workspace/WorkspaceImport.tsx
var import_react4 = __toESM(require_react(), 1);

// app/lib/stores/workspace.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/workspace.ts"
  );
  import.meta.hot.lastModified = "1738207508241.176";
}
var initialState = {
  path: "",
  files: [],
  isLoading: false,
  error: null
};
var workspaceStore = map(initialState);

// app/components/workspace/WorkspaceImport.tsx
var import_jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/workspace/WorkspaceImport.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s3 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/workspace/WorkspaceImport.tsx"
  );
  import.meta.hot.lastModified = "1737869880643.8135";
}
function WorkspaceImport() {
  _s3();
  const [importing, setImporting] = (0, import_react4.useState)(false);
  const handleVSCodeImport = async () => {
    setImporting(true);
    try {
      await workspaceStore.importVSCodeWorkspace();
    } finally {
      setImporting(false);
    }
  };
  const handleGitClone = async (url) => {
    setImporting(true);
    try {
      await workspaceStore.cloneRepository(url);
    } finally {
      setImporting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { className: "text-lg font-semibold", children: "Import VSCode Workspace" }, void 0, false, {
        fileName: "app/components/workspace/WorkspaceImport.tsx",
        lineNumber: 45,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: handleVSCodeImport, disabled: importing, className: "mt-2 px-4 py-2 bg-blue-500 text-white rounded", children: "Import from VSCode" }, void 0, false, {
        fileName: "app/components/workspace/WorkspaceImport.tsx",
        lineNumber: 46,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/workspace/WorkspaceImport.tsx",
      lineNumber: 44,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { className: "text-lg font-semibold", children: "Clone Repository" }, void 0, false, {
        fileName: "app/components/workspace/WorkspaceImport.tsx",
        lineNumber: 52,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "text", placeholder: "Repository URL", className: "w-full p-2 border rounded" }, void 0, false, {
        fileName: "app/components/workspace/WorkspaceImport.tsx",
        lineNumber: 53,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => handleGitClone(repoUrl), disabled: importing, className: "mt-2 px-4 py-2 bg-blue-500 text-white rounded", children: "Clone Repository" }, void 0, false, {
        fileName: "app/components/workspace/WorkspaceImport.tsx",
        lineNumber: 54,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/workspace/WorkspaceImport.tsx",
      lineNumber: 51,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/workspace/WorkspaceImport.tsx",
    lineNumber: 43,
    columnNumber: 10
  }, this);
}
_s3(WorkspaceImport, "ryfmByDtNIuBZFMICTplBDWgCHQ=");
_c4 = WorkspaceImport;
var _c4;
$RefreshReg$(_c4, "WorkspaceImport");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/review/CodeReview.tsx
var import_react5 = __toESM(require_react(), 1);

// app/lib/stores/projectSettings.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/stores/projectSettings.ts"
  );
  import.meta.hot.lastModified = "1737869880644.5603";
}
var projectSettingsStore = map({
  guidelines: [],
  context: "",
  aiModel: "claude-3-sonnet",
  collaborators: [],
  codeReviewSettings: {
    autoReview: true,
    minReviewers: 1
  }
});

// app/lib/services/codeAnalysis.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/lib/services/codeAnalysis.ts"
  );
  import.meta.hot.lastModified = "1738207489997.121";
}
var CodeAnalysisService = class {
  async analyzeCode(code) {
    try {
      const complexity = this.calculateComplexity(code);
      const maintainability = this.calculateMaintainability(code);
      const suggestions = this.generateSuggestions(code);
      return {
        complexity,
        maintainability,
        suggestions
      };
    } catch (error) {
      throw new AIServiceError("Failed to analyze code", error);
    }
  }
  calculateComplexity(code) {
    const lines = code.split("\n").length;
    const conditionals = (code.match(/if|else|switch|case|for|while/g) || []).length;
    return Math.min(10, Math.ceil((lines + conditionals * 2) / 10));
  }
  calculateMaintainability(code) {
    const comments = (code.match(/\/\/|\/\*|\*\//g) || []).length;
    const codeLength = code.length;
    return Math.min(10, Math.ceil(comments * 100 / codeLength + 5));
  }
  generateSuggestions(code) {
    const suggestions = [];
    if (code.length > 1e3) {
      suggestions.push("Consider breaking down the code into smaller functions");
    }
    if ((code.match(/console\.log/g) || []).length > 3) {
      suggestions.push("Remove unnecessary console.log statements");
    }
    if ((code.match(/TODO|FIXME/g) || []).length > 0) {
      suggestions.push("Address TODO and FIXME comments");
    }
    return suggestions;
  }
};
var codeAnalysisService = new CodeAnalysisService();

// app/components/review/CodeReview.tsx
var import_jsx_dev_runtime5 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/review/CodeReview.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s4 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/review/CodeReview.tsx"
  );
  import.meta.hot.lastModified = "1737869880647.62";
}
function CodeReview() {
  _s4();
  const [analyzing, setAnalyzing] = (0, import_react5.useState)(false);
  const [results, setResults] = (0, import_react5.useState)([]);
  const settings = useStore(projectSettingsStore);
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const analysisResults = await codeAnalysisService.analyzeCode({
        autoReview: settings.codeReviewSettings.autoReview,
        minReviewers: settings.codeReviewSettings.minReviewers
      });
      setResults(analysisResults);
    } finally {
      setAnalyzing(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("div", { className: "p-4", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("h2", { className: "text-xl font-bold mb-4", children: "Code Review" }, void 0, false, {
      fileName: "app/components/review/CodeReview.tsx",
      lineNumber: 44,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("button", { onClick: runAnalysis, disabled: analyzing, className: "px-4 py-2 bg-blue-500 text-white rounded", children: "Run Analysis" }, void 0, false, {
      fileName: "app/components/review/CodeReview.tsx",
      lineNumber: 45,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("div", { className: "mt-4 space-y-4", children: results.map((result, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("div", { className: "p-4 border rounded", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("h3", { className: "font-semibold", children: result.title }, void 0, false, {
        fileName: "app/components/review/CodeReview.tsx",
        lineNumber: 51,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("p", { className: "text-gray-600", children: result.description }, void 0, false, {
        fileName: "app/components/review/CodeReview.tsx",
        lineNumber: 52,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("div", { className: "mt-2", children: result.suggestions.map((suggestion, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)("div", { className: "text-sm text-gray-500", children: [
        "\u2022 ",
        suggestion
      ] }, idx, true, {
        fileName: "app/components/review/CodeReview.tsx",
        lineNumber: 54,
        columnNumber: 60
      }, this)) }, void 0, false, {
        fileName: "app/components/review/CodeReview.tsx",
        lineNumber: 53,
        columnNumber: 13
      }, this)
    ] }, index, true, {
      fileName: "app/components/review/CodeReview.tsx",
      lineNumber: 50,
      columnNumber: 41
    }, this)) }, void 0, false, {
      fileName: "app/components/review/CodeReview.tsx",
      lineNumber: 49,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/review/CodeReview.tsx",
    lineNumber: 43,
    columnNumber: 10
  }, this);
}
_s4(CodeReview, "jgVz1Geg6Tp8cY+MpqsnQHYZFEA=", false, function() {
  return [useStore];
});
_c5 = CodeReview;
var _c5;
$RefreshReg$(_c5, "CodeReview");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/_index.tsx
var import_jsx_dev_runtime6 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/_index.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/_index.tsx"
  );
  import.meta.hot.lastModified = "1737869880652.3967";
}
var CodeEditor = (0, import_react7.lazy)(_c6 = () => import("/build/_shared/CodeEditor-PPQX4Y35.js"));
_c22 = CodeEditor;
var Preview = (0, import_react7.lazy)(_c32 = () => import("/build/_shared/Preview-TEKRQO4Q.js"));
_c42 = Preview;
var meta = () => {
  return [{
    title: "Gobeze AI"
  }, {
    name: "description",
    content: "Talk with Gobeze AI, your AI assistant"
  }];
};
function Workbench() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "flex h-screen", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "w-1/4 border-r", children: /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(WorkspaceImport, {}, void 0, false, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 43,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 42,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "flex-1 flex flex-col", children: /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(import_react7.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(LoadingSpinner_default, {}, void 0, false, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 47,
      columnNumber: 29
    }, this), children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "flex-1", children: /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(CodeEditor, {}, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 49,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 48,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "h-1/2", children: /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(Preview, {}, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 52,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 51,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 47,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 46,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)("div", { className: "w-1/4 border-l", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(EnhancedChat, {}, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 58,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime6.jsxDEV)(CodeReview, {}, void 0, false, {
        fileName: "app/routes/_index.tsx",
        lineNumber: 59,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/_index.tsx",
      lineNumber: 57,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/_index.tsx",
    lineNumber: 41,
    columnNumber: 10
  }, this);
}
_c52 = Workbench;
var _c6;
var _c22;
var _c32;
var _c42;
var _c52;
$RefreshReg$(_c6, "CodeEditor$lazy");
$RefreshReg$(_c22, "CodeEditor");
$RefreshReg$(_c32, "Preview$lazy");
$RefreshReg$(_c42, "Preview");
$RefreshReg$(_c52, "Workbench");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

export {
  meta,
  Workbench
};
//# sourceMappingURL=/build/_shared/chunk-Y4VA362A.js.map
