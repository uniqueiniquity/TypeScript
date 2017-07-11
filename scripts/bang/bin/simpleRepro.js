"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_1 = require("fs");
const ts = require("../../../built/local/tsserverlibrary");
main(fs_1.readFileSync("/home/andy/Downloads/tsserver.log", "utf-8"));
function main(log) {
    let text = "";
    let onlyFile;
    function checkFile(f) {
        f = f.toLowerCase();
        if (onlyFile === undefined)
            onlyFile = f;
        else
            assert(f === onlyFile);
    }
    for (const rq of getRequestsFromLog(log)) {
        switch (rq.command) {
            case "open":
                checkFile(rq.arguments.file);
                text = rq.arguments.fileContent;
                assert(typeof text === "string");
                break;
            case "change":
                checkFile(rq.arguments.file);
                console.log(rq.arguments);
                text = doChange(text, rq.arguments);
                break;
        }
    }
}
function doChange(text, { line, offset, endLine, endOffset, insertString }) {
    ts;
    const start = lineAndOffsetToPos(text, line - 1, offset - 1);
    const end = lineAndOffsetToPos(text, endLine - 1, endOffset - 1);
    assert(start >= 0);
    assert(start <= end);
    assert(end <= text.length);
    return text.slice(0, start) + insertString + text.slice(end);
}
function lineAndOffsetToPos(text, zeroBasedLine, zeroBasedColumn) {
    const lines = text.split("\n");
    let pos = 0;
    for (let i = 0; i < zeroBasedLine; i++) {
        pos += lines[i].length + 1; //+1 for the "\n"
    }
    const res = pos + zeroBasedColumn;
    assert(res === ts.computePositionOfLineAndCharacter(ts.computeLineStarts(text), zeroBasedLine, zeroBasedColumn));
    return res;
}
function* getRequestsFromLog(log) {
    const events = parseLog(log);
    for (const event of events) {
        if (event.type !== "request" || !event.text.includes("Cookie.ts"))
            continue;
        if (event.text.includes("870")) {
            debugger;
        }
        const request = JSON.parse(event.text);
        if (request.command === "open" || request.command === "change")
            yield request;
    }
}
function* parseLog(log) {
    class Scanner {
        constructor(str) {
            this.str = str;
            this.index = 0;
        }
        get done() {
            return this.index === this.str.length;
        }
        tryEat(expected) {
            if (this.str.startsWith(expected, this.index)) {
                this.index += expected.length;
                return true;
            }
            return false;
        }
        get cur() {
            if (this.index == this.str.length)
                throw new Error();
            return this.str[this.index];
        }
        skipNumber() {
            while (/\d/.test(this.cur))
                this.index++;
        }
        skipSpaces() {
            while (this.cur === " ")
                this.index++;
        }
        takeRestOfLine() {
            const start = this.index;
            this.skipRestOfLine();
            return this.str.slice(start, this.index - 1);
        }
        skipRestOfLine() {
            while (this.cur !== "\n")
                this.index++;
            this.index++;
        }
    }
    const scn = new Scanner(log);
    while (!scn.done) {
        if (scn.tryEat("Info ")) {
            scn.skipNumber();
            scn.skipSpaces();
            if (scn.tryEat("request: ")) {
                yield { type: "request", text: scn.takeRestOfLine() };
            }
            else if (scn.tryEat("response: ")) {
                yield { type: "response", text: scn.takeRestOfLine() };
            }
            else if (scn.tryEat("event: ")) {
                yield { type: "event", text: scn.takeRestOfLine() };
            }
            else {
                scn.skipRestOfLine();
            }
        }
        else {
            scn.skipRestOfLine();
        }
    }
}
//# sourceMappingURL=simpleRepro.js.map