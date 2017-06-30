"use strict";
exports.__esModule = true;
var ts = require("../../../built/local/tsserverlibrary");
var notImplemented = function () { throw new Error(); };
var fileBeenRead = false;
var host = {
    readFile: function (fileName) {
        if (fileBeenRead)
            throw new Error();
        fileBeenRead = true;
        return "";
    },
    getCurrentDirectory: function () { return ""; },
    newLine: "\n",
    writeFile: notImplemented
};
var C3 = (function () {
    function C3() {
        this.txt = new ts.server.TextStorage(host, "a.ts");
    }
    C3.prototype.change = function (change) {
        var txt = this.txt;
        var line = change.line, offset = change.offset, endLine = change.endLine, endOffset = change.endOffset, insertString = change.insertString;
        var start = txt.lineOffsetToPosition(line, offset);
        var end = txt.lineOffsetToPosition(endLine, endOffset);
        txt.edit(start, end, insertString);
    };
    C3.prototype.getText = function () {
        var txt = this.txt;
        var snap = txt.getSnapshot();
        var change = snap.getChangeRange(this.prevSnapshot);
        if (change) {
            snap.getText(change.span.start, change.span.start + change.span.length);
        }
        else {
            snap.getText(0, 0);
        }
        this.prevSnapshot = snap;
    };
    return C3;
}());
exports.C3 = C3;
var C4 = (function () {
    function C4() {
        this.svc = ts.server.ScriptVersionCache.fromString(host, "");
        this.correctText = "";
    }
    C4.prototype.change = function (change) {
        var svc = this.svc;
        var line = change.line, offset = change.offset, endLine = change.endLine, endOffset = change.endOffset, insertString = change.insertString;
        var index = svc.getSnapshot().index;
        var lineInfo = index.lineNumberToInfo(line);
        //TODO: assert this offset is actually on the line
        var start = index.lineNumberToInfo(line).offset + offset - 1;
        var end = index.lineNumberToInfo(endLine).offset + endOffset - 1;
        var correctStart = lineAndOffsetToPos(this.correctText, line - 1, offset - 1);
        var correctEnd = lineAndOffsetToPos(this.correctText, endLine - 1, endOffset - 1);
        if (start !== correctStart)
            throw new Error();
        if (end !== correctEnd)
            throw new Error();
        svc.edit(start, end - start, insertString);
        this.correctText = correctChange(this.correctText, correctStart, correctEnd, insertString);
    };
    C4.prototype.getText = function () {
        var svc = this.svc;
        var snap = svc.getSnapshot();
        var change = snap.getChangeRange(this.prevSnapshot);
        var start;
        var end;
        if (change) {
            start = change.span.start;
            end = start + change.span.length;
        }
        else {
            start = end = 0;
        }
        var text = snap.getText(start, end);
        if (text !== this.correctText) {
            console.log(JSON.stringify(text));
            console.log(JSON.stringify(this.correctText));
            throw new Error();
        }
        this.prevSnapshot = snap;
    };
    return C4;
}());
exports.C4 = C4;
function correctChange(text, start, end, insertString) {
    return text.slice(0, start) + insertString + text.slice(end);
}
function lineAndOffsetToPos(text, line, offset) {
    var lines = text.split("\n");
    var pos = 0;
    for (var i = 0; i < line; i++) {
        pos += lines[i].length + 1; //+1 for the "\n"
    }
    var res = pos + offset;
    if (res !== lineAndCharacterToPosition(text, line, offset)) {
        throw new Error("!");
    }
    return res;
}
//const s = new ts.server.ScriptVersionCache();
//NOTE: working under the assumption that it's OK to get a new scriptinfo every time.
var ChangerOld = (function () {
    function ChangerOld() {
        this.text = "";
        this.txt = new ts.server.TextStorage(host, "");
        //this.li.load([]); // start w/ empty file
    }
    ChangerOld.prototype.change = function (change) {
        var line = change.line, offset = change.offset, endLine = change.endLine, endOffset = change.endOffset, insertString = change.insertString;
        line--;
        endLine--;
        offset--;
        endOffset--;
        var text = this.text;
        var pos = lineAndCharacterToPosition(text, line, offset);
        var endPos = lineAndCharacterToPosition(text, endLine, endOffset);
        this.text = text.slice(0, pos) + insertString + text.slice(endPos);
        this.txt.edit(pos, endPos, insertString);
    };
    ChangerOld.prototype.getText = function () {
        var snp = this.txt.getSnapshot();
        var change = snp.getChangeRange(this.prevSnapshot);
        console.log(this.prevSnapshot, change);
        if (change) {
            console.log("!");
            var start = change.span.start;
            var length = change.span.length;
            snp.getText(start, start + length);
        }
        else {
            snp.getText(0, 0);
        }
        this.prevSnapshot = snp;
    };
    return ChangerOld;
}());
exports.ChangerOld = ChangerOld;
//const txt = new ts.server.TextStorage(
function lineAndCharacterToPosition(text, line, offset) {
    var lineStarts = ts.computeLineStarts(text);
    return ts.computePositionOfLineAndCharacter(lineStarts, line, offset);
}
function mapDefined(xs, f) {
    var out = [];
    for (var _i = 0, xs_1 = xs; _i < xs_1.length; _i++) {
        var x = xs_1[_i];
        var res = f(x);
        if (res !== undefined) {
            out.push(res);
        }
    }
    return out;
}
//# sourceMappingURL=utils.js.map