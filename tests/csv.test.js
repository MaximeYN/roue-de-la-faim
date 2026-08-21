import { describe, it, expect } from "vitest";
import { parseCSV } from "../src/csv.js";

describe("parseCSV", () => {
  it("parses simple comma-separated rows", () => {
    const result = parseCSV("a,b\n1,2");
    expect(result).toEqual([{ a: "1", b: "2" }]);
  });

  it("parses a quoted field containing a comma", () => {
    const result = parseCSV('name,cuisine\n"Bap Time","Korean, fast food"');
    expect(result).toEqual([{ name: "Bap Time", cuisine: "Korean, fast food" }]);
  });

  it("parses a quoted field containing an embedded newline", () => {
    const result = parseCSV('name,comment\n"Resto A","Super\nrapide"');
    expect(result).toEqual([{ name: "Resto A", comment: "Super\nrapide" }]);
  });

  it("unescapes doubled double-quotes", () => {
    const result = parseCSV('name,note\n"Le ""Bon"" Coin",5');
    expect(result).toEqual([{ name: 'Le "Bon" Coin', note: "5" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const result = parseCSV("a,b\r\n1,2\r\n3,4");
    expect(result).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });
});
