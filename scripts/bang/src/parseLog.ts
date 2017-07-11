export type LogEvent =
    | { type: "request", text: string }
    | { type: "event", text: string }
    | { type: "response", text: string };

export default function parseLog(log: string): LogEvent[] {
    const events: LogEvent[] = [];
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
            const ln = scn.takeRestOfLine();//foo();
            //if (ln.indexOf("'charCount'") !== -1)
            //    break;
        }
    }

    function foo(): void {
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

class Scanner {
    private index = 0;
    constructor(private readonly s: string) {}

    done() {
        return this.index === this.s.length;
    }

    tryEat(expected: string) {
        if (this.s.startsWith(expected, this.index)) {
            this.index += expected.length;
            return true;
        }
        return false;
    }

    private cur() {
        if (this.index == this.s.length) throw new Error();
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
        while (this.cur() !== "\n") this.index++;
        this.index++;
    }
}
