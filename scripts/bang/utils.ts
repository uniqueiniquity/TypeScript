import ts = require("../../built/local/tsserverlibrary");

const notImplemented = (): never => { throw new Error(); }
const host: ts.server.ServerHost = {
	args: [],
	newLine: "\n",
	useCaseSensitiveFileNames: true,
	write: notImplemented,
	readFile(fileName): string {
		return "";
	},
	writeFile: notImplemented,
	resolvePath: notImplemented,
	fileExists: () => false,
	directoryExists: () => false,
	getDirectories: () => [],
	createDirectory: notImplemented,
	getExecutingFilePath: () => "",
	getCurrentDirectory: () => "",
	//getEnvironmentVariable: () => "",
	readDirectory: () => [],
	exit: notImplemented,
	setTimeout: () => 0,
	clearTimeout: notImplemented,
	setImmediate: () => 0,
	clearImmediate: notImplemented,
	createHash: s => `hash_${s}`,
	//TODO: https://github.com/Microsoft/TypeScript/issues/16776
	watchDirectory: () => {
		return { close() {} };
	},
};

const txt = new ts.server.TextStorage(host, "" as ts.server.NormalizedPath);

//const s = new ts.server.ScriptVersionCache();

//NOTE: working under the assumption that it's OK to get a new scriptinfo every time.
export class Changer {
	private text = "";

	constructor() {
		//this.li.load([]); // start w/ empty file
	}

	change(change: Change) {
		//console.log(change);
		let { line, offset, endLine, endOffset, insertString } = change;
		line--;
		endLine--;
		offset--;
		endOffset--;

		const text = this.text;
		const pos = lineAndCharacterToPosition(text, line, offset);
		const endPos = lineAndCharacterToPosition(text, endLine, endOffset);
		this.text = text.slice(0, pos) + insertString + text.slice(endPos);

		txt.edit(pos, endPos, insertString);
		//s.edit(pos, endPos - pos, insertString);
	}

	getText(start: number, end: number) {
		const x = txt.getSnapshot();
		throw new Error("TODO");
		//x.getChangeRange(
		//x.getText(1, 1);
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
