"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("../../../built/local/tsserverlibrary");
const notImplemented = () => { throw new Error(); };
let fileBeenRead = false;
const host = {
    readFile(fileName) {
        if (fileBeenRead)
            throw new Error();
        fileBeenRead = true;
        return "";
    },
    getCurrentDirectory: () => "",
    newLine: "\n",
    writeFile: notImplemented,
};
class C3 {
    constructor() {
        this.txt = new ts.server.TextStorage(host, "a.ts");
    }
    change(change) {
        const { txt } = this;
        let { line, offset, endLine, endOffset, insertString } = change;
        const start = txt.lineOffsetToPosition(line, offset);
        const end = txt.lineOffsetToPosition(endLine, endOffset);
        txt.edit(start, end, insertString);
    }
    getText() {
        const { txt } = this;
        const snap = txt.getSnapshot();
        const change = snap.getChangeRange(this.prevSnapshot);
        if (change) {
            snap.getText(change.span.start, change.span.start + change.span.length);
        }
        else {
            snap.getText(0, 0);
        }
        this.prevSnapshot = snap;
    }
}
exports.C3 = C3;
class C4C5 {
    constructor() {
        this.correctText = "";
        this.svc = this.SVC.fromString("");
    }
    change(change) {
        const { svc } = this;
        let { line, offset, endLine, endOffset, insertString } = change;
        const index = svc.getSnapshot().index;
        //TODO: assert this offset is actually on the line
        const start = index.lineNumberToInfo(line).absolutePosition + offset - 1;
        const end = index.lineNumberToInfo(endLine).absolutePosition + endOffset - 1;
        const correctStart = lineAndOffsetToPos(this.correctText, line - 1, offset - 1);
        const correctEnd = lineAndOffsetToPos(this.correctText, endLine - 1, endOffset - 1);
        if (start !== correctStart)
            throw new Error();
        if (end !== correctEnd)
            throw new Error();
        svc.edit(start, end - start, insertString);
        this.correctText = correctChange(this.correctText, correctStart, correctEnd, insertString);
    }
    getText() {
        const { svc } = this;
        const snap = svc.getSnapshot();
        const change = snap.getChangeRange(this.prevSnapshot);
        let start;
        let end;
        if (change) {
            start = change.span.start;
            end = start + change.span.length;
        }
        else {
            start = end = 0;
        }
        const text = snap.getText(start, end);
        if (text !== this.correctText.slice(start, end)) {
            console.log(JSON.stringify(text));
            console.log(JSON.stringify(this.correctText));
            throw new Error();
        }
        this.prevSnapshot = snap;
    }
}
exports.C4C5 = C4C5;
class C4 extends C4C5 {
    get SVC() { return ts.server.ScriptVersionCache; }
}
exports.C4 = C4;
class CheapoScriptVersionCache {
    constructor() {
        this.changes = [];
        this.versions = [];
        this.currentVersion = 0;
    }
    edit(pos, deleteLen, insertedText) {
        this.changes.push(new ts.server.TextChange(pos, deleteLen, insertedText));
    }
    getSnapshot() {
        let snap = this.versions[this.currentVersion];
        if (this.changes.length > 0) {
            let snapIndex = snap.index;
            for (const change of this.changes) {
                snapIndex = snapIndex.edit(change.pos, change.deleteLen, change.insertedText);
            }
            snap = new ts.server.LineIndexSnapshot(this.currentVersion + 1, this, snapIndex, this.changes);
            this.currentVersion = snap.version;
            this.versions[this.currentVersion] = snap;
            this.changes = [];
        }
        return snap;
    }
    getTextChangesBetweenVersions(oldVersion, newVersion) {
        if (oldVersion >= newVersion)
            throw new Error();
        const textChangeRanges = [];
        for (let i = oldVersion + 1; i <= newVersion; i++) {
            const snap = this.versions[i];
            for (const textChange of snap.changesSincePreviousVersion) {
                textChangeRanges[textChangeRanges.length] = textChange.getTextChangeRange(); //isn't this just push?
            }
        }
        return ts.collapseTextChangeRangesAcrossMultipleVersions(textChangeRanges);
    }
    static fromString(host, script) {
        const svc = new CheapoScriptVersionCache();
        const index = new ts.server.LineIndex();
        index.load(ts.server.LineIndex.linesFromText(script).lines);
        const snap = new ts.server.LineIndexSnapshot(0, svc, index);
        svc.versions[svc.currentVersion] = snap;
        svc.host = host;
        return svc;
    }
}
exports.CheapoScriptVersionCache = CheapoScriptVersionCache;
class C5 extends C4 {
    get SVC() { return CheapoScriptVersionCache; }
}
exports.C5 = C5;
//Mimics ScriptVersionCache class
class C6 {
    constructor() {
        this.correctText = "";
        this.versions = [];
        this.currentVersion = 0;
        this.changes = [];
        const outer = this;
        const index = new ts.server.LineIndex();
        index.load(ts.server.LineIndex.linesFromText("").lines);
        const snap = new ts.server.LineIndexSnapshot(0, this, index);
        this.versions[this.currentVersion] = snap;
    }
    getSnapshot() {
        let snap = this.versions[this.currentVersion];
        if (this.changes.length > 0) {
            if (this.changes.length !== 1)
                throw new Error(JSON.stringify(this.changes));
            let snapIndex = snap.index;
            for (const change of this.changes) {
                snapIndex = snapIndex.edit(change.pos, change.deleteLen, change.insertedText);
            }
            snap = new ts.server.LineIndexSnapshot(this.currentVersion + 1, this, snapIndex, this.changes);
            this.currentVersion = snap.version;
            this.versions[this.currentVersion] = snap;
            this.changes = [];
        }
        return snap;
    }
    getTextChangesBetweenVersions(oldVersion, newVersion) {
        console.log({ oldVersion, newVersion });
        if (oldVersion >= newVersion)
            throw new Error("???");
        const textChangeRanges = [];
        for (let i = oldVersion + 1; i <= newVersion; i++) {
            const snap = this.versions[i];
            for (const textChange of snap.changesSincePreviousVersion) {
                textChangeRanges[textChangeRanges.length] = textChange.getTextChangeRange();
            }
        }
        return ts.collapseTextChangeRangesAcrossMultipleVersions(textChangeRanges);
    }
    change(change) {
        console.log("CHANGE:", change);
        let { line, offset, endLine, endOffset, insertString } = change; //Note: these are all 1-based.
        let snap = this.getSnapshot();
        let index = snap.index;
        //lineNumberToInfo takes a 1-based line number. But remember to decrement offset.
        const start = index.lineNumberToInfo(line).absolutePosition + (offset - 1);
        const end = index.lineNumberToInfo(endLine).absolutePosition + (endOffset - 1);
        const correctStart = lineAndOffsetToPos(this.correctText, line - 1, offset - 1);
        const correctEnd = lineAndOffsetToPos(this.correctText, endLine - 1, endOffset - 1);
        if (start !== correctStart)
            throw new Error();
        if (end !== correctEnd)
            throw new Error();
        this.changes.push(new ts.server.TextChange(start, end - start, insertString));
        this.correctText = correctChange(this.correctText, correctStart, correctEnd, insertString);
    }
    getText() {
        const snap = this.getSnapshot();
        const change = snap.getChangeRange(this.prevSnapshot);
        let start;
        let end;
        if (change) {
            start = change.span.start;
            end = start + change.span.length;
        }
        else {
            start = end = 0;
        }
        const text = snap.getText(start, end);
        if (text !== this.correctText.slice(start, end)) {
            console.log(JSON.stringify(text));
            console.log(JSON.stringify(this.correctText));
            throw new Error();
        }
        this.prevSnapshot = snap;
    }
}
exports.C6 = C6;
function correctChange(text, start, end, insertString) {
    return text.slice(0, start) + insertString + text.slice(end);
}
function lineAndOffsetToPos(text, zeroBasedLine, zeroBasedColumn) {
    const lines = text.split("\n");
    let pos = 0;
    for (let i = 0; i < zeroBasedLine; i++) {
        pos += lines[i].length + 1; //+1 for the "\n"
    }
    const res = pos + zeroBasedColumn;
    if (res !== lineAndColumnToPosition(text, zeroBasedLine, zeroBasedColumn)) {
        throw new Error("!");
    }
    return res;
}
//const s = new ts.server.ScriptVersionCache();
//NOTE: working under the assumption that it's OK to get a new scriptinfo every time.
class ChangerOld {
    constructor() {
        this.text = "";
        this.txt = new ts.server.TextStorage(host, "");
        //this.li.load([]); // start w/ empty file
    }
    change(change) {
        let { line, offset, endLine, endOffset, insertString } = change;
        //make them zero-based
        line--;
        endLine--;
        offset--;
        endOffset--;
        const text = this.text;
        const pos = lineAndColumnToPosition(text, line, offset);
        const endPos = lineAndColumnToPosition(text, endLine, endOffset);
        this.text = text.slice(0, pos) + insertString + text.slice(endPos);
        this.txt.edit(pos, endPos, insertString);
    }
    getText() {
        const snp = this.txt.getSnapshot();
        const change = snp.getChangeRange(this.prevSnapshot);
        //console.log(this.prevSnapshot, change);
        if (change) {
            //console.log("!");
            const start = change.span.start;
            const length = change.span.length;
            snp.getText(start, start + length);
        }
        else {
            snp.getText(0, 0);
        }
        this.prevSnapshot = snp;
    }
}
exports.ChangerOld = ChangerOld;
//const txt = new ts.server.TextStorage(
function lineAndColumnToPosition(text, zeroBasedLine, zeroBasedColumn) {
    const lineStarts = ts.computeLineStarts(text);
    return ts.computePositionOfLineAndCharacter(lineStarts, zeroBasedLine, zeroBasedColumn);
}
function mapDefined(xs, f) {
    const out = [];
    for (const x of xs) {
        const res = f(x);
        if (res !== undefined) {
            out.push(res);
        }
    }
    return out;
}
//# sourceMappingURL=utils.js.map