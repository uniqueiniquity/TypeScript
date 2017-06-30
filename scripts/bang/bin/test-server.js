"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var fs_1 = require("fs");
var ts = require("../../../built/local/tsserverlibrary");
var utils_1 = require("./utils");
var parseLog_1 = require("./parseLog");
var logLocation = "/home/andy/Downloads/tsserver.log"; //"C:/Users/anhans/Downloads/tsserver.log"; //
var DumbSession = (function (_super) {
    __extends(DumbSession, _super);
    function DumbSession() {
        var _this = this;
        var noop = function () { };
        var notImplemented = function () { throw new Error(); };
        var host = {
            args: [],
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write: function (s) {
                console.log(s);
                if (s.includes('"success":false')) {
                    //console.log(s);
                    throw new Error(s);
                }
            },
            readFile: notImplemented,
            writeFile: noop,
            resolvePath: notImplemented,
            fileExists: function () { return false; },
            directoryExists: function () { return false; },
            getDirectories: function () { return []; },
            createDirectory: noop,
            getExecutingFilePath: function () { return ""; },
            getCurrentDirectory: function () { return ""; },
            //getEnvironmentVariable: () => "",
            readDirectory: function () { return []; },
            exit: noop,
            setTimeout: function () { return 0; },
            clearTimeout: noop,
            setImmediate: function () { return 0; },
            clearImmediate: noop,
            createHash: function (s) { return "hash_" + s; },
            //TODO: https://github.com/Microsoft/TypeScript/issues/16776
            watchFile: function () {
                return { close: function () { } };
            },
            watchDirectory: function () {
                return { close: function () { } };
            }
        };
        /*const host: ts.server.ServerHost = {
            ...ts.sys, //TODO: replace readFile with a shim
            setTimeout(): never { throw new Error(); },
            clearTimeout(): never { throw new Error(); },
            setImmediate(): never { throw new Error(); },
            clearImmediate(): never { throw new Error(); },
            //gc, trace, require
        };*/
        var cancellationToken = {
            isCancellationRequested: function () { return false; },
            setRequest: function () { },
            resetRequest: function () { }
        };
        var typingsInstaller = {
            enqueueInstallTypingsRequest: function () { },
            attach: function () { },
            onProjectClosed: function () { },
            globalTypingsCacheLocation: ""
        };
        var logger = {
            close: function () { },
            hasLevel: function () { return false; },
            loggingEnabled: function () { return false; },
            perftrc: function () { },
            info: function () { },
            startGroup: function () { },
            endGroup: function () { },
            msg: function () { },
            getLogFileName: function () { throw new Error(); }
        };
        var options = {
            host: host,
            cancellationToken: cancellationToken,
            useSingleInferredProject: true,
            typingsInstaller: typingsInstaller,
            byteLength: function (s) { return Buffer.byteLength(s); },
            hrtime: function () { throw new Error(); },
            logger: logger,
            canUseEvents: false
        };
        _this = _super.call(this, options) || this;
        return _this;
    }
    return DumbSession;
}(ts.server.Session));
function getRequestsFromLog() {
    var log = fs_1.readFileSync(logLocation, "utf-8");
    var events = parseLog_1["default"](log);
    var requests = events.filter(function (e) { return e.type === "request"; }).map(function (r) { return JSON.parse(r.text); });
    //Doesn't look like these are important.
    //const x = events.filter(e => e.type === "event").map(e => JSON.parse(e.text));
    return requests.filter(function (r) {
        var text = JSON.stringify(r);
        if (!text.includes("Cookie.ts"))
            return false;
        //No error if I exclude these events...
        //if (text.includes(`"insertString":""`))
        //    return false;
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
            case "completions":
            case "configure":
            case "change":
            case "open":
            case "close":
            case "compilerOptionsForInferredProjects":
                //if (r.arguments.file && r.arguments.file !== "/Users/asvetl/work/applications/frontend/node_modules/@types/cookie/index.d.ts")
                //    return false;
                return true;
            default:
                throw new Error(r.command);
        }
    });
}
var requests = JSON.parse(fs_1.readFileSync("./requests.json", "utf-8"));
function testChanges(changer) {
    for (var _i = 0, requests_1 = requests; _i < requests_1.length; _i++) {
        var rq = requests_1[_i];
        switch (rq.command) {
            case "open":
                break; //ignore
            case "change":
                var _a = rq.arguments, line = _a.line, offset = _a.offset, endLine = _a.endLine, endOffset = _a.endOffset, insertString = _a.insertString;
                changer.change({ line: line, offset: offset, endLine: endLine, endOffset: endOffset, insertString: insertString });
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
    var c2 = new utils_1.C2();
    testChanges(c2);
}
function testSession() {
    var sess = new DumbSession();
    sess.onMessage(JSON.stringify({
        "command": "open",
        "arguments": {
            file: "/a.ts",
            fileContent: "",
            scriptKindName: "TS",
            projectRootPath: "/Users/asvetl/work/applications/frontend"
        }
    }));
    var sessionChanger = {
        change: function (change) {
            var args = __assign({}, change, { file: "/a.ts" });
            sess.onMessage(JSON.stringify({ command: "change", arguments: args }));
        },
        getText: function () {
            var args = {
                file: "/a.ts",
                line: 1,
                offset: 1
            };
            sess.onMessage(JSON.stringify({ command: "completions", arguments: args }));
        }
    };
    testChanges(sessionChanger);
    /*
    try {
        for (const rq of requests) {
            //console.log("SEND: ", JSON.stringify(rq));
            sess.onMessage(JSON.stringify(rq));
        }
        console.log("NO ERROR");
    } catch (_e) {
        const e: Error = _e;
        const isCorrect = e.message.includes("charCount");
        console.log(isCorrect ? "Caught the correct error!" : "BOO");

        const j = JSON.parse(e.message.split('\n')[2]);
        console.log(j.message);
    }

    process.exit(0); //Else server will leave it open
    */
}
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