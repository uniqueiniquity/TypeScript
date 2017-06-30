/// <reference path="..\harness.ts" />

const expect: typeof _chai.expect = _chai.expect;

namespace ts.server {
    let lastWrittenToHost: string;
    const mockHost: ServerHost = {
        args: [],
        newLine: "\n",
        useCaseSensitiveFileNames: true,
        write(s): void { lastWrittenToHost = s; },
        readFile(): string { return void 0; },
        writeFile: noop,
        resolvePath(): string { return void 0; },
        fileExists: () => false,
        directoryExists: () => false,
        getDirectories: () => [],
        createDirectory: noop,
        getExecutingFilePath: () => "",
        getCurrentDirectory: () => "",
        getEnvironmentVariable: () => "",
        readDirectory: () => [],
        exit: noop,
        setTimeout: () => 0,
        clearTimeout: noop,
        setImmediate: () => 0,
        clearImmediate: noop,
        createHash: Harness.LanguageService.mockHash,
        //TODO: https://github.com/Microsoft/TypeScript/issues/16776
        watchFile: () => {
          return {
            close() {},
          };
        },
        watchDirectory: () => {
            return {
                close() {},
            };
        },
    };

    const mockLogger: Logger = {
        close: noop,
        hasLevel: () => false,
        loggingEnabled: () => false,
        perftrc: noop,
        info: noop,
        startGroup: noop,
        endGroup: noop,
        msg: noop,
        getLogFileName: (): string => undefined
    };

    class TestSession extends Session {
        getProjectService() {
            return this.projectService;
        }
    }

    describe("the Session class", () => {
        let session: TestSession;
        let lastSent: protocol.Message;

        function createSession(): TestSession {
            const opts: server.SessionOptions = {
                host: mockHost,
                cancellationToken: nullCancellationToken,
                useSingleInferredProject: false,
                typingsInstaller: undefined,
                byteLength: Utils.byteLength,
                hrtime: process.hrtime,
                logger: mockLogger,
                canUseEvents: true
            };
            return new TestSession(opts);
        }

        beforeEach(() => {
            session = createSession();
            session.send = (msg: protocol.Message) => {
                lastSent = msg;
            };
        });

        describe("executeCommand", () => {
            it("should throw when commands are executed with invalid arguments", () => {
                const req: protocol.FileRequest = {
                    command: CommandNames.Open,
                    seq: 0,
                    type: "request",
                    arguments: {
                        file: undefined
                    }
                };

                expect(() => session.executeCommand(req)).to.throw();
            });
            it("should output an error response when a command does not exist", () => {
                const req: protocol.Request = {
                    command: "foobar",
                    seq: 0,
                    type: "request"
                };

                session.executeCommand(req);

                expect(lastSent).to.deep.equal(<protocol.Response>{
                    command: CommandNames.Unknown,
                    type: "response",
                    seq: 0,
                    message: "Unrecognized JSON command: foobar",
                    request_seq: 0,
                    success: false
                });
            });
            it("should return a tuple containing the response and if a response is required on success", () => {
                const req: protocol.ConfigureRequest = {
                    command: CommandNames.Configure,
                    seq: 0,
                    type: "request",
                    arguments: {
                        hostInfo: "unit test",
                        formatOptions: {
                            newLineCharacter: "`n"
                        }
                    }
                };

                expect(session.executeCommand(req)).to.deep.equal({
                    responseRequired: false
                });
                expect(lastSent).to.deep.equal({
                    command: CommandNames.Configure,
                    type: "response",
                    success: true,
                    request_seq: 0,
                    seq: 0,
                    body: undefined
                });
            });
            it ("should handle literal types in request", () => {
                const configureRequest: protocol.ConfigureRequest = {
                    command: CommandNames.Configure,
                    seq: 0,
                    type: "request",
                    arguments: {
                        formatOptions: {
                            indentStyle: protocol.IndentStyle.Block,
                        }
                    }
                };

                session.onMessage(JSON.stringify(configureRequest));

                assert.equal(session.getProjectService().getFormatCodeOptions().indentStyle, IndentStyle.Block);

                const setOptionsRequest: protocol.SetCompilerOptionsForInferredProjectsRequest = {
                    command: CommandNames.CompilerOptionsForInferredProjects,
                    seq: 1,
                    type: "request",
                    arguments: {
                        options: {
                            module: protocol.ModuleKind.System,
                            target: protocol.ScriptTarget.ES5,
                            jsx: protocol.JsxEmit.React,
                            newLine: protocol.NewLineKind.Lf,
                            moduleResolution: protocol.ModuleResolutionKind.Node,
                        }
                    }
                };
                session.onMessage(JSON.stringify(setOptionsRequest));
                assert.deepEqual(
                    session.getProjectService().getCompilerOptionsForInferredProjects(),
                    <CompilerOptions>{
                        module: ModuleKind.System,
                        target: ScriptTarget.ES5,
                        jsx: JsxEmit.React,
                        newLine: NewLineKind.LineFeed,
                        moduleResolution: ModuleResolutionKind.NodeJs,
                        allowNonTsExtensions: true // injected by tsserver
                    });
            });
        });

        describe("onMessage", () => {
            const allCommandNames: CommandNames[] = [
                CommandNames.Brace,
                CommandNames.BraceFull,
                CommandNames.BraceCompletion,
                CommandNames.Change,
                CommandNames.Close,
                CommandNames.Completions,
                CommandNames.CompletionsFull,
                CommandNames.CompletionDetails,
                CommandNames.CompileOnSaveAffectedFileList,
                CommandNames.Configure,
                CommandNames.Definition,
                CommandNames.DefinitionFull,
                CommandNames.Implementation,
                CommandNames.ImplementationFull,
                CommandNames.Exit,
                CommandNames.Format,
                CommandNames.Formatonkey,
                CommandNames.FormatFull,
                CommandNames.FormatonkeyFull,
                CommandNames.FormatRangeFull,
                CommandNames.Geterr,
                CommandNames.GeterrForProject,
                CommandNames.SemanticDiagnosticsSync,
                CommandNames.SyntacticDiagnosticsSync,
                CommandNames.NavBar,
                CommandNames.NavBarFull,
                CommandNames.Navto,
                CommandNames.NavtoFull,
                CommandNames.NavTree,
                CommandNames.NavTreeFull,
                CommandNames.Occurrences,
                CommandNames.DocumentHighlights,
                CommandNames.DocumentHighlightsFull,
                CommandNames.Open,
                CommandNames.Quickinfo,
                CommandNames.QuickinfoFull,
                CommandNames.References,
                CommandNames.ReferencesFull,
                CommandNames.Reload,
                CommandNames.Rename,
                CommandNames.RenameInfoFull,
                CommandNames.RenameLocationsFull,
                CommandNames.Saveto,
                CommandNames.SignatureHelp,
                CommandNames.SignatureHelpFull,
                CommandNames.TypeDefinition,
                CommandNames.ProjectInfo,
                CommandNames.ReloadProjects,
                CommandNames.Unknown,
                CommandNames.OpenExternalProject,
                CommandNames.CloseExternalProject,
                CommandNames.SynchronizeProjectList,
                CommandNames.ApplyChangedToOpenFiles,
                CommandNames.EncodedSemanticClassificationsFull,
                CommandNames.Cleanup,
                CommandNames.OutliningSpans,
                CommandNames.TodoComments,
                CommandNames.Indentation,
                CommandNames.DocCommentTemplate,
                CommandNames.CompilerOptionsDiagnosticsFull,
                CommandNames.NameOrDottedNameSpan,
                CommandNames.BreakpointStatement,
                CommandNames.CompilerOptionsForInferredProjects,
                CommandNames.GetCodeFixes,
                CommandNames.GetCodeFixesFull,
                CommandNames.GetSupportedCodeFixes,
                CommandNames.GetApplicableRefactors,
                CommandNames.GetEditsForRefactor,
                CommandNames.GetEditsForRefactorFull,
            ];

            it("should not throw when commands are executed with invalid arguments", () => {
                let i = 0;
                for (const name of allCommandNames) {
                    const req: protocol.Request = {
                        command: name,
                        seq: i,
                        type: "request"
                    };
                    i++;
                    session.onMessage(JSON.stringify(req));
                    req.seq = i;
                    i++;
                    req.arguments = {};
                    session.onMessage(JSON.stringify(req));
                    req.seq = i;
                    i++;
                    /* tslint:disable no-null-keyword */
                    req.arguments = null;
                    /* tslint:enable no-null-keyword */
                    session.onMessage(JSON.stringify(req));
                    req.seq = i;
                    i++;
                    req.arguments = "";
                    session.onMessage(JSON.stringify(req));
                    req.seq = i;
                    i++;
                    req.arguments = 0;
                    session.onMessage(JSON.stringify(req));
                    req.seq = i;
                    i++;
                    req.arguments = [];
                    session.onMessage(JSON.stringify(req));
                }
                session.onMessage("GARBAGE NON_JSON DATA");
            });
            it("should output the response for a correctly handled message", () => {
                const req: protocol.ConfigureRequest = {
                    command: CommandNames.Configure,
                    seq: 0,
                    type: "request",
                    arguments: {
                        hostInfo: "unit test",
                        formatOptions: {
                            newLineCharacter: "`n"
                        }
                    }
                };

                session.onMessage(JSON.stringify(req));

                expect(lastSent).to.deep.equal(<protocol.ConfigureResponse>{
                    command: CommandNames.Configure,
                    type: "response",
                    success: true,
                    request_seq: 0,
                    seq: 0,
                    body: undefined
                });
            });
        });

        describe("send", () => {
            it("is an overrideable handle which sends protocol messages over the wire", () => {
                const msg: server.protocol.Request = { seq: 0, type: "request", command: "" };
                const strmsg = JSON.stringify(msg);
                const len = 1 + Utils.byteLength(strmsg, "utf8");
                const resultMsg = `Content-Length: ${len}\r\n\r\n${strmsg}\n`;

                session.send = Session.prototype.send;
                assert(session.send);
                expect(session.send(msg)).to.not.exist;
                expect(lastWrittenToHost).to.equal(resultMsg);
            });
        });

        describe("addProtocolHandler", () => {
            it("can add protocol handlers", () => {
                const respBody = {
                    item: false
                };
                const command = "newhandle";
                const result = {
                    response: respBody,
                    responseRequired: true
                };

                session.addProtocolHandler(command, () => result);

                expect(session.executeCommand({
                    command,
                    seq: 0,
                    type: "request"
                })).to.deep.equal(result);
            });
            it("throws when a duplicate handler is passed", () => {
                const respBody = {
                    item: false
                };
                const resp = {
                    response: respBody,
                    responseRequired: true
                };
                const command = "newhandle";

                session.addProtocolHandler(command, () => resp);

                expect(() => session.addProtocolHandler(command, () => resp))
                .to.throw(`Protocol handler already exists for command "${command}"`);
            });
        });

        describe("event", () => {
            it("can format event responses and send them", () => {
                const evt = "notify-test";
                const info = {
                    test: true
                };

                session.event(info, evt);

                expect(lastSent).to.deep.equal({
                    type: "event",
                    seq: 0,
                    event: evt,
                    body: info
                });
            });
        });

        describe("output", () => {
            it("can format command responses and send them", () => {
                const body = {
                    block: {
                        key: "value"
                    }
                };
                const command = "test";

                session.output(body, command);

                expect(lastSent).to.deep.equal({
                    seq: 0,
                    request_seq: 0,
                    type: "response",
                    command,
                    body: body,
                    success: true
                });
            });
        });
    });

    describe("how Session is extendable via subclassing", () => {
        class TestSession extends Session {
            lastSent: protocol.Message;
            customHandler = "testhandler";
            constructor() {
                super({
                    host: mockHost,
                    cancellationToken: nullCancellationToken,
                    useSingleInferredProject: false,
                    typingsInstaller: undefined,
                    byteLength: Utils.byteLength,
                    hrtime: process.hrtime,
                    logger: mockLogger,
                    canUseEvents: true
                });
                this.addProtocolHandler(this.customHandler, () => {
                    return { response: undefined, responseRequired: true };
                });
            }
            send(msg: protocol.Message) {
                this.lastSent = msg;
            }
        }

        it("can override methods such as send", () => {
            const session = new TestSession();
            const body = {
                block: {
                    key: "value"
                }
            };
            const command = "test";

            session.output(body, command);

            expect(session.lastSent).to.deep.equal({
                seq: 0,
                request_seq: 0,
                type: "response",
                command,
                body: body,
                success: true
            });
        });
        it("can add and respond to new protocol handlers", () => {
            const session = new TestSession();

            expect(session.executeCommand({
                seq: 0,
                type: "request",
                command: session.customHandler
            })).to.deep.equal({
                response: undefined,
                responseRequired: true
            });
        });
        it("has access to the project service", () => {
            class ServiceSession extends TestSession {
                constructor() {
                    super();
                    assert(this.projectService);
                    expect(this.projectService).to.be.instanceOf(ProjectService);
                }
            }
            new ServiceSession();
        });
    });

    describe("an example of using the Session API to create an in-process server", () => {
        class InProcSession extends Session {
            private queue: protocol.Request[] = [];
            constructor(private client: InProcClient) {
                super({
                    host: mockHost,
                    cancellationToken: nullCancellationToken,
                    useSingleInferredProject: false,
                    typingsInstaller: undefined,
                    byteLength: Utils.byteLength,
                    hrtime: process.hrtime,
                    logger: mockLogger,
                    canUseEvents: true
                });
                this.addProtocolHandler("echo", (req: protocol.Request) => ({
                    response: req.arguments,
                    responseRequired: true
                }));
            }

            send(msg: protocol.Message) {
                this.client.handle(msg);
            }

            enqueue(msg: protocol.Request) {
                this.queue.unshift(msg);
            }

            handleRequest(msg: protocol.Request) {
                let response: protocol.Response;
                try {
                    ({ response } = this.executeCommand(msg));
                }
                catch (e) {
                    this.output(undefined, msg.command, msg.seq, e.toString());
                    return;
                }
                if (response) {
                    this.output(response, msg.command, msg.seq);
                }
            }

            consumeQueue() {
                while (this.queue.length > 0) {
                    const elem = this.queue.pop();
                    this.handleRequest(elem);
                }
            }
        }

        class InProcClient {
            private server: InProcSession;
            private seq = 0;
            private callbacks: Array<(resp: protocol.Response) => void> = [];
            private eventHandlers = createMap<(args: any) => void>();

            handle(msg: protocol.Message): void {
                if (msg.type === "response") {
                    const response = <protocol.Response>msg;
                    const handler = this.callbacks[response.request_seq];
                    if (handler) {
                        handler(response);
                        delete this.callbacks[response.request_seq];
                    }
                }
                else if (msg.type === "event") {
                    const event = <protocol.Event>msg;
                    this.emit(event.event, event.body);
                }
            }

            emit(name: string, args: any): void {
                const handler = this.eventHandlers.get(name);
                if (handler) {
                    handler(args);
                }
            }

            on(name: string, handler: (args: any) => void): void {
                this.eventHandlers.set(name, handler);
            }

            connect(session: InProcSession): void {
                this.server = session;
            }

            execute(command: string, args: any, callback: (resp: protocol.Response) => void): void {
                if (!this.server) {
                    return;
                }
                this.seq++;
                this.server.enqueue({
                    seq: this.seq,
                    type: "request",
                    command,
                    arguments: args
                });
                this.callbacks[this.seq] = callback;
            }
        }

        it("can be constructed and respond to commands", (done) => {
            const cli = new InProcClient();
            const session = new InProcSession(cli);
            const toEcho = {
                data: true
            };
            const toEvent = {
                data: false
            };
            let responses = 0;

            // Connect the client
            cli.connect(session);

            // Add an event handler
            cli.on("testevent", (eventinfo) => {
                expect(eventinfo).to.equal(toEvent);
                responses++;
                expect(responses).to.equal(1);
            });

            // Trigger said event from the server
            session.event(toEvent, "testevent");

            // Queue an echo command
            cli.execute("echo", toEcho, (resp) => {
                assert(resp.success, resp.message);
                responses++;
                expect(responses).to.equal(2);
                expect(resp.body).to.deep.equal(toEcho);
            });

            // Queue a configure command
            cli.execute("configure", {
                hostInfo: "unit test",
                formatOptions: {
                    newLineCharacter: "`n"
                }
            }, (resp) => {
                assert(resp.success, resp.message);
                responses++;
                expect(responses).to.equal(3);
                done();
            });

            // Consume the queue and trigger the callbacks
            session.consumeQueue();
        });
    });

    describe("TEST", () => {
        it("works", () => {
            const sess = new DumbSession();
            const events = [
                {
                  "seq": 90,
                  "type": "request",
                  "command": "open",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "fileContent": "",
                    "scriptKindName": "TS",
                    "projectRootPath": "/Users/asvetl/work/applications/frontend"
                  }
                },
                {
                  "seq": 94,
                  "type": "request",
                  "command": "open",
                  "arguments": {
                    "file": "/users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "fileContent": "",
                    "scriptKindName": "TS",
                    "projectRootPath": "/Users/asvetl/work/applications/frontend"
                  }
                },
                {
                  "seq": 96,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 1,
                    "endLine": 1,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 97,
                  "type": "request",
                  "command": "configure",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "formatOptions": {
                      "tabSize": 4,
                      "indentSize": 4,
                      "convertTabsToSpaces": true,
                      "newLineCharacter": "\n",
                      "insertSpaceAfterCommaDelimiter": true,
                      "insertSpaceAfterSemicolonInForStatements": true,
                      "insertSpaceBeforeAndAfterBinaryOperators": true,
                      "insertSpaceAfterKeywordsInControlFlowStatements": true,
                      "insertSpaceAfterFunctionKeywordForAnonymousFunctions": true,
                      "insertSpaceBeforeFunctionParenthesis": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces": true,
                      "insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces": false,
                      "insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces": false,
                      "placeOpenBraceOnNewLineForFunctions": false,
                      "placeOpenBraceOnNewLineForControlBlocks": false
                    }
                  }
                },
                {
                  "seq": 99,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 2,
                    "endOffset": 1,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 100,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 2
                  }
                },
                {
                  "seq": 102,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 2,
                    "endLine": 2,
                    "endOffset": 2,
                    "insertString": "x"
                  }
                },
                {
                  "seq": 104,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 3,
                    "endLine": 2,
                    "endOffset": 3,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 106,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 4,
                    "endLine": 2,
                    "endOffset": 4,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 108,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 2,
                    "endOffset": 5,
                    "insertString": "export"
                  }
                },
                {
                  "seq": 109,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 7,
                    "endLine": 2,
                    "endOffset": 7,
                    "insertString": " "
                  }
                },
                {
                  "seq": 110,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 8,
                    "endLine": 2,
                    "endOffset": 8,
                    "insertString": "f"
                  }
                },
                {
                  "seq": 111,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 9
                  }
                },
                {
                  "seq": 113,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 9,
                    "endLine": 2,
                    "endOffset": 9,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 115,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 10,
                    "endLine": 2,
                    "endOffset": 10,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 117,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 11,
                    "endLine": 2,
                    "endOffset": 11,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 119,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 12,
                    "endLine": 2,
                    "endOffset": 12,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 121,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 13,
                    "endLine": 2,
                    "endOffset": 13,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 123,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 14,
                    "endLine": 2,
                    "endOffset": 14,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 125,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 15,
                    "endLine": 2,
                    "endOffset": 15,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 127,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 16,
                    "endLine": 2,
                    "endOffset": 16,
                    "insertString": " "
                  }
                },
                {
                  "seq": 133,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 17,
                    "endLine": 2,
                    "endOffset": 17,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 134,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 18
                  }
                },
                {
                  "seq": 135,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 18,
                    "endLine": 2,
                    "endOffset": 18,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 136,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 19,
                    "endLine": 2,
                    "endOffset": 19,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 143,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 20,
                    "endLine": 2,
                    "endOffset": 20,
                    "insertString": "G"
                  }
                },
                {
                  "seq": 144,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 21,
                    "endLine": 2,
                    "endOffset": 21,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 149,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 22,
                    "endLine": 2,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 151,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 23,
                    "endLine": 2,
                    "endOffset": 23,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 152,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 24,
                    "endLine": 2,
                    "endOffset": 24,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 153,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 25
                  }
                },
                {
                  "seq": 159,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 24,
                    "endLine": 2,
                    "endOffset": 25,
                    "insertString": ""
                  }
                },
                {
                  "seq": 160,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 23,
                    "endLine": 2,
                    "endOffset": 24,
                    "insertString": ""
                  }
                },
                {
                  "seq": 161,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 22,
                    "endLine": 2,
                    "endOffset": 23,
                    "insertString": ""
                  }
                },
                {
                  "seq": 162,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 21,
                    "endLine": 2,
                    "endOffset": 22,
                    "insertString": ""
                  }
                },
                {
                  "seq": 163,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 20,
                    "endLine": 2,
                    "endOffset": 21,
                    "insertString": ""
                  }
                },
                {
                  "seq": 164,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 20,
                    "endLine": 2,
                    "endOffset": 20,
                    "insertString": "C"
                  }
                },
                {
                  "seq": 165,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 21
                  }
                },
                {
                  "seq": 166,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 21,
                    "endLine": 2,
                    "endOffset": 21,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 167,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 22,
                    "endLine": 2,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 168,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 23,
                    "endLine": 2,
                    "endOffset": 23,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 169,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 24,
                    "endLine": 2,
                    "endOffset": 24,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 170,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 25
                  }
                },
                {
                  "seq": 176,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 25,
                    "endLine": 2,
                    "endOffset": 25,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 177,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 26
                  }
                },
                {
                  "seq": 184,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 26,
                    "endLine": 2,
                    "endOffset": 26,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 185,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 27
                  }
                },
                {
                  "seq": 190,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 27,
                    "endLine": 2,
                    "endOffset": 27,
                    "insertString": "()"
                  }
                },
                {
                  "seq": 192,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 28,
                    "endLine": 2,
                    "endOffset": 29,
                    "insertString": ")"
                  }
                },
                {
                  "seq": 196,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 29,
                    "endLine": 2,
                    "endOffset": 29,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 197,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 30,
                    "endLine": 2,
                    "endOffset": 30,
                    "insertString": " "
                  }
                },
                {
                  "seq": 200,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "{}"
                  }
                },
                {
                  "seq": 201,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "}"
                  }
                },
                {
                  "seq": 206,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": " "
                  }
                },
                {
                  "seq": 211,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": ""
                  }
                },
                {
                  "seq": 212,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": ""
                  }
                },
                {
                  "seq": 213,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": ""
                  }
                },
                {
                  "seq": 219,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 220,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32
                  }
                },
                {
                  "seq": 222,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 224,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 226,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 34,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 228,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 35,
                    "endLine": 2,
                    "endOffset": 35,
                    "insertString": " "
                  }
                },
                {
                  "seq": 229,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 36,
                    "endLine": 2,
                    "endOffset": 36,
                    "insertString": "{}"
                  }
                },
                {
                  "seq": 230,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 37,
                    "endLine": 2,
                    "endOffset": 37,
                    "insertString": "\n    \n"
                  }
                },
                {
                  "seq": 235,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 1,
                    "endLine": 3,
                    "endOffset": 5,
                    "insertString": ""
                  }
                },
                {
                  "seq": 241,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 1,
                    "endLine": 4,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 246,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 37,
                    "endLine": 2,
                    "endOffset": 37,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 250,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 5,
                    "endLine": 3,
                    "endOffset": 5,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 251,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 6
                  }
                },
                {
                  "seq": 259,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 5,
                    "endLine": 3,
                    "endOffset": 6,
                    "insertString": ""
                  }
                },
                {
                  "seq": 290,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 35,
                    "insertString": ""
                  }
                },
                {
                  "seq": 291,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 292,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32
                  }
                },
                {
                  "seq": 294,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 296,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 297,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 34,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 298,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 35,
                    "endLine": 2,
                    "endOffset": 35,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 299,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 36,
                    "endLine": 2,
                    "endOffset": 36,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 303,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 37,
                    "insertString": ""
                  }
                },
                {
                  "seq": 308,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 309,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32
                  }
                },
                {
                  "seq": 311,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 313,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 315,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 34,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 317,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 35,
                    "endLine": 2,
                    "endOffset": 35,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 319,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 36,
                    "endLine": 2,
                    "endOffset": 36,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 423,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 37,
                    "insertString": ""
                  }
                },
                {
                  "seq": 424,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 425,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32
                  }
                },
                {
                  "seq": 427,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 428,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 430,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 34,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 460,
                  "type": "request",
                  "command": "close",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts"
                  }
                },
                {
                  "seq": 469,
                  "type": "request",
                  "command": "open",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "fileContent": "",
                    "scriptKindName": "TS",
                    "projectRootPath": "/Users/asvetl/work/applications/frontend"
                  }
                },
                {
                  "seq": 473,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 1,
                    "endLine": 1,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 474,
                  "type": "request",
                  "command": "configure",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "formatOptions": {
                      "tabSize": 4,
                      "indentSize": 4,
                      "convertTabsToSpaces": true,
                      "newLineCharacter": "\n",
                      "insertSpaceAfterCommaDelimiter": true,
                      "insertSpaceAfterSemicolonInForStatements": true,
                      "insertSpaceBeforeAndAfterBinaryOperators": true,
                      "insertSpaceAfterKeywordsInControlFlowStatements": true,
                      "insertSpaceAfterFunctionKeywordForAnonymousFunctions": true,
                      "insertSpaceBeforeFunctionParenthesis": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets": false,
                      "insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces": true,
                      "insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces": false,
                      "insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces": false,
                      "placeOpenBraceOnNewLineForFunctions": false,
                      "placeOpenBraceOnNewLineForControlBlocks": false
                    }
                  }
                },
                {
                  "seq": 479,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 2,
                    "endOffset": 1,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 480,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 2
                  }
                },
                {
                  "seq": 482,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 2,
                    "endLine": 2,
                    "endOffset": 2,
                    "insertString": "x"
                  }
                },
                {
                  "seq": 487,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 3,
                    "endLine": 2,
                    "endOffset": 3,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 490,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 4,
                    "endLine": 2,
                    "endOffset": 4,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 492,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 5,
                    "endLine": 2,
                    "endOffset": 5,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 495,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 6,
                    "endLine": 2,
                    "endOffset": 6,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 497,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 7,
                    "endLine": 2,
                    "endOffset": 7,
                    "insertString": " "
                  }
                },
                {
                  "seq": 498,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 8,
                    "endLine": 2,
                    "endOffset": 8,
                    "insertString": "f"
                  }
                },
                {
                  "seq": 499,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 9
                  }
                },
                {
                  "seq": 501,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 9,
                    "endLine": 2,
                    "endOffset": 9,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 502,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 10,
                    "endLine": 2,
                    "endOffset": 10,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 504,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 11,
                    "endLine": 2,
                    "endOffset": 11,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 506,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 12,
                    "endLine": 2,
                    "endOffset": 12,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 508,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 13,
                    "endLine": 2,
                    "endOffset": 13,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 510,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 14,
                    "endLine": 2,
                    "endOffset": 14,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 512,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 15,
                    "endLine": 2,
                    "endOffset": 15,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 514,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 16,
                    "endLine": 2,
                    "endOffset": 16,
                    "insertString": " "
                  }
                },
                {
                  "seq": 515,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 17,
                    "endLine": 2,
                    "endOffset": 17,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 516,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 18
                  }
                },
                {
                  "seq": 517,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 18,
                    "endLine": 2,
                    "endOffset": 18,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 518,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 19,
                    "endLine": 2,
                    "endOffset": 19,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 519,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 20,
                    "endLine": 2,
                    "endOffset": 20,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 523,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 21,
                    "endLine": 2,
                    "endOffset": 21,
                    "insertString": "T"
                  }
                },
                {
                  "seq": 524,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 22,
                    "endLine": 2,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 530,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 23,
                    "endLine": 2,
                    "endOffset": 23,
                    "insertString": "C"
                  }
                },
                {
                  "seq": 531,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 24
                  }
                },
                {
                  "seq": 532,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 24,
                    "endLine": 2,
                    "endOffset": 24,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 533,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 25
                  }
                },
                {
                  "seq": 534,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 25,
                    "endLine": 2,
                    "endOffset": 25,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 535,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 26
                  }
                },
                {
                  "seq": 536,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 26,
                    "endLine": 2,
                    "endOffset": 26,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 537,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 27
                  }
                },
                {
                  "seq": 538,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 27,
                    "endLine": 2,
                    "endOffset": 27,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 540,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 28
                  }
                },
                {
                  "seq": 541,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 28,
                    "endLine": 2,
                    "endOffset": 28,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 542,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 29
                  }
                },
                {
                  "seq": 548,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 29,
                    "endLine": 2,
                    "endOffset": 29,
                    "insertString": "()"
                  }
                },
                {
                  "seq": 554,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 30,
                    "endLine": 2,
                    "endOffset": 30,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 555,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31
                  }
                },
                {
                  "seq": 556,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 31,
                    "endLine": 2,
                    "endOffset": 31,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 557,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 32,
                    "endLine": 2,
                    "endOffset": 32,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 558,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 33,
                    "endLine": 2,
                    "endOffset": 33,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 559,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 34,
                    "endLine": 2,
                    "endOffset": 34,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 560,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 35,
                    "endLine": 2,
                    "endOffset": 35,
                    "insertString": " "
                  }
                },
                {
                  "seq": 561,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 36,
                    "endLine": 2,
                    "endOffset": 36,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 562,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 37
                  }
                },
                {
                  "seq": 564,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 37,
                    "endLine": 2,
                    "endOffset": 37,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 566,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 38,
                    "endLine": 2,
                    "endOffset": 38,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 568,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 39,
                    "endLine": 2,
                    "endOffset": 39,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 570,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 40,
                    "endLine": 2,
                    "endOffset": 40,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 572,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 41,
                    "endLine": 2,
                    "endOffset": 41,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 577,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 42,
                    "endLine": 2,
                    "endOffset": 42,
                    "insertString": ","
                  }
                },
                {
                  "seq": 578,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 43,
                    "endLine": 2,
                    "endOffset": 43,
                    "insertString": " "
                  }
                },
                {
                  "seq": 579,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 44,
                    "endLine": 2,
                    "endOffset": 44,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 580,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 45
                  }
                },
                {
                  "seq": 581,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 45,
                    "endLine": 2,
                    "endOffset": 45,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 582,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 46,
                    "endLine": 2,
                    "endOffset": 46,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 584,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 47,
                    "endLine": 2,
                    "endOffset": 47,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 585,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 48,
                    "endLine": 2,
                    "endOffset": 48,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 586,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 49,
                    "endLine": 2,
                    "endOffset": 49,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 587,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 50,
                    "endLine": 2,
                    "endOffset": 50,
                    "insertString": " "
                  }
                },
                {
                  "seq": 588,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 51,
                    "endLine": 2,
                    "endOffset": 51,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 589,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 52
                  }
                },
                {
                  "seq": 597,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 52,
                    "endLine": 2,
                    "endOffset": 52,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 599,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 53,
                    "endLine": 2,
                    "endOffset": 53,
                    "insertString": "y"
                  }
                },
                {
                  "seq": 604,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 54,
                    "endLine": 2,
                    "endOffset": 55,
                    "insertString": ")"
                  }
                },
                {
                  "seq": 608,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 55,
                    "endLine": 2,
                    "endOffset": 55,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 609,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 56,
                    "endLine": 2,
                    "endOffset": 56,
                    "insertString": " "
                  }
                },
                {
                  "seq": 612,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 57,
                    "endLine": 2,
                    "endOffset": 57,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 613,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 58
                  }
                },
                {
                  "seq": 615,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 58,
                    "endLine": 2,
                    "endOffset": 58,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 616,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 59,
                    "endLine": 2,
                    "endOffset": 59,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 618,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 60,
                    "endLine": 2,
                    "endOffset": 60,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 620,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 61,
                    "endLine": 2,
                    "endOffset": 61,
                    "insertString": " "
                  }
                },
                {
                  "seq": 621,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 62,
                    "endLine": 2,
                    "endOffset": 62,
                    "insertString": "{}"
                  }
                },
                {
                  "seq": 622,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 63,
                    "endLine": 2,
                    "endOffset": 63,
                    "insertString": "\n    \n"
                  }
                },
                {
                  "seq": 627,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 1,
                    "endLine": 3,
                    "endOffset": 5,
                    "insertString": ""
                  }
                },
                {
                  "seq": 631,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 1,
                    "endLine": 3,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 636,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 4,
                    "offset": 1,
                    "endLine": 5,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 637,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 4,
                    "offset": 2,
                    "endLine": 4,
                    "endOffset": 2,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 638,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 5,
                    "offset": 1,
                    "endLine": 5,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 640,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 1,
                    "endLine": 6,
                    "endOffset": 1,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 641,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 2
                  }
                },
                {
                  "seq": 643,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 2,
                    "endLine": 6,
                    "endOffset": 2,
                    "insertString": "x"
                  }
                },
                {
                  "seq": 645,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 3,
                    "endLine": 6,
                    "endOffset": 3,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 647,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 4,
                    "endLine": 6,
                    "endOffset": 4,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 649,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 1,
                    "endLine": 6,
                    "endOffset": 5,
                    "insertString": "export"
                  }
                },
                {
                  "seq": 650,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 7,
                    "endLine": 6,
                    "endOffset": 7,
                    "insertString": " "
                  }
                },
                {
                  "seq": 651,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 8,
                    "endLine": 6,
                    "endOffset": 8,
                    "insertString": "f"
                  }
                },
                {
                  "seq": 652,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 9
                  }
                },
                {
                  "seq": 654,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 9,
                    "endLine": 6,
                    "endOffset": 9,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 656,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 10,
                    "endLine": 6,
                    "endOffset": 10,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 658,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 11,
                    "endLine": 6,
                    "endOffset": 11,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 660,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 12,
                    "endLine": 6,
                    "endOffset": 12,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 662,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 13,
                    "endLine": 6,
                    "endOffset": 13,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 664,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 14,
                    "endLine": 6,
                    "endOffset": 14,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 666,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 15,
                    "endLine": 6,
                    "endOffset": 15,
                    "insertString": " "
                  }
                },
                {
                  "seq": 667,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 16,
                    "endLine": 6,
                    "endOffset": 16,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 668,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 17
                  }
                },
                {
                  "seq": 670,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 17,
                    "endLine": 6,
                    "endOffset": 17,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 672,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 18,
                    "endLine": 6,
                    "endOffset": 18,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 674,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 19,
                    "endLine": 6,
                    "endOffset": 19,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 679,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 19,
                    "endLine": 6,
                    "endOffset": 20,
                    "insertString": ""
                  }
                },
                {
                  "seq": 683,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 18,
                    "endLine": 6,
                    "endOffset": 19,
                    "insertString": ""
                  }
                },
                {
                  "seq": 684,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 17,
                    "endLine": 6,
                    "endOffset": 18,
                    "insertString": ""
                  }
                },
                {
                  "seq": 685,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 16,
                    "endLine": 6,
                    "endOffset": 17,
                    "insertString": ""
                  }
                },
                {
                  "seq": 687,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 15,
                    "endLine": 6,
                    "endOffset": 16,
                    "insertString": ""
                  }
                },
                {
                  "seq": 693,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 15,
                    "endLine": 6,
                    "endOffset": 15,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 694,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 16
                  }
                },
                {
                  "seq": 696,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 16,
                    "endLine": 6,
                    "endOffset": 16,
                    "insertString": " "
                  }
                },
                {
                  "seq": 697,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 17,
                    "endLine": 6,
                    "endOffset": 17,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 698,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 18
                  }
                },
                {
                  "seq": 699,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 18,
                    "endLine": 6,
                    "endOffset": 18,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 700,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 19,
                    "endLine": 6,
                    "endOffset": 19,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 701,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 20,
                    "endLine": 6,
                    "endOffset": 20,
                    "insertString": "F"
                  }
                },
                {
                  "seq": 702,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 21,
                    "endLine": 6,
                    "endOffset": 21,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 703,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 22,
                    "endLine": 6,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 704,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 23,
                    "endLine": 6,
                    "endOffset": 23,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 705,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 24,
                    "endLine": 6,
                    "endOffset": 24,
                    "insertString": "C"
                  }
                },
                {
                  "seq": 706,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 25,
                    "endLine": 6,
                    "endOffset": 25,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 707,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 26,
                    "endLine": 6,
                    "endOffset": 26,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 708,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 27,
                    "endLine": 6,
                    "endOffset": 27,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 709,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 28
                  }
                },
                {
                  "seq": 710,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 28,
                    "endLine": 6,
                    "endOffset": 28,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 711,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 29
                  }
                },
                {
                  "seq": 712,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 29,
                    "endLine": 6,
                    "endOffset": 29,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 713,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 30
                  }
                },
                {
                  "seq": 714,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 30,
                    "endLine": 6,
                    "endOffset": 30,
                    "insertString": "()"
                  }
                },
                {
                  "seq": 722,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 31,
                    "endLine": 6,
                    "endOffset": 31,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 723,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 32
                  }
                },
                {
                  "seq": 724,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 32,
                    "endLine": 6,
                    "endOffset": 32,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 725,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 33,
                    "endLine": 6,
                    "endOffset": 33,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 726,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 34,
                    "endLine": 6,
                    "endOffset": 34,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 729,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 35,
                    "endLine": 6,
                    "endOffset": 35,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 730,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 36,
                    "endLine": 6,
                    "endOffset": 36,
                    "insertString": " "
                  }
                },
                {
                  "seq": 731,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 37,
                    "endLine": 6,
                    "endOffset": 37,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 732,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 38
                  }
                },
                {
                  "seq": 734,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 38,
                    "endLine": 6,
                    "endOffset": 38,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 736,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 39,
                    "endLine": 6,
                    "endOffset": 39,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 738,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 40,
                    "endLine": 6,
                    "endOffset": 40,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 740,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 41,
                    "endLine": 6,
                    "endOffset": 41,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 742,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 42,
                    "endLine": 6,
                    "endOffset": 42,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 747,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 43,
                    "endLine": 6,
                    "endOffset": 44,
                    "insertString": ")"
                  }
                },
                {
                  "seq": 748,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 44,
                    "endLine": 6,
                    "endOffset": 44,
                    "insertString": ":"
                  }
                },
                {
                  "seq": 749,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 45,
                    "endLine": 6,
                    "endOffset": 45,
                    "insertString": " "
                  }
                },
                {
                  "seq": 758,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 46,
                    "endLine": 6,
                    "endOffset": 46,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 759,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 47
                  }
                },
                {
                  "seq": 761,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 47,
                    "endLine": 6,
                    "endOffset": 47,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 763,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 48,
                    "endLine": 6,
                    "endOffset": 48,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 769,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 46,
                    "endLine": 6,
                    "endOffset": 49,
                    "insertString": ""
                  }
                },
                {
                  "seq": 771,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 46,
                    "endLine": 6,
                    "endOffset": 46,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 772,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 47
                  }
                },
                {
                  "seq": 774,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 47,
                    "endLine": 6,
                    "endOffset": 47,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 783,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 48,
                    "endLine": 6,
                    "endOffset": 48,
                    "insertString": "y"
                  }
                },
                {
                  "seq": 789,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 49,
                    "endLine": 6,
                    "endOffset": 49,
                    "insertString": " "
                  }
                },
                {
                  "seq": 790,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 50,
                    "endLine": 6,
                    "endOffset": 50,
                    "insertString": "{}"
                  }
                },
                {
                  "seq": 791,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 6,
                    "offset": 51,
                    "endLine": 6,
                    "endOffset": 51,
                    "insertString": "\n    \n"
                  }
                },
                {
                  "seq": 800,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 7,
                    "offset": 1,
                    "endLine": 7,
                    "endOffset": 5,
                    "insertString": ""
                  }
                },
                {
                  "seq": 806,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 1,
                    "endLine": 1,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 807,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 2,
                    "endOffset": 1,
                    "insertString": "/"
                  }
                },
                {
                  "seq": 808,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 2,
                    "endLine": 2,
                    "endOffset": 2,
                    "insertString": "*"
                  }
                },
                {
                  "seq": 809,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 3,
                    "endLine": 2,
                    "endOffset": 3,
                    "insertString": "* */"
                  }
                },
                {
                  "seq": 810,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 4,
                    "endLine": 2,
                    "endOffset": 4,
                    "insertString": "\n * \n * \n * @export\n * @param name \n * @param value \n"
                  }
                },
                {
                  "seq": 814,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 4,
                    "endLine": 3,
                    "endOffset": 4,
                    "insertString": "S"
                  }
                },
                {
                  "seq": 815,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 5,
                    "endLine": 3,
                    "endOffset": 5,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 816,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 6,
                    "endLine": 3,
                    "endOffset": 6,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 817,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 7,
                    "endLine": 3,
                    "endOffset": 7,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 818,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 8,
                    "endLine": 3,
                    "endOffset": 8,
                    "insertString": " "
                  }
                },
                {
                  "seq": 819,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 9,
                    "endLine": 3,
                    "endOffset": 9,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 820,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 10,
                    "endLine": 3,
                    "endOffset": 10,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 821,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 11,
                    "endLine": 3,
                    "endOffset": 11,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 822,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 12,
                    "endLine": 3,
                    "endOffset": 12,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 823,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 13,
                    "endLine": 3,
                    "endOffset": 13,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 824,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 14,
                    "endLine": 3,
                    "endOffset": 14,
                    "insertString": " "
                  }
                },
                {
                  "seq": 825,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 15,
                    "endLine": 3,
                    "endOffset": 15,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 826,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 16,
                    "endLine": 3,
                    "endOffset": 16,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 827,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 17,
                    "endLine": 3,
                    "endOffset": 17,
                    "insertString": " "
                  }
                },
                {
                  "seq": 828,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 18,
                    "endLine": 3,
                    "endOffset": 18,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 829,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 19,
                    "endLine": 3,
                    "endOffset": 19,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 830,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 20,
                    "endLine": 3,
                    "endOffset": 20,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 831,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 21,
                    "endLine": 3,
                    "endOffset": 21,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 832,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 22,
                    "endLine": 3,
                    "endOffset": 22,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 833,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 23,
                    "endLine": 3,
                    "endOffset": 23,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 837,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 18,
                    "endLine": 3,
                    "endOffset": 24,
                    "insertString": ""
                  }
                },
                {
                  "seq": 841,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 18,
                    "endLine": 3,
                    "endOffset": 18,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 842,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 19,
                    "endLine": 3,
                    "endOffset": 19,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 843,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 20,
                    "endLine": 3,
                    "endOffset": 20,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 844,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 21,
                    "endLine": 3,
                    "endOffset": 21,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 845,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 22,
                    "endLine": 3,
                    "endOffset": 22,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 846,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 23,
                    "endLine": 3,
                    "endOffset": 23,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 847,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 24,
                    "endLine": 3,
                    "endOffset": 24,
                    "insertString": " "
                  }
                },
                {
                  "seq": 853,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 18,
                    "endLine": 3,
                    "endOffset": 25,
                    "insertString": ""
                  }
                },
                {
                  "seq": 861,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 18,
                    "endLine": 3,
                    "endOffset": 18,
                    "insertString": "w"
                  }
                },
                {
                  "seq": 865,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 19,
                    "endLine": 3,
                    "endOffset": 19,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 866,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 20,
                    "endLine": 3,
                    "endOffset": 20,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 867,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 21,
                    "endLine": 3,
                    "endOffset": 21,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 868,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 22,
                    "endLine": 3,
                    "endOffset": 22,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 869,
                  "type": "request",
                  "command": "close",
                  "arguments": {
                    "file": "/users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts"
                  }
                },
                {
                  "seq": 870,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 23,
                    "endLine": 3,
                    "endOffset": 23,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 871,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 24,
                    "endLine": 3,
                    "endOffset": 24,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 872,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 25,
                    "endLine": 3,
                    "endOffset": 25,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 873,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 26,
                    "endLine": 3,
                    "endOffset": 26,
                    "insertString": " "
                  }
                },
                {
                  "seq": 874,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 27,
                    "endLine": 3,
                    "endOffset": 27,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 878,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 28,
                    "endLine": 3,
                    "endOffset": 28,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 879,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 28,
                    "endLine": 3,
                    "endOffset": 29,
                    "insertString": ""
                  }
                },
                {
                  "seq": 880,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 27,
                    "endLine": 3,
                    "endOffset": 28,
                    "insertString": ""
                  }
                },
                {
                  "seq": 881,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 27,
                    "endLine": 3,
                    "endOffset": 27,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 882,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 28,
                    "endLine": 3,
                    "endOffset": 28,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 883,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 29,
                    "endLine": 3,
                    "endOffset": 29,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 884,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 30,
                    "endLine": 3,
                    "endOffset": 30,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 885,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 31,
                    "endLine": 3,
                    "endOffset": 31,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 886,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 32,
                    "endLine": 3,
                    "endOffset": 32,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 887,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 33,
                    "endLine": 3,
                    "endOffset": 33,
                    "insertString": " "
                  }
                },
                {
                  "seq": 888,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 34,
                    "endLine": 3,
                    "endOffset": 34,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 889,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 35,
                    "endLine": 3,
                    "endOffset": 35,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 890,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 36,
                    "endLine": 3,
                    "endOffset": 36,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 891,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 37,
                    "endLine": 3,
                    "endOffset": 37,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 892,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 38,
                    "endLine": 3,
                    "endOffset": 38,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 893,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 39,
                    "endLine": 3,
                    "endOffset": 39,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 897,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 40,
                    "endLine": 3,
                    "endOffset": 40,
                    "insertString": "j"
                  }
                },
                {
                  "seq": 901,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 3,
                    "offset": 40,
                    "endLine": 3,
                    "endOffset": 41,
                    "insertString": ""
                  }
                },
                {
                  "seq": 905,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 12,
                    "offset": 1,
                    "endLine": 12,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 906,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 13,
                    "offset": 1,
                    "endLine": 13,
                    "endOffset": 1,
                    "insertString": "/"
                  }
                },
                {
                  "seq": 907,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 13,
                    "offset": 2,
                    "endLine": 13,
                    "endOffset": 2,
                    "insertString": "*"
                  }
                },
                {
                  "seq": 908,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 13,
                    "offset": 3,
                    "endLine": 13,
                    "endOffset": 3,
                    "insertString": "* */"
                  }
                },
                {
                  "seq": 909,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 13,
                    "offset": 4,
                    "endLine": 13,
                    "endOffset": 4,
                    "insertString": "\n * \n * \n * @export\n * @param name \n * @returns \n"
                  }
                },
                {
                  "seq": 913,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 4,
                    "endLine": 14,
                    "endOffset": 4,
                    "insertString": "G"
                  }
                },
                {
                  "seq": 914,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 5,
                    "endLine": 14,
                    "endOffset": 5,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 915,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 6,
                    "endLine": 14,
                    "endOffset": 6,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 916,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 7,
                    "endLine": 14,
                    "endOffset": 7,
                    "insertString": " "
                  }
                },
                {
                  "seq": 917,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 8,
                    "endLine": 14,
                    "endOffset": 8,
                    "insertString": "v"
                  }
                },
                {
                  "seq": 918,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 9,
                    "endLine": 14,
                    "endOffset": 9,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 919,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 10,
                    "endLine": 14,
                    "endOffset": 10,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 920,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 11,
                    "endLine": 14,
                    "endOffset": 11,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 921,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 12,
                    "endLine": 14,
                    "endOffset": 12,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 922,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 13,
                    "endLine": 14,
                    "endOffset": 13,
                    "insertString": " "
                  }
                },
                {
                  "seq": 923,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 14,
                    "endLine": 14,
                    "endOffset": 14,
                    "insertString": "f"
                  }
                },
                {
                  "seq": 924,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 15,
                    "endLine": 14,
                    "endOffset": 15,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 925,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 16,
                    "endLine": 14,
                    "endOffset": 16,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 926,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 17,
                    "endLine": 14,
                    "endOffset": 17,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 927,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 18,
                    "endLine": 14,
                    "endOffset": 18,
                    "insertString": " "
                  }
                },
                {
                  "seq": 928,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 19,
                    "endLine": 14,
                    "endOffset": 19,
                    "insertString": "w"
                  }
                },
                {
                  "seq": 929,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 20,
                    "endLine": 14,
                    "endOffset": 20,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 930,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 21,
                    "endLine": 14,
                    "endOffset": 21,
                    "insertString": "l"
                  }
                },
                {
                  "seq": 931,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 22,
                    "endLine": 14,
                    "endOffset": 22,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 932,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 23,
                    "endLine": 14,
                    "endOffset": 23,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 933,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 24,
                    "endLine": 14,
                    "endOffset": 24,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 934,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 25,
                    "endLine": 14,
                    "endOffset": 25,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 935,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 26,
                    "endLine": 14,
                    "endOffset": 26,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 936,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 27,
                    "endLine": 14,
                    "endOffset": 27,
                    "insertString": " "
                  }
                },
                {
                  "seq": 937,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 28,
                    "endLine": 14,
                    "endOffset": 28,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 940,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 28,
                    "endLine": 14,
                    "endOffset": 29,
                    "insertString": ""
                  }
                },
                {
                  "seq": 941,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 28,
                    "endLine": 14,
                    "endOffset": 28,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 942,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 29,
                    "endLine": 14,
                    "endOffset": 29,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 943,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 30,
                    "endLine": 14,
                    "endOffset": 30,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 944,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 31,
                    "endLine": 14,
                    "endOffset": 31,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 948,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 31,
                    "endLine": 14,
                    "endOffset": 32,
                    "insertString": ""
                  }
                },
                {
                  "seq": 949,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 30,
                    "endLine": 14,
                    "endOffset": 31,
                    "insertString": ""
                  }
                },
                {
                  "seq": 950,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 30,
                    "endLine": 14,
                    "endOffset": 30,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 951,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 31,
                    "endLine": 14,
                    "endOffset": 31,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 952,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 32,
                    "endLine": 14,
                    "endOffset": 32,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 953,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 33,
                    "endLine": 14,
                    "endOffset": 33,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 954,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 34,
                    "endLine": 14,
                    "endOffset": 34,
                    "insertString": " "
                  }
                },
                {
                  "seq": 955,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 35,
                    "endLine": 14,
                    "endOffset": 35,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 956,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 36,
                    "endLine": 14,
                    "endOffset": 36,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 957,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 37,
                    "endLine": 14,
                    "endOffset": 37,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 958,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 38,
                    "endLine": 14,
                    "endOffset": 38,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 959,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 39,
                    "endLine": 14,
                    "endOffset": 39,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 960,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 14,
                    "offset": 40,
                    "endLine": 14,
                    "endOffset": 40,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 964,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 10,
                    "offset": 1,
                    "endLine": 11,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 968,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 9,
                    "offset": 63,
                    "endLine": 9,
                    "endOffset": 63,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 972,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 10,
                    "offset": 1,
                    "endLine": 10,
                    "endOffset": 5,
                    "insertString": ""
                  }
                },
                {
                  "seq": 976,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 1,
                    "endLine": 22,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 977,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 20,
                    "offset": 51,
                    "endLine": 20,
                    "endOffset": 51,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 981,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 1,
                    "endLine": 21,
                    "endOffset": 5,
                    "insertString": ""
                  }
                },
                {
                  "seq": 985,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 1,
                    "endLine": 1,
                    "endOffset": 1,
                    "insertString": "\n"
                  }
                },
                {
                  "seq": 986,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 1,
                    "endLine": 1,
                    "endOffset": 1,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 987,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 2
                  }
                },
                {
                  "seq": 989,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 2,
                    "endLine": 1,
                    "endOffset": 2,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 991,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 3,
                    "endLine": 1,
                    "endOffset": 3,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 993,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 4,
                    "endLine": 1,
                    "endOffset": 4,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 995,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 5,
                    "endLine": 1,
                    "endOffset": 5,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 997,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 6,
                    "endLine": 1,
                    "endOffset": 6,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 999,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 7,
                    "endLine": 1,
                    "endOffset": 7,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1000,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 8,
                    "endLine": 1,
                    "endOffset": 8,
                    "insertString": "*"
                  }
                },
                {
                  "seq": 1001,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 9,
                    "endLine": 1,
                    "endOffset": 9,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1002,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 10,
                    "endLine": 1,
                    "endOffset": 10,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 1003,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 11
                  }
                },
                {
                  "seq": 1005,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 11,
                    "endLine": 1,
                    "endOffset": 11,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 1007,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 12,
                    "endLine": 1,
                    "endOffset": 12,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1011,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 13,
                    "endLine": 1,
                    "endOffset": 13,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 1012,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 14,
                    "endLine": 1,
                    "endOffset": 14,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1013,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 15,
                    "endLine": 1,
                    "endOffset": 15,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1014,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 16,
                    "endLine": 1,
                    "endOffset": 16,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 1015,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 17
                  }
                },
                {
                  "seq": 1016,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 17,
                    "endLine": 1,
                    "endOffset": 17,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1017,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 18,
                    "endLine": 1,
                    "endOffset": 18,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1018,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 19,
                    "endLine": 1,
                    "endOffset": 19,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1019,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 20,
                    "endLine": 1,
                    "endOffset": 20,
                    "insertString": "f"
                  }
                },
                {
                  "seq": 1020,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 21
                  }
                },
                {
                  "seq": 1022,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 21,
                    "endLine": 1,
                    "endOffset": 21,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 1024,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 22,
                    "endLine": 1,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1026,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 23,
                    "endLine": 1,
                    "endOffset": 23,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 1028,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 24,
                    "endLine": 1,
                    "endOffset": 24,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1029,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 25,
                    "endLine": 1,
                    "endOffset": 25,
                    "insertString": "\"\""
                  }
                },
                {
                  "seq": 1030,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 26,
                    "endLine": 1,
                    "endOffset": 26,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 1031,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 27,
                    "endLine": 1,
                    "endOffset": 27,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1032,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 28,
                    "endLine": 1,
                    "endOffset": 28,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1033,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 29,
                    "endLine": 1,
                    "endOffset": 29,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 1034,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 30,
                    "endLine": 1,
                    "endOffset": 30,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1035,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 31,
                    "endLine": 1,
                    "endOffset": 31,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1036,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 32,
                    "endLine": 1,
                    "endOffset": 33,
                    "insertString": "\""
                  }
                },
                {
                  "seq": 1037,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 1,
                    "offset": 33,
                    "endLine": 1,
                    "endOffset": 33,
                    "insertString": ";"
                  }
                },
                {
                  "seq": 1042,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 1,
                    "endLine": 23,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1043,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 51,
                    "endLine": 21,
                    "endOffset": 51,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 1076,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1077,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 46,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 1078,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 47
                  }
                },
                {
                  "seq": 1079,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 47,
                    "endLine": 21,
                    "endOffset": 47,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 1080,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 48,
                    "endLine": 21,
                    "endOffset": 48,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1081,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1082,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 50,
                    "endLine": 21,
                    "endOffset": 50,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 1086,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 50,
                    "endLine": 21,
                    "endOffset": 51,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1087,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 50,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1088,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 48,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1089,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 48,
                    "endLine": 21,
                    "endOffset": 48,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 1090,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49
                  }
                },
                {
                  "seq": 1092,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1094,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 50,
                    "endLine": 21,
                    "endOffset": 50,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1096,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 51,
                    "endLine": 21,
                    "endOffset": 51,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 1098,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 52,
                    "endLine": 21,
                    "endOffset": 52,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1099,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 53,
                    "endLine": 21,
                    "endOffset": 53,
                    "insertString": "|"
                  }
                },
                {
                  "seq": 1100,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 54,
                    "endLine": 21,
                    "endOffset": 54,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1101,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 55,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 1102,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 56
                  }
                },
                {
                  "seq": 1103,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 56,
                    "endLine": 21,
                    "endOffset": 56,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1104,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 57,
                    "insertString": "UniversalLinkData"
                  }
                },
                {
                  "seq": 1105,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 2,
                    "endOffset": 1,
                    "insertString": "import { UniversalLinkData } from \"cordova-universal-links-plugin/index\";\n"
                  }
                },
                {
                  "seq": 1109,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 67,
                    "endLine": 22,
                    "endOffset": 72,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1110,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 55,
                    "endLine": 22,
                    "endOffset": 66,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1111,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 55,
                    "endLine": 22,
                    "endOffset": 55,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 1112,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 2,
                    "offset": 1,
                    "endLine": 3,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1113,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 57,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1114,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 56,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1115,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 53,
                    "endLine": 21,
                    "endOffset": 54,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1116,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 53,
                    "endLine": 21,
                    "endOffset": 54,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1117,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 52,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1118,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 46,
                    "insertString": "any"
                  }
                },
                {
                  "seq": 1122,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1123,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 46,
                    "endLine": 21,
                    "endOffset": 46,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 1124,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 47
                  }
                },
                {
                  "seq": 1126,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 47,
                    "endLine": 21,
                    "endOffset": 47,
                    "insertString": "t"
                  }
                },
                {
                  "seq": 1128,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 48,
                    "endLine": 21,
                    "endOffset": 48,
                    "insertString": "r"
                  }
                },
                {
                  "seq": 1129,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1134,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 50,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1138,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 49,
                    "endLine": 21,
                    "endOffset": 49,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1139,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 50
                  }
                },
                {
                  "seq": 1140,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 50,
                    "endLine": 21,
                    "endOffset": 50,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1141,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 51,
                    "endLine": 21,
                    "endOffset": 51,
                    "insertString": "g"
                  }
                },
                {
                  "seq": 1142,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 52,
                    "endLine": 21,
                    "endOffset": 52,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1143,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 53,
                    "endLine": 21,
                    "endOffset": 53,
                    "insertString": "|"
                  }
                },
                {
                  "seq": 1144,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 54,
                    "endLine": 21,
                    "endOffset": 54,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1148,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 55,
                    "insertString": "u"
                  }
                },
                {
                  "seq": 1149,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 56
                  }
                },
                {
                  "seq": 1151,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 56,
                    "endLine": 21,
                    "endOffset": 56,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1153,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 57,
                    "endLine": 21,
                    "endOffset": 57,
                    "insertString": "d"
                  }
                },
                {
                  "seq": 1155,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 58,
                    "endLine": 21,
                    "endOffset": 58,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1157,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 55,
                    "endLine": 21,
                    "endOffset": 59,
                    "insertString": "undefined"
                  }
                },
                {
                  "seq": 1161,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 21,
                    "endLine": 22,
                    "endOffset": 21,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 1162,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 22
                  }
                },
                {
                  "seq": 1163,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 22,
                    "endLine": 22,
                    "endOffset": 22,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1164,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 23,
                    "endLine": 22,
                    "endOffset": 23,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1165,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 24,
                    "endLine": 22,
                    "endOffset": 24,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 1166,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 25,
                    "endLine": 22,
                    "endOffset": 25,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1169,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 26,
                    "endLine": 22,
                    "endOffset": 26,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1173,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 27,
                    "endLine": 22,
                    "endOffset": 27,
                    "insertString": "s"
                  }
                },
                {
                  "seq": 1174,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 28
                  }
                },
                {
                  "seq": 1179,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 21,
                    "endLine": 22,
                    "endOffset": 28,
                    "insertString": "cookies"
                  }
                },
                {
                  "seq": 1180,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 28,
                    "endLine": 22,
                    "endOffset": 28,
                    "insertString": "."
                  }
                },
                {
                  "seq": 1181,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 29
                  }
                },
                {
                  "seq": 1185,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 28,
                    "endLine": 22,
                    "endOffset": 29,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1186,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 27,
                    "endLine": 22,
                    "endOffset": 28,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1188,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 27,
                    "endLine": 22,
                    "endOffset": 27,
                    "insertString": "."
                  }
                },
                {
                  "seq": 1189,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 28
                  }
                },
                {
                  "seq": 1195,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 28,
                    "endLine": 22,
                    "endOffset": 28,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 1197,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 29,
                    "endLine": 22,
                    "endOffset": 29,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 1261,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 1,
                    "endLine": 23,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1275,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 21,
                    "offset": 66,
                    "endLine": 21,
                    "endOffset": 66,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 1284,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 5,
                    "endLine": 22,
                    "endOffset": 5,
                    "insertString": "n"
                  }
                },
                {
                  "seq": 1285,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 6
                  }
                },
                {
                  "seq": 1286,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 6,
                    "endLine": 22,
                    "endOffset": 6,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 1287,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 7,
                    "endLine": 22,
                    "endOffset": 7,
                    "insertString": "m"
                  }
                },
                {
                  "seq": 1288,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 8,
                    "endLine": 22,
                    "endOffset": 8,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1289,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 9,
                    "endLine": 22,
                    "endOffset": 9,
                    "insertString": "."
                  }
                },
                {
                  "seq": 1290,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 10
                  }
                },
                {
                  "seq": 1294,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 10
                  }
                },
                {
                  "seq": 1296,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 9,
                    "endLine": 22,
                    "endOffset": 10,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1299,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 9,
                    "endLine": 22,
                    "endOffset": 9,
                    "insertString": "."
                  }
                },
                {
                  "seq": 1300,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 10
                  }
                },
                {
                  "seq": 1304,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 10
                  }
                },
                {
                  "seq": 1305,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 1,
                    "endLine": 23,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1319,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 10,
                    "offset": 63,
                    "endLine": 10,
                    "endOffset": 63,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 1322,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 11,
                    "offset": 5,
                    "endLine": 11,
                    "endOffset": 5,
                    "insertString": " "
                  }
                },
                {
                  "seq": 1323,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 11,
                    "offset": 6,
                    "endLine": 11,
                    "endOffset": 6,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 1324,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 11,
                    "offset": 7
                  }
                },
                {
                  "seq": 1328,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 11,
                    "offset": 6,
                    "endLine": 11,
                    "endOffset": 7,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1329,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 11,
                    "offset": 5,
                    "endLine": 11,
                    "endOffset": 6,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1368,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 1,
                    "endLine": 24,
                    "endOffset": 1,
                    "insertString": ""
                  }
                },
                {
                  "seq": 1372,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 22,
                    "offset": 66,
                    "endLine": 22,
                    "endOffset": 66,
                    "insertString": "\n    "
                  }
                },
                {
                  "seq": 1373,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 5,
                    "endLine": 23,
                    "endOffset": 5,
                    "insertString": "c"
                  }
                },
                {
                  "seq": 1374,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 6
                  }
                },
                {
                  "seq": 1376,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 6,
                    "endLine": 23,
                    "endOffset": 6,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1378,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 7,
                    "endLine": 23,
                    "endOffset": 7,
                    "insertString": "o"
                  }
                },
                {
                  "seq": 1380,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 8,
                    "endLine": 23,
                    "endOffset": 8,
                    "insertString": "k"
                  }
                },
                {
                  "seq": 1382,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 9,
                    "endLine": 23,
                    "endOffset": 9,
                    "insertString": "i"
                  }
                },
                {
                  "seq": 1384,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 10,
                    "endLine": 23,
                    "endOffset": 10,
                    "insertString": "e"
                  }
                },
                {
                  "seq": 1386,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 11,
                    "endLine": 23,
                    "endOffset": 11,
                    "insertString": "."
                  }
                },
                {
                  "seq": 1387,
                  "type": "request",
                  "command": "completions",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 12
                  }
                },
                {
                  "seq": 1394,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 12,
                    "endLine": 23,
                    "endOffset": 12,
                    "insertString": "p"
                  }
                },
                {
                  "seq": 1396,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 13,
                    "endLine": 23,
                    "endOffset": 13,
                    "insertString": "a"
                  }
                },
                {
                  "seq": 1401,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 12,
                    "endLine": 23,
                    "endOffset": 14,
                    "insertString": "parse"
                  }
                },
                {
                  "seq": 1404,
                  "type": "request",
                  "command": "change",
                  "arguments": {
                    "file": "/Users/asvetl/work/applications/frontend/src/app/utils/Cookie.ts",
                    "line": 23,
                    "offset": 17,
                    "endLine": 23,
                    "endOffset": 17,
                    "insertString": "()"
                  }
                }
            ];

            for (const e of events) {
                sess.onMessage(JSON.stringify(e));
                console.log(lastWrittenToHost);
            }
        });
    });

    class DumbSession extends ts.server.Session {
        constructor() {
            const typingsInstaller: ts.server.ITypingsInstaller = {
                enqueueInstallTypingsRequest() {},
                attach() {},
                onProjectClosed() {},
                globalTypingsCacheLocation: "",
            };
            const options: ts.server.SessionOptions = {
                host: mockHost,
                cancellationToken: nullCancellationToken,
                useSingleInferredProject: true,
                typingsInstaller,
                byteLength: Utils.byteLength,
                hrtime(): never { throw new Error(); },
                logger: mockLogger,
                canUseEvents: false,
                //eventHandler: notImplemented,
                //throttleWaitMilliseconds: 0,
            };
            super(options);
        }
    }
}
