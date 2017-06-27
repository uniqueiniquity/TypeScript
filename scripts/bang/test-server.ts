import { readFileSync } from "fs";

import ts = require("../../lib/tsserverlibrary");

import parseLog from "./parseLog";

const log = readFileSync("./log.txt", "utf-8");

class DumbSession extends ts.server.Session {
    constructor() {
        const host: ts.server.ServerHost = {
            ...ts.sys, //TODO: replace readFile with a shim
            setTimeout(): never { throw new Error(); },
            clearTimeout(): never { throw new Error(); },
            setImmediate(): never { throw new Error(); },
            clearImmediate(): never { throw new Error(); },
            //gc, trace, require
        };
        const cancellationToken: ts.server.ServerCancellationToken = {
            isCancellationRequested: () => false,
            setRequest() {},
            resetRequest() {},
        }
        const typingsInstaller: ts.server.ITypingsInstaller = {
            enqueueInstallTypingsRequest() {},
            attach() {},
            onProjectClosed() {},
            globalTypingsCacheLocation: "",
        };
        const logger: ts.server.Logger = {
            close() {},
            hasLevel: () => false,
            loggingEnabled: () => false,
            perftrc() {},
            info() {},
            startGroup() {},
            endGroup() {},
            msg() {},
            getLogFileName(): never { throw new Error(); },
        };
        const options: ts.server.SessionOptions = {
            host,
            cancellationToken,
            useSingleInferredProject: true,
            typingsInstaller,
            byteLength: s => Buffer.byteLength(s),
            hrtime(): never { throw new Error(); },
            logger,
            canUseEvents: false,
            //eventHandler: notImplemented,
            //throttleWaitMilliseconds: 0,
        };
        super(options);
    }
}

const sess = new DumbSession();

const events = parseLog(log);
const requests = events.filter(e => e.type === "request").map(r => JSON.parse(r.text));
console.log(JSON.stringify(requests, undefined, 4));

/*const events = [
    {
        type: "request",
        text: JSON.stringify({
            "seq": 2,
            "type":" request",
            "command": "open",
            "arguments": {
                "file":"/home/andy/sample/ts/src/a.ts",
                "fileContent": "const a = new Array<number>;\n",
                "scriptKindName":"TS",
                "projectRootPath":"/home/andy/sample/ts"
            }
        }),
    }
];*/


for (const event of events) {
    switch (event.type) {
        case "request":
        //case "event":
            console.log("SENDING:::", event.text);
            sess.onMessage(event.text);
            console.log("SENT");
            break;

        case "event":
            break;

        case "response":
            break;

        default:
            throw new Error();
    }
}

console.log("DONE");
process.exit(0);
