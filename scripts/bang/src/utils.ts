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


export class C2 {
	private si = new ts.server.ScriptInfo(host, "a.ts" as any, ts.ScriptKind.TS);
	private prevSnapshot: ts.IScriptSnapshot;

	constructor() {
	}

	change(change: Change) {
		const { si } = this;
		let { line, offset, endLine, endOffset, insertString } = change;

		const start = si.lineOffsetToPosition(line, offset);
		const end = si.lineOffsetToPosition(endLine, endOffset);
		si.editContent(start, end, insertString);
	}

	getText() {
		const { si } = this;
		const snp = si.getSnapshot();
		const change = snp.getChangeRange(this.prevSnapshot);

		if (change) {
			snp.getText(change.span.start, change.span.start + change.span.length);
		} else {
			snp.getText(0, 0);
		}

		this.prevSnapshot = snp;
	}
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
