// Small English stop-word list: words that carry no meaning for matching
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'as', 'is', 'are', 'was', 'be', 'been', 'it', 'this', 'that', 'these', 'those',
  'i', 'we', 'you', 'my', 'our', 'your', 'can', 'will', 'need', 'needs', 'want', 'build',
  'looking', 'using', 'use', 'new', 'good', 'work', 'project'
]);

// lowercase, keep letters and digits, drop stop words, trim a plural "s"
const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));

// Returns an array: cosine similarity between queryText and each text in docTexts
exports.similarities = (queryText, docTexts) => {
  const docs = [queryText, ...docTexts].map(tokenize);
  const N = docs.length;

  // document frequency: in how many texts does each word appear?
  const df = new Map();
  docs.forEach((tokens) => {
    new Set(tokens).forEach((w) => df.set(w, (df.get(w) || 0) + 1));
  });

  // smoothed IDF so a word found in every text still has a small positive weight
  const idf = (w) => Math.log((1 + N) / (1 + df.get(w))) + 1;

  // TF-IDF vector for one text, stored as word -> weight
  const vectorize = (tokens) => {
    const counts = new Map();
    tokens.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
    const vec = new Map();
    counts.forEach((count, w) => vec.set(w, (count / tokens.length) * idf(w)));
    return vec;
  };

  const norm = (vec) => Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0));

  const cosine = (a, b) => {
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return 0;
    let dot = 0;
    a.forEach((v, w) => {
      if (b.has(w)) dot += v * b.get(w);
    });
    return dot / (na * nb);
  };

  const vectors = docs.map((t) => (t.length ? vectorize(t) : new Map()));
  return vectors.slice(1).map((v) => cosine(vectors[0], v));
};