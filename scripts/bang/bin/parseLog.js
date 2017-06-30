"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseLog(log) {
    const events = [];
    const scn = new Scanner(log);
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
exports.default = parseLog;
class Scanner {
    constructor(s) {
        this.s = s;
        this.index = 0;
    }
    done() {
        return this.index === this.s.length;
    }
    tryEat(expected) {
        if (this.s.startsWith(expected, this.index)) {
            this.index += expected.length;
            return true;
        }
        return false;
    }
    cur() {
        if (this.index == this.s.length)
            throw new Error();
        return this.s[this.index];
    }
    skipNumber() {
        while (/\d/.test(this.cur())) {
            this.index++;
        }
    }
    skipSpaces() {
        while (this.cur() === " ") {
            this.index++;
        }
    }
    takeRestOfLine() {
        const start = this.index;
        this.skipRestOfLine();
        return this.s.slice(start, this.index - 1);
    }
    skipRestOfLine() {
        while (this.cur() !== "\n")
            this.index++;
        this.index++;
    }
}
//# sourceMappingURL=parseLog.js.map