"use strict";
exports.__esModule = true;
function parseLog(log) {
    var events = [];
    var scn = new Scanner(log);
    while (!scn.done()) {
        if (scn.tryEat("Info ")) {
            scn.skipNumber();
            scn.skipSpaces();
            foo();
        }
        else {
            //Sometimes there is `request:` *not* preceded by "Info: ".
            //e.g. line 29698
            //TODO: find out why!
            scn.skipRestOfLine(); //foo();
        }
    }
    function foo() {
        if (scn.tryEat("request: ")) {
            events.push({ type: "request", text: scn.takeRestOfLine() });
        }
        else if (scn.tryEat("response: ")) {
            events.push({ type: "response", text: scn.takeRestOfLine() });
        }
        else if (scn.tryEat("event: ")) {
            events.push({ type: "event", text: scn.takeRestOfLine() });
        }
        else {
            scn.skipRestOfLine();
        }
    }
    return events;
}
exports["default"] = parseLog;
var Scanner = (function () {
    function Scanner(s) {
        this.s = s;
        this.index = 0;
    }
    Scanner.prototype.done = function () {
        return this.index === this.s.length;
    };
    Scanner.prototype.tryEat = function (expected) {
        if (this.s.startsWith(expected, this.index)) {
            this.index += expected.length;
            return true;
        }
        return false;
    };
    Scanner.prototype.cur = function () {
        if (this.index == this.s.length)
            throw new Error();
        return this.s[this.index];
    };
    Scanner.prototype.skipNumber = function () {
        while (/\d/.test(this.cur())) {
            this.index++;
        }
    };
    Scanner.prototype.skipSpaces = function () {
        while (this.cur() === " ") {
            this.index++;
        }
    };
    Scanner.prototype.takeRestOfLine = function () {
        var start = this.index;
        this.skipRestOfLine();
        return this.s.slice(start, this.index - 1);
    };
    Scanner.prototype.skipRestOfLine = function () {
        while (this.cur() !== "\n")
            this.index++;
        this.index++;
    };
    return Scanner;
}());
//# sourceMappingURL=parseLog.js.map