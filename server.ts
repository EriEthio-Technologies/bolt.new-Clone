import { createRequestHandler } from "@remix-run/node";
import * as build from "@remix-run/dev/server-build";

const handler = createRequestHandler(build, process.env.NODE_ENV);

export default handler; 