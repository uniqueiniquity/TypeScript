import { readFileSync } from "fs";

import ts = require("../../built/local/tsserverlibrary");

import parseLog from "./parseLog";

const log = readFileSync("./bigLog.txt", "utf-8");

class DumbSession extends ts.server.Session {
    constructor() {
        const noop = () => {};
        const notImplemented = (): never => { throw new Error(); }
        const host: ts.server.ServerHost = {
            args: [],
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write(s): void {
                console.log(s);
                if (s.includes('"success":false')) {
                    //console.log(s);
                    throw new Error("!");
                }
            },
            readFile: notImplemented,
            writeFile: noop,
            resolvePath: notImplemented,
            fileExists: () => false,
            directoryExists: () => false,
            getDirectories: () => [],
            createDirectory: noop,
            getExecutingFilePath: () => "",
            getCurrentDirectory: () => "",
            //getEnvironmentVariable: () => "",
            readDirectory: () => [],
            exit: noop,
            setTimeout: () => 0,
            clearTimeout: noop,
            setImmediate: () => 0,
            clearImmediate: noop,
            createHash: s => `hash_${s}`,
            //TODO: https://github.com/Microsoft/TypeScript/issues/16776
            watchDirectory: () => {
                return { close() {} };
            },
        };
        /*const host: ts.server.ServerHost = {
            ...ts.sys, //TODO: replace readFile with a shim
            setTimeout(): never { throw new Error(); },
            clearTimeout(): never { throw new Error(); },
            setImmediate(): never { throw new Error(); },
            clearImmediate(): never { throw new Error(); },
            //gc, trace, require
        };*/
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

const events = parseLog(log);
const requestsImported = events.filter(e => e.type === "request").map(r => JSON.parse(r.text));

//Filter out irrelevant events.
//const requestsImported = JSON.parse(readFileSync("./requests.json", "utf-8"));

const requests = requestsImported.filter((r: any) => {
    switch (r.command) {
        case "signatureHelp":
        case "geterr":
        case "navtree":
        case "getSupportedCodeFixes":
        case "getCodeFixes":
        case "formatonkey":
        case "completions":
        case "completionEntryDetails":
        case "quickinfo":
        case "occurrences":
        case "definition":
            return true;
        case "configure":
        case "change":
        case "open":
        case "close":
        case "references":
        case "compilerOptionsForInferredProjects":
            //if (r.arguments.file && r.arguments.file !== "/Users/asvetl/work/applications/frontend/node_modules/@types/cookie/index.d.ts")
            //    return false;
            return true;
        default:
            throw new Error(r.command);
    }
});

//console.log(JSON.stringify(requests, undefined, 4));
//process.exit(0);

const sess = new DumbSession();
for (const rq of requests) {
    //console.log(rq.seq);
    console.log("SEND: ", JSON.stringify(rq));
    sess.onMessage(JSON.stringify(rq));
}

process.exit(0); //Else server will leave it open
