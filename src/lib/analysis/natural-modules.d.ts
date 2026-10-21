/**
 * BOUNDLESS · ambient type declarations for `natural` deep sub-modules
 * ─────────────────────────────────────────────────────────────────
 * We deliberately avoid `import ... from "natural"` (the package root):
 * it eagerly requires wordnet → mongoose → mongodb → bson, which both
 * bloats the Next.js server bundle and crashes under the Bun runtime
 * (`node:v8 isBuildingSnapshot` is not implemented). The sub-modules used
 * below are dependency-light and work identically in Node and Bun.
 * These hand-written declarations describe exactly the surface we use.
 */

declare module "natural/lib/natural/stemmers/porter_stemmer" {
  const PorterStemmer: {
    stem(token: string): string;
    tokenizeAndStem(text: string, keepStops?: boolean): string[];
  };
  export default PorterStemmer;
}

declare module "natural/lib/natural/tokenizers/regexp_tokenizer" {
  export class WordTokenizer {
    constructor(options?: { pattern?: RegExp });
    tokenize(text: string): string[];
  }
  export class RegexpTokenizer {
    constructor(options?: { pattern?: RegExp });
    tokenize(text: string): string[];
  }
}

declare module "natural/lib/natural/tokenizers/sentence_tokenizer" {
  export default class SentenceTokenizer {
    tokenize(text: string): string[];
  }
}

declare module "natural/lib/natural/tfidf/tfidf" {
  export default class TfIdf {
    documents: Array<Record<string, number>>;
    addDocument(
      document: string | string[] | Record<string, string>,
      key?: unknown,
      restoreCache?: boolean
    ): void;
    idf(term: string, force?: boolean): number;
    tfidf(terms: string | string[], d: number): number;
    listTerms(d: number): Array<{ term: string; tf: number; idf: number; tfidf: number }>;
  }
}

declare module "natural/lib/natural/distance/jaro-winkler_distance" {
  export default function JaroWinklerDistance(
    s1: string,
    s2: string,
    options?: { ignoreCase?: boolean; dj?: number }
  ): number;
}
