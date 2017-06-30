import ts = require("../../../built/local/tsserverlibrary");

const notImplemented = (): never => { throw new Error(); }
let fileBeenRead = false;
const host: ts.server.ScriptInfoHost = {
	readFile(fileName): string {
		if (fileBeenRead) throw new Error();
		fileBeenRead = true;
		return "";
	},
	getCurrentDirectory: () => "",
	newLine: "\n",
	writeFile: notImplemented,
};

export class C3 {
	private txt = new ts.server.TextStorage(host, "a.ts" as ts.server.NormalizedPath);
	private prevSnapshot: ts.IScriptSnapshot;

	change(change: Change) {
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
		} else {
			snap.getText(0, 0);
		}

		this.prevSnapshot = snap;
	}
}

export class C4 {
	private svc = ts.server.ScriptVersionCache.fromString(host, "");
	private prevSnapshot: ts.IScriptSnapshot;
	private correctText = "";

	change(change: Change) {
		const { svc } = this;
		let { line, offset, endLine, endOffset, insertString } = change;
		const index = svc.getSnapshot().index;
		const lineInfo = index.lineNumberToInfo(line);

		//TODO: assert this offset is actually on the line
		const start = index.lineNumberToInfo(line).offset + offset - 1;
		const end = index.lineNumberToInfo(endLine).offset + endOffset - 1;

		const correctStart = lineAndOffsetToPos(this.correctText, line - 1, offset - 1);
		const correctEnd = lineAndOffsetToPos(this.correctText, endLine - 1, endOffset - 1);

		if (start !== correctStart) throw new Error();
		if (end !== correctEnd) throw new Error();

		svc.edit(start, end - start, insertString);

		this.correctText = correctChange(this.correctText, correctStart, correctEnd, insertString);
	}

	getText() {
		const { svc } = this;
		const snap = svc.getSnapshot();
		const change = snap.getChangeRange(this.prevSnapshot);

		let start: number;
		let end: number;
		if (change) {
			start = change.span.start;
			end = start + change.span.length;
		} else {
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

function correctChange(text: string, start: number, end: number, insertString: string) {
	return text.slice(0, start) + insertString + text.slice(end);
}

function lineAndOffsetToPos(text: string, line: number, offset: number) {
	const lines = text.split("\n");
	let pos = 0;

	for (let i = 0; i < line; i++) {
		pos += lines[i].length + 1; //+1 for the "\n"
	}

	const res = pos + offset;

	if (res !== lineAndCharacterToPosition(text, line, offset)) {
		throw new Error("!");
	}

	return res;
}


//const s = new ts.server.ScriptVersionCache();

//NOTE: working under the assumption that it's OK to get a new scriptinfo every time.
export class ChangerOld {
	private text = "";
	private prevSnapshot: ts.IScriptSnapshot;
	private txt = new ts.server.TextStorage(host, "" as ts.server.NormalizedPath);

	constructor() {
		//this.li.load([]); // start w/ empty file
	}

	change(change: Change) {
		let { line, offset, endLine, endOffset, insertString } = change;
		line--;
		endLine--;
		offset--;
		endOffset--;

		const text = this.text;
		const pos = lineAndCharacterToPosition(text, line, offset);
		const endPos = lineAndCharacterToPosition(text, endLine, endOffset);
		this.text = text.slice(0, pos) + insertString + text.slice(endPos);

		this.txt.edit(pos, endPos, insertString);
	}

	getText() {
		const snp = this.txt.getSnapshot();
		const change = snp.getChangeRange(this.prevSnapshot)!;
		console.log(this.prevSnapshot, change);
		if (change) {
			console.log("!");
			const start = change.span.start;
			const length = change.span.length;
			snp.getText(start, start + length);
		} else {
			snp.getText(0, 0);
		}
		this.prevSnapshot = snp;
	}
}

export interface Change {
	line: number;
	offset: number;
	endLine: number;
	endOffset: number;
	insertString: string;
}

//const txt = new ts.server.TextStorage(
function lineAndCharacterToPosition(text: string, line: number, offset: number): number {
	const lineStarts = ts.computeLineStarts(text);
	return ts.computePositionOfLineAndCharacter(lineStarts, line, offset);
}

function mapDefined<T, U>(xs: T[], f: (t: T) => U | undefined): U[] {
	const out: U[] = [];
	for (const x of xs) {
		const res = f(x);
		if (res !== undefined) {
			out.push(res);
		}
	}
	return out;
}
