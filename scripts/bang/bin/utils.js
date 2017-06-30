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
var C2 = (function () {
    function C2() {
        this.si = new ts.server.ScriptInfo(host, "a.ts", 3 /* TS */);
    }
    C2.prototype.change = function (change) {
        var si = this.si;
        var line = change.line, offset = change.offset, endLine = change.endLine, endOffset = change.endOffset, insertString = change.insertString;
        var start = si.lineOffsetToPosition(line, offset);
        var end = si.lineOffsetToPosition(endLine, endOffset);
        si.editContent(start, end, insertString);
    };
    C2.prototype.getText = function () {
        var si = this.si;
        var snp = si.getSnapshot();
        var change = snp.getChangeRange(this.prevSnapshot);
        if (change) {
            snp.getText(change.span.start, change.span.start + change.span.length);
        }
        else {
            snp.getText(0, 0);
        }
        this.prevSnapshot = snp;
    };
    return C2;
}());
exports.C2 = C2;
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