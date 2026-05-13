import type { DatabaseRow, NotionDatabase, Property } from "./types";

/**
 * Very small formula evaluator (subset of Notion Formula 2.0):
 *   - prop("Name") returns the value of the property by name
 *   - basic arithmetic + - * / %
 *   - if(cond, a, b)
 *   - concat(a, b, ...)
 *   - length(x)
 *   - now() returns timestamp
 *   - dateBetween(a, b) returns diff in days
 *   - true / false / null
 *
 * Implementation is a simple recursive descent parser. Safe (no eval).
 */

type FormulaValue = string | number | boolean | null;

class FormulaError extends Error {}

interface Context {
  row: DatabaseRow;
  database: NotionDatabase;
}

export function evaluateFormula(expr: string, row: DatabaseRow, database: NotionDatabase): FormulaValue {
  try {
    const parser = new Parser(expr);
    const ast = parser.parseExpression();
    if (!parser.atEnd()) throw new FormulaError("Trailing tokens");
    return evaluate(ast, { row, database });
  } catch (e) {
    return `#ERR: ${(e as Error).message}`;
  }
}

// ------- Parser -------

type Token = { kind: "num" | "str" | "id" | "punct" | "op"; value: string; pos: number };

class Parser {
  tokens: Token[] = [];
  pos = 0;

  constructor(src: string) {
    this.tokens = this.tokenize(src);
  }

  tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') {
        let s = "";
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === "\\" && i + 1 < src.length) {
            s += src[i + 1]; i += 2; continue;
          }
          s += src[i]; i++;
        }
        i++;
        tokens.push({ kind: "str", value: s, pos: i });
        continue;
      }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
        let s = "";
        while (i < src.length && /[0-9.]/.test(src[i])) { s += src[i]; i++; }
        tokens.push({ kind: "num", value: s, pos: i });
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let s = "";
        while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; i++; }
        tokens.push({ kind: "id", value: s, pos: i });
        continue;
      }
      if ("+-*/%".includes(c)) { tokens.push({ kind: "op", value: c, pos: i }); i++; continue; }
      if ("(),".includes(c)) { tokens.push({ kind: "punct", value: c, pos: i }); i++; continue; }
      if (c === "=") {
        if (src[i + 1] === "=") { tokens.push({ kind: "op", value: "==", pos: i }); i += 2; continue; }
      }
      if (c === "!") {
        if (src[i + 1] === "=") { tokens.push({ kind: "op", value: "!=", pos: i }); i += 2; continue; }
      }
      if (c === ">") {
        if (src[i + 1] === "=") { tokens.push({ kind: "op", value: ">=", pos: i }); i += 2; continue; }
        tokens.push({ kind: "op", value: ">", pos: i }); i++; continue;
      }
      if (c === "<") {
        if (src[i + 1] === "=") { tokens.push({ kind: "op", value: "<=", pos: i }); i += 2; continue; }
        tokens.push({ kind: "op", value: "<", pos: i }); i++; continue;
      }
      throw new FormulaError(`Unexpected char: ${c}`);
    }
    return tokens;
  }

  peek() { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }
  atEnd() { return this.pos >= this.tokens.length; }

  parseExpression(): AstNode {
    return this.parseEquality();
  }

  parseEquality(): AstNode {
    let left = this.parseComparison();
    while (!this.atEnd() && (this.peek().value === "==" || this.peek().value === "!=")) {
      const op = this.consume().value;
      const right = this.parseComparison();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  parseComparison(): AstNode {
    let left = this.parseAddSub();
    while (!this.atEnd() && ([">", "<", ">=", "<="].includes(this.peek().value))) {
      const op = this.consume().value;
      const right = this.parseAddSub();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  parseAddSub(): AstNode {
    let left = this.parseMulDiv();
    while (!this.atEnd() && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  parseMulDiv(): AstNode {
    let left = this.parseUnary();
    while (!this.atEnd() && (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  parseUnary(): AstNode {
    if (!this.atEnd() && this.peek().value === "-") {
      this.consume();
      return { kind: "neg", value: this.parsePrimary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): AstNode {
    const tok = this.consume();
    if (!tok) throw new FormulaError("Unexpected end");
    if (tok.kind === "num") return { kind: "num", value: parseFloat(tok.value) };
    if (tok.kind === "str") return { kind: "str", value: tok.value };
    if (tok.kind === "punct" && tok.value === "(") {
      const inner = this.parseExpression();
      const close = this.consume();
      if (!close || close.value !== ")") throw new FormulaError("Expected )");
      return inner;
    }
    if (tok.kind === "id") {
      if (tok.value === "true") return { kind: "bool", value: true };
      if (tok.value === "false") return { kind: "bool", value: false };
      if (tok.value === "null") return { kind: "null" };
      // function call
      if (!this.atEnd() && this.peek().value === "(") {
        this.consume(); // (
        const args: AstNode[] = [];
        while (!this.atEnd() && this.peek().value !== ")") {
          args.push(this.parseExpression());
          if (this.peek()?.value === ",") this.consume();
        }
        if (this.consume()?.value !== ")") throw new FormulaError("Expected )");
        return { kind: "call", name: tok.value, args };
      }
      return { kind: "id", value: tok.value };
    }
    throw new FormulaError(`Unexpected token ${tok.value}`);
  }
}

type AstNode =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "null" }
  | { kind: "id"; value: string }
  | { kind: "neg"; value: AstNode }
  | { kind: "bin"; op: string; left: AstNode; right: AstNode }
  | { kind: "call"; name: string; args: AstNode[] };

function evaluate(node: AstNode, ctx: Context): FormulaValue {
  switch (node.kind) {
    case "num": return node.value;
    case "str": return node.value;
    case "bool": return node.value;
    case "null": return null;
    case "id": return node.value;
    case "neg": {
      const v = evaluate(node.value, ctx);
      return -Number(v ?? 0);
    }
    case "bin": {
      const l = evaluate(node.left, ctx);
      const r = evaluate(node.right, ctx);
      if (node.op === "+") {
        if (typeof l === "string" || typeof r === "string") return `${l}${r}`;
        return Number(l ?? 0) + Number(r ?? 0);
      }
      if (node.op === "-") return Number(l ?? 0) - Number(r ?? 0);
      if (node.op === "*") return Number(l ?? 0) * Number(r ?? 0);
      if (node.op === "/") return Number(l ?? 0) / Number(r ?? 0);
      if (node.op === "%") return Number(l ?? 0) % Number(r ?? 0);
      if (node.op === "==") return l === r;
      if (node.op === "!=") return l !== r;
      if (node.op === ">") return Number(l) > Number(r);
      if (node.op === "<") return Number(l) < Number(r);
      if (node.op === ">=") return Number(l) >= Number(r);
      if (node.op === "<=") return Number(l) <= Number(r);
      throw new FormulaError(`Unknown op ${node.op}`);
    }
    case "call": {
      const args = node.args.map((a) => evaluate(a, ctx));
      switch (node.name) {
        case "prop": {
          const name = args[0];
          const prop = ctx.database.properties.find((p) => p.name === name);
          if (!prop) return null;
          const v = ctx.row.values?.[prop.id];
          return (v as FormulaValue) ?? null;
        }
        case "if": {
          return args[0] ? args[1] : args[2];
        }
        case "concat": {
          return args.map((a) => String(a ?? "")).join("");
        }
        case "length": {
          const v = args[0];
          return v == null ? 0 : String(v).length;
        }
        case "now": return Date.now();
        case "dateBetween": {
          const a = args[0] ? Date.parse(String(args[0])) : NaN;
          const b = args[1] ? Date.parse(String(args[1])) : NaN;
          if (isNaN(a) || isNaN(b)) return null;
          return Math.round((a - b) / (1000 * 60 * 60 * 24));
        }
        case "round": return Math.round(Number(args[0] ?? 0));
        case "floor": return Math.floor(Number(args[0] ?? 0));
        case "ceil": return Math.ceil(Number(args[0] ?? 0));
        case "abs": return Math.abs(Number(args[0] ?? 0));
        case "min": return Math.min(...args.map((a) => Number(a ?? 0)));
        case "max": return Math.max(...args.map((a) => Number(a ?? 0)));
        case "upper": return String(args[0] ?? "").toUpperCase();
        case "lower": return String(args[0] ?? "").toLowerCase();
        case "contains": return String(args[0] ?? "").includes(String(args[1] ?? ""));
        case "replace": return String(args[0] ?? "").replace(String(args[1] ?? ""), String(args[2] ?? ""));
        case "slice": return String(args[0] ?? "").slice(Number(args[1] ?? 0), Number(args[2] ?? undefined));
        case "format": return String(args[0] ?? "");
        case "toNumber": return Number(args[0] ?? 0);
        default:
          throw new FormulaError(`Unknown function ${node.name}`);
      }
    }
  }
}
