"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const ts = require("../../../built/local/tsserverlibrary");
const utils_1 = require("./utils");
const parseLog_1 = require("./parseLog");
const logLocation = "/home/andy/Downloads/tsserver.log"; //"C:/Users/anhans/Downloads/tsserver.log"; //
class DumbSession extends ts.server.Session {
    constructor() {
        const noop = () => { };
        const notImplemented = () => { throw new Error(); };
        const host = {
            args: [],
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write(s) {
                console.log(s);
                if (s.includes('"success":false')) {
                    //console.log(s);
                    throw new Error(s);
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
            watchFile: () => {
                return { close() { } };
            },
            watchDirectory: () => {
                return { close() { } };
            },
        };
        const cancellationToken = {
            isCancellationRequested: () => false,
            setRequest() { },
            resetRequest() { },
        };
        const typingsInstaller = {
            enqueueInstallTypingsRequest() { },
            attach() { },
            onProjectClosed() { },
            globalTypingsCacheLocation: "",
        };
        const logger = {
            close() { },
            hasLevel: () => false,
            loggingEnabled: () => false,
            perftrc() { },
            info() { },
            startGroup() { },
            endGroup() { },
            msg() { },
            getLogFileName() { throw new Error(); },
        };
        const options = {
            host,
            cancellationToken,
            useSingleInferredProject: true,
            typingsInstaller,
            byteLength: s => Buffer.byteLength(s),
            hrtime() { throw new Error(); },
            logger,
            canUseEvents: false,
        };
        super(options);
    }
}
function getRequestsFromLog() {
    const log = fs_1.readFileSync(logLocation, "utf-8");
    const events = parseLog_1.default(log);
    const requests = events.filter(e => e.type === "request").map(r => JSON.parse(r.text));
    //Doesn't look like these are important.
    //const x = events.filter(e => e.type === "event").map(e => JSON.parse(e.text));
    return requests.filter((r) => {
        const text = JSON.stringify(r);
        if (!text.includes("Cookie.ts"))
            return false;
        switch (r.command) {
            case "signatureHelp":
            case "geterr":
            case "navtree":
            case "getSupportedCodeFixes":
            case "getCodeFixes":
            case "formatonkey":
            case "completionEntryDetails":
            case "quickinfo":
            case "occurrences":
            case "definition":
            case "references":
                return false;
            case "configure":
            case "close":
            case "compilerOptionsForInferredProjects":
                return false;
            case "completions":
            case "change":
            case "open":
                //if (r.arguments.file && r.arguments.file !== "/Users/asvetl/work/applications/frontend/node_modules/@types/cookie/index.d.ts")
                //    return false;
                return true;
            default:
                throw new Error(r.command);
        }
    });
}
const requests = JSON.parse(fs_1.readFileSync("./requests-backup.json", "utf-8"));
function testChanges(changer) {
    for (const rq of requests) {
        console.log(rq);
        switch (rq.command) {
            case "open":
                break; //ignore
            case "change":
                console.log(rq.arguments);
                const { line, offset, endLine, endOffset, insertString } = rq.arguments;
                changer.change({ line, offset, endLine, endOffset, insertString });
                break;
            case "completions":
                changer.getText();
                break;
            default:
                throw new Error(rq.command);
        }
    }
}
function testFake() {
    const c2 = new utils_1.C6();
    testChanges(c2);
}
function testSession() {
    const sess = new DumbSession();
    sess.onMessage(JSON.stringify({
        "command": "open",
        "arguments": {
            file: "/a.ts",
            fileContent: "",
            scriptKindName: "TS",
            projectRootPath: "/Users/asvetl/work/applications/frontend"
        }
    }));
    /*const sessionChanger: Changer = {
        change(change) {
            const args = { ...change, file: "/a.ts" };
            sess.onMessage(JSON.stringify({ command: "change", arguments: args }));
        },
        getText() {
            const args = {
              file: "/a.ts",
              line: 1,
              offset: 1
            };
            sess.onMessage(JSON.stringify({ command: "completions", arguments: args }));
        }
    }
    //testChanges(sessionChanger);*/
    try {
        for (const rq of requests) {
            //console.log("SEND: ", JSON.stringify(rq));
            sess.onMessage(JSON.stringify(rq));
        }
        console.log("NO ERROR");
    }
    catch (_e) {
        const e = _e;
        const isCorrect = e.message.includes("charCount");
        console.log(isCorrect ? "Caught the correct error!" : "BOO");
        const j = JSON.parse(e.message.split('\n')[2]);
        console.log(j.message);
    }
    process.exit(0); //Else server will leave it open
}
//(ts.server.ScriptVersionCache as any).maxVersions = 999999;
//(ts.server.ScriptVersionCache as any).changeNumberThreshold = Number.MAX_SAFE_INTEGER;
//(ts.server.ScriptVersionCache as any).changeLengthThreshold = Number.MAX_SAFE_INTEGER;
//testSession();
testFake();
/*
TypeError: Cannot read property 'charCount' of undefined
    at LineNode.walk (/home/andy/TypeScript/built/local/scriptVersionCache.ts:702:39)
    at LineIndex.walk (/home/andy/TypeScript/built/local/scriptVersionCache.ts:484:23)
    at LineIndex.getText (/home/andy/TypeScript/built/local/scriptVersionCache.ts:490:22)
    at LineIndexSnapshot.getText (/home/andy/TypeScript/built/local/scriptVersionCache.ts:404:31)
    at Object.updateLanguageServiceSourceFile (/home/andy/TypeScript/built/services/services.ts:980:60)
    at acquireOrUpdateDocument (/home/andy/TypeScript/built/services/documentRegistry.ts:193:40)
    at Object.updateDocumentWithKey (/home/andy/TypeScript/built/services/documentRegistry.ts:160:20)
    at Object.getOrCreateSourceFileByPath [as getSourceFileByPath] (/home/andy/TypeScript/built/services/services.ts:1265:49)
    at tryReuseStructureFromOldProgram (/home/andy/TypeScript/built/compiler/program.ts:771:28)
    at Object.createProgram (/home/andy/TypeScript/built/compiler/program.ts:480:36)
*/
//# sourceMappingURL=test-server.js.map