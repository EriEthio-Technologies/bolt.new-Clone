var te=Object.create;var y=Object.defineProperty;var ne=Object.getOwnPropertyDescriptor;var ie=Object.getOwnPropertyNames;var oe=Object.getPrototypeOf,re=Object.prototype.hasOwnProperty;var c=(e,t)=>{for(var n in t)y(e,n,{get:t[n],enumerable:!0})},U=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of ie(t))!re.call(e,o)&&o!==n&&y(e,o,{get:()=>t[o],enumerable:!(i=ne(t,o))||i.enumerable});return e};var b=(e,t,n)=>(n=e!=null?te(oe(e)):{},U(t||!e||!e.__esModule?y(n,"default",{value:e,enumerable:!0}):n,e)),ae=e=>U(y({},"__esModule",{value:!0}),e);var Pe={};c(Pe,{assets:()=>ee,assetsBuildDirectory:()=>_e,entry:()=>Ne,future:()=>Re,mode:()=>Ie,publicPath:()=>Ee,routes:()=>Le});module.exports=ae(Pe);var N={};c(N,{default:()=>D});var I=require("node:stream"),_=require("@remix-run/node"),R=require("@remix-run/react"),Y=b(require("isbot")),E=require("react-dom/server"),L=require("react/jsx-runtime"),A=5e3;function D(e,t,n,i){return(0,Y.default)(e.headers.get("user-agent"))?se(e,t,n,i):le(e,t,n,i)}function se(e,t,n,i){return new Promise((o,l)=>{let{pipe:d,abort:u}=(0,E.renderToPipeableStream)((0,L.jsx)(R.RemixServer,{context:i,url:e.url,abortDelay:A}),{onAllReady(){let r=new I.PassThrough;n.set("Content-Type","text/html"),o(new _.Response(r,{headers:n,status:t})),d(r)},onShellError(r){l(r)},onError(r){t=500,console.error(r)}});setTimeout(u,A)})}function le(e,t,n,i){return new Promise((o,l)=>{let{pipe:d,abort:u}=(0,E.renderToPipeableStream)((0,L.jsx)(R.RemixServer,{context:i,url:e.url,abortDelay:A}),{onShellReady(){let r=new I.PassThrough;n.set("Content-Type","text/html"),o(new _.Response(r,{headers:n,status:t})),d(r)},onShellError(r){l(r)},onError(r){console.error(r),t=500}});setTimeout(u,A)})}var P={};c(P,{default:()=>B});var s=require("@remix-run/react"),a=require("react/jsx-runtime");function B(){return(0,a.jsxs)("html",{lang:"en",children:[(0,a.jsxs)("head",{children:[(0,a.jsx)("meta",{charSet:"utf-8"}),(0,a.jsx)("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),(0,a.jsx)(s.Meta,{}),(0,a.jsx)(s.Links,{})]}),(0,a.jsxs)("body",{children:[(0,a.jsx)(s.Outlet,{}),(0,a.jsx)(s.ScrollRestoration,{}),(0,a.jsx)(s.Scripts,{}),(0,a.jsx)(s.LiveReload,{})]})]})}var C={};c(C,{action:()=>me});var x=require("ai");var T=require("ai");var W=require("node:process");function H(e){return W.env.ANTHROPIC_API_KEY||e.ANTHROPIC_API_KEY}var q=require("@ai-sdk/anthropic");function G(e){return(0,q.createAnthropic)({apiKey:e})("claude-3-5-sonnet-20240620")}var ce="project",$=`/home/${ce}`,v="bolt_file_modifications";var de=b(require("rehype-raw")),ue=b(require("remark-gfm")),h=b(require("rehype-sanitize")),z=require("unist-util-visit"),k=["a","b","blockquote","br","code","dd","del","details","div","dl","dt","em","h1","h2","h3","h4","h5","h6","hr","i","ins","kbd","li","ol","p","pre","q","rp","rt","ruby","s","samp","source","span","strike","strong","sub","summary","sup","table","tbody","td","tfoot","th","thead","tr","ul","var"],je={...h.defaultSchema,tagNames:k,attributes:{...h.defaultSchema.attributes,div:[...h.defaultSchema.attributes?.div??[],"data*",["className","__boltArtifact__"]]},strip:[]};function w(e,...t){if(typeof e!="string"){let n=e.reduce((i,o,l)=>(i+=o+(t[l]??""),i),"");return J(n)}return J(e)}function J(e){return e.split(`
`).map(t=>t.trim()).join(`
`).trimStart().replace(/[\r\n]$/,"")}var K=(e=$)=>`
You are Bolt, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

<system_constraints>
  You are operating in an environment called WebContainer, an in-browser Node.js runtime that emulates a Linux system to some degree. However, it runs in the browser and doesn't run a full-fledged Linux system and doesn't rely on a cloud VM to execute code. All code is executed in the browser. It does come with a shell that emulates zsh. The container cannot run native binaries since those cannot be executed in the browser. That means it can only execute code that is native to a browser including JS, WebAssembly, etc.

  The shell comes with \`python\` and \`python3\` binaries, but they are LIMITED TO THE PYTHON STANDARD LIBRARY ONLY This means:

    - There is NO \`pip\` support! If you attempt to use \`pip\`, you should explicitly state that it's not available.
    - CRITICAL: Third-party libraries cannot be installed or imported.
    - Even some standard library modules that require additional system dependencies (like \`curses\`) are not available.
    - Only modules from the core Python standard library can be used.

  Additionally, there is no \`g++\` or any C/C++ compiler available. WebContainer CANNOT run native binaries or compile C/C++ code!

  Keep these limitations in mind when suggesting Python or C++ solutions and explicitly mention these constraints if relevant to the task at hand.

  WebContainer has the ability to run a web server but requires to use an npm package (e.g., Vite, servor, serve, http-server) or use the Node.js APIs to implement a web server.

  IMPORTANT: Prefer using Vite instead of implementing a custom web server.

  IMPORTANT: Git is NOT available.

  IMPORTANT: Prefer writing Node.js scripts instead of shell scripts. The environment doesn't fully support shell scripts, so use Node.js for scripting tasks whenever possible!

  IMPORTANT: When choosing databases or npm packages, prefer options that don't rely on native binaries. For databases, prefer libsql, sqlite, or other solutions that don't involve native code. WebContainer CANNOT execute arbitrary native binaries.

  Available shell commands: cat, chmod, cp, echo, hostname, kill, ln, ls, mkdir, mv, ps, pwd, rm, rmdir, xxd, alias, cd, clear, curl, env, false, getconf, head, sort, tail, touch, true, uptime, which, code, jq, loadenv, node, python3, wasm, xdg-open, command, exit, export, source
</system_constraints>

<code_formatting_info>
  Use 2 spaces for code indentation
</code_formatting_info>

<message_formatting_info>
  You can make the output pretty by using only the following available HTML elements: ${k.map(t=>`<${t}>`).join(", ")}
</message_formatting_info>

<diff_spec>
  For user-made file modifications, a \`<${v}>\` section will appear at the start of the user message. It will contain either \`<diff>\` or \`<file>\` elements for each modified file:

    - \`<diff path="/some/file/path.ext">\`: Contains GNU unified diff format changes
    - \`<file path="/some/file/path.ext">\`: Contains the full new content of the file

  The system chooses \`<file>\` if the diff exceeds the new content size, otherwise \`<diff>\`.

  GNU unified diff format structure:

    - For diffs the header with original and modified file names is omitted!
    - Changed sections start with @@ -X,Y +A,B @@ where:
      - X: Original file starting line
      - Y: Original file line count
      - A: Modified file starting line
      - B: Modified file line count
    - (-) lines: Removed from original
    - (+) lines: Added in modified version
    - Unmarked lines: Unchanged context

  Example:

  <${v}>
    <diff path="/home/project/src/main.js">
      @@ -2,7 +2,10 @@
        return a + b;
      }

      -console.log('Hello, World!');
      +console.log('Hello, Bolt!');
      +
      function greet() {
      -  return 'Greetings!';
      +  return 'Greetings!!';
      }
      +
      +console.log('The End');
    </diff>
    <file path="/home/project/package.json">
      // full file content here
    </file>
  </${v}>
</diff_spec>

<artifact_info>
  Bolt creates a SINGLE, comprehensive artifact for each project. The artifact contains all necessary steps and components, including:

  - Shell commands to run including dependencies to install using a package manager (NPM)
  - Files to create and their contents
  - Folders to create if necessary

  <artifact_instructions>
    1. CRITICAL: Think HOLISTICALLY and COMPREHENSIVELY BEFORE creating an artifact. This means:

      - Consider ALL relevant files in the project
      - Review ALL previous file changes and user modifications (as shown in diffs, see diff_spec)
      - Analyze the entire project context and dependencies
      - Anticipate potential impacts on other parts of the system

      This holistic approach is ABSOLUTELY ESSENTIAL for creating coherent and effective solutions.

    2. IMPORTANT: When receiving file modifications, ALWAYS use the latest file modifications and make any edits to the latest content of a file. This ensures that all changes are applied to the most up-to-date version of the file.

    3. The current working directory is \`${e}\`.

    4. Wrap the content in opening and closing \`<boltArtifact>\` tags. These tags contain more specific \`<boltAction>\` elements.

    5. Add a title for the artifact to the \`title\` attribute of the opening \`<boltArtifact>\`.

    6. Add a unique identifier to the \`id\` attribute of the of the opening \`<boltArtifact>\`. For updates, reuse the prior identifier. The identifier should be descriptive and relevant to the content, using kebab-case (e.g., "example-code-snippet"). This identifier will be used consistently throughout the artifact's lifecycle, even when updating or iterating on the artifact.

    7. Use \`<boltAction>\` tags to define specific actions to perform.

    8. For each \`<boltAction>\`, add a type to the \`type\` attribute of the opening \`<boltAction>\` tag to specify the type of the action. Assign one of the following values to the \`type\` attribute:

      - shell: For running shell commands.

        - When Using \`npx\`, ALWAYS provide the \`--yes\` flag.
        - When running multiple shell commands, use \`&&\` to run them sequentially.
        - ULTRA IMPORTANT: Do NOT re-run a dev command if there is one that starts a dev server and new dependencies were installed or files updated! If a dev server has started already, assume that installing dependencies will be executed in a different process and will be picked up by the dev server.

      - file: For writing new files or updating existing files. For each file add a \`filePath\` attribute to the opening \`<boltAction>\` tag to specify the file path. The content of the file artifact is the file contents. All file paths MUST BE relative to the current working directory.

    9. The order of the actions is VERY IMPORTANT. For example, if you decide to run a file it's important that the file exists in the first place and you need to create it before running a shell command that would execute the file.

    10. ALWAYS install necessary dependencies FIRST before generating any other artifact. If that requires a \`package.json\` then you should create that first!

      IMPORTANT: Add all required dependencies to the \`package.json\` already and try to avoid \`npm i <pkg>\` if possible!

    11. CRITICAL: Always provide the FULL, updated content of the artifact. This means:

      - Include ALL code, even if parts are unchanged
      - NEVER use placeholders like "// rest of the code remains the same..." or "<- leave original code here ->"
      - ALWAYS show the complete, up-to-date file contents when updating files
      - Avoid any form of truncation or summarization

    12. When running a dev server NEVER say something like "You can now view X by opening the provided local server URL in your browser. The preview will be opened automatically or by the user manually!

    13. If a dev server has already been started, do not re-run the dev command when new dependencies are installed or files were updated. Assume that installing new dependencies will be executed in a different process and changes will be picked up by the dev server.

    14. IMPORTANT: Use coding best practices and split functionality into smaller modules instead of putting everything in a single gigantic file. Files should be as small as possible, and functionality should be extracted into separate modules when possible.

      - Ensure code is clean, readable, and maintainable.
      - Adhere to proper naming conventions and consistent formatting.
      - Split functionality into smaller, reusable modules instead of placing everything in a single large file.
      - Keep files as small as possible by extracting related functionalities into separate modules.
      - Use imports to connect these modules together effectively.
  </artifact_instructions>
</artifact_info>

NEVER use the word "artifact". For example:
  - DO NOT SAY: "This artifact sets up a simple Snake game using HTML, CSS, and JavaScript."
  - INSTEAD SAY: "We set up a simple Snake game using HTML, CSS, and JavaScript."

IMPORTANT: Use valid markdown only for all your responses and DO NOT use HTML tags except for artifacts!

ULTRA IMPORTANT: Do NOT be verbose and DO NOT explain anything unless the user is asking for more information. That is VERY important.

ULTRA IMPORTANT: Think first and reply with the artifact that contains all necessary steps to set up the project, files, shell commands to run. It is SUPER IMPORTANT to respond with this first.

Here are some examples of correct usage of artifacts:

<examples>
  <example>
    <user_query>Can you help me create a JavaScript function to calculate the factorial of a number?</user_query>

    <assistant_response>
      Certainly, I can help you create a JavaScript function to calculate the factorial of a number.

      <boltArtifact id="factorial-function" title="JavaScript Factorial Function">
        <boltAction type="file" filePath="index.js">
          function factorial(n) {
           ...
          }

          ...
        </boltAction>

        <boltAction type="shell">
          node index.js
        </boltAction>
      </boltArtifact>
    </assistant_response>
  </example>

  <example>
    <user_query>Build a snake game</user_query>

    <assistant_response>
      Certainly! I'd be happy to help you build a snake game using JavaScript and HTML5 Canvas. This will be a basic implementation that you can later expand upon. Let's create the game step by step.

      <boltArtifact id="snake-game" title="Snake Game in HTML and JavaScript">
        <boltAction type="file" filePath="package.json">
          {
            "name": "snake",
            "scripts": {
              "dev": "vite"
            }
            ...
          }
        </boltAction>

        <boltAction type="shell">
          npm install --save-dev vite
        </boltAction>

        <boltAction type="file" filePath="index.html">
          ...
        </boltAction>

        <boltAction type="shell">
          npm run dev
        </boltAction>
      </boltArtifact>

      Now you can play the Snake game by opening the provided local server URL in your browser. Use the arrow keys to control the snake. Eat the red food to grow and increase your score. The game ends if you hit the wall or your own tail.
    </assistant_response>
  </example>

  <example>
    <user_query>Make a bouncing ball with real gravity using React</user_query>

    <assistant_response>
      Certainly! I'll create a bouncing ball with real gravity using React. We'll use the react-spring library for physics-based animations.

      <boltArtifact id="bouncing-ball-react" title="Bouncing Ball with Gravity in React">
        <boltAction type="file" filePath="package.json">
          {
            "name": "bouncing-ball",
            "private": true,
            "version": "0.0.0",
            "type": "module",
            "scripts": {
              "dev": "vite",
              "build": "vite build",
              "preview": "vite preview"
            },
            "dependencies": {
              "react": "^18.2.0",
              "react-dom": "^18.2.0",
              "react-spring": "^9.7.1"
            },
            "devDependencies": {
              "@types/react": "^18.0.28",
              "@types/react-dom": "^18.0.11",
              "@vitejs/plugin-react": "^3.1.0",
              "vite": "^4.2.0"
            }
          }
        </boltAction>

        <boltAction type="file" filePath="index.html">
          ...
        </boltAction>

        <boltAction type="file" filePath="src/main.jsx">
          ...
        </boltAction>

        <boltAction type="file" filePath="src/index.css">
          ...
        </boltAction>

        <boltAction type="file" filePath="src/App.jsx">
          ...
        </boltAction>

        <boltAction type="shell">
          npm run dev
        </boltAction>
      </boltArtifact>

      You can now view the bouncing ball animation in the preview. The ball will start falling from the top of the screen and bounce realistically when it hits the bottom.
    </assistant_response>
  </example>
</examples>
`,V=w`
  Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions.
  Do not repeat any content, including artifact and action tags.
`;function f(e,t,n){return(0,T.streamText)({model:G(H(t)),system:K(),maxTokens:8192,headers:{"anthropic-beta":"max-tokens-3-5-sonnet-2024-07-15"},messages:(0,T.convertToCoreMessages)(e),...n})}var he=new TextEncoder,fe=new TextDecoder;async function me(e){return ge(e)}async function ge({context:e,request:t}){let{message:n}=await t.json();try{let i=await f([{role:"user",content:w`
          I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

          IMPORTANT: Only respond with the improved prompt and nothing else!

          <original_prompt>
            ${n}
          </original_prompt>
        `}],e.cloudflare.env),o=new TransformStream({transform(d,u){let r=fe.decode(d).split(`
`).filter(p=>p!=="").map(x.parseStreamPart).map(p=>p.value).join("");u.enqueue(he.encode(r))}}),l=i.toAIStream().pipeThrough(o);return new x.StreamingTextResponse(l)}catch(i){throw console.log(i),new Response(null,{status:500,statusText:"Internal Server Error"})}}var O={};c(O,{action:()=>be});var m=class extends TransformStream{_controller=null;_currentReader=null;_switches=0;constructor(){let t;if(super({start(n){t=n}}),t===void 0)throw new Error("Controller not properly initialized");this._controller=t}async switchSource(t){this._currentReader&&await this._currentReader.cancel(),this._currentReader=t.getReader(),this._pumpStream(),this._switches++}async _pumpStream(){if(!this._currentReader||!this._controller)throw new Error("Stream is not properly initialized");try{for(;;){let{done:t,value:n}=await this._currentReader.read();if(t)break;this._controller.enqueue(n)}}catch(t){console.log(t),this._controller.error(t)}}close(){this._currentReader&&this._currentReader.cancel(),this._controller?.terminate()}get switches(){return this._switches}};async function be(e){return Ae(e)}async function Ae({context:e,request:t}){let{messages:n}=await t.json(),i=new m;try{let o={toolChoice:"none",onFinish:async({text:d,finishReason:u})=>{if(u!=="length")return i.close();if(i.switches>=2)throw Error("Cannot continue message: Maximum segments reached");let r=2-i.switches;console.log(`Reached max token limit (${8192}): Continuing message (${r} switches left)`),n.push({role:"assistant",content:d}),n.push({role:"user",content:V});let p=await f(n,e.cloudflare.env,o);return i.switchSource(p.toAIStream())}},l=await f(n,e.cloudflare.env,o);return i.switchSource(l.toAIStream()),new Response(i.readable,{status:200,headers:{contentType:"text/plain; charset=utf-8"}})}catch(o){throw console.log(o),new Response(null,{status:500,statusText:"Internal Server Error"})}}var j={};c(j,{default:()=>xe,loader:()=>Te});var Q=require("@remix-run/cloudflare");var M={};c(M,{default:()=>S,loader:()=>we,meta:()=>ve});var X=require("@remix-run/node"),g=require("react/jsx-runtime"),ve=()=>[{title:"Gobeze AI"},{name:"description",content:"Talk with Gobeze AI, your AI assistant"}],we=()=>(0,X.json)({});function S(){return(0,g.jsxs)("div",{style:{fontFamily:"system-ui, sans-serif",lineHeight:"1.4"},children:[(0,g.jsx)("h1",{children:"Welcome to Gobeze AI"}),(0,g.jsx)("p",{children:"This is a minimal setup to get started."})]})}async function Te(e){return(0,Q.json)({id:e.params.id})}var xe=S;var F={};c(F,{loader:()=>Se});var Z=require("@remix-run/node"),Se=()=>(0,Z.json)({status:"ok"});var ee={entry:{module:"/build/entry.client-RTV4AKMX.js",imports:["/build/_shared/chunk-3PEZYSNB.js","/build/_shared/chunk-4HXKWYDW.js","/build/_shared/chunk-Q3IECNXJ.js"]},routes:{root:{id:"root",parentId:void 0,path:"",index:void 0,caseSensitive:void 0,module:"/build/root-M3GE2H72.js",imports:void 0,hasAction:!1,hasLoader:!1,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1},"routes/_index":{id:"routes/_index",parentId:"root",path:"/",index:void 0,caseSensitive:void 0,module:"/build/routes/_index-TS44TL7I.js",imports:["/build/_shared/chunk-6HLMBU3L.js"],hasAction:!1,hasLoader:!0,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1},"routes/api.chat":{id:"routes/api.chat",parentId:"root",path:"api/chat",index:void 0,caseSensitive:void 0,module:"/build/routes/api.chat-NJ6GVCXF.js",imports:void 0,hasAction:!0,hasLoader:!1,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1},"routes/api.enhancer":{id:"routes/api.enhancer",parentId:"root",path:"api/enhancer",index:void 0,caseSensitive:void 0,module:"/build/routes/api.enhancer-Q55YVPUW.js",imports:void 0,hasAction:!0,hasLoader:!1,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1},"routes/chat.$id":{id:"routes/chat.$id",parentId:"root",path:"chat/:id",index:void 0,caseSensitive:void 0,module:"/build/routes/chat.$id-J3EJUIJJ.js",imports:["/build/_shared/chunk-6HLMBU3L.js"],hasAction:!1,hasLoader:!0,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1},"routes/health":{id:"routes/health",parentId:"root",path:"health",index:void 0,caseSensitive:void 0,module:"/build/routes/health-TTCX2HYV.js",imports:void 0,hasAction:!1,hasLoader:!0,hasClientAction:!1,hasClientLoader:!1,hasErrorBoundary:!1}},version:"b4a4983a",hmr:void 0,url:"/build/manifest-B4A4983A.js"};var Ie="production",_e="public/build",Re={v3_fetcherPersist:!1,v3_relativeSplatPath:!1,v3_throwAbortReason:!1,v3_routeConfig:!1,v3_singleFetch:!1,v3_lazyRouteDiscovery:!1,unstable_optimizeDeps:!1},Ee="/build/",Ne={module:N},Le={root:{id:"root",parentId:void 0,path:"",index:void 0,caseSensitive:void 0,module:P},"routes/api.enhancer":{id:"routes/api.enhancer",parentId:"root",path:"api/enhancer",index:void 0,caseSensitive:void 0,module:C},"routes/api.chat":{id:"routes/api.chat",parentId:"root",path:"api/chat",index:void 0,caseSensitive:void 0,module:O},"routes/chat.$id":{id:"routes/chat.$id",parentId:"root",path:"chat/:id",index:void 0,caseSensitive:void 0,module:j},"routes/_index":{id:"routes/_index",parentId:"root",path:"/",index:void 0,caseSensitive:void 0,module:M},"routes/health":{id:"routes/health",parentId:"root",path:"health",index:void 0,caseSensitive:void 0,module:F}};0&&(module.exports={assets,assetsBuildDirectory,entry,future,mode,publicPath,routes});
