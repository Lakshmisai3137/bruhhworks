import { SABOTAGE_DATA } from "../../data/sabotageData";

export function generateStupidIdea() {
  const { prefixes, subjects, taglines } = SABOTAGE_DATA.startupTemplates;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const tagline = taglines[Math.floor(Math.random() * taglines.length)];
  return {
    title: `${prefix} ${subject}`,
    tagline: tagline,
  };
}

export function isGibberish(text: string): boolean {
  if (!text || text.length < 3) return false;
  const words = text.split(/\s+/);
  if (words.length === 0) return true;

  // Simple rule: low dictionary word ratio (mocked for now, but checking for random character patterns)
  const randomPattern = /[^a-zA-Z0-9\s]/g;
  const nonAlphaCount = (text.match(randomPattern) || []).length;
  if (nonAlphaCount / text.length > 0.3) return true;

  // Check for long strings of same characters
  if (/(.)\1{4,}/.test(text)) return true;

  // Check for lack of vowels in long words
  const longWords = words.filter(w => w.length > 5);
  const vowelLess = longWords.filter(w => !/[aeiouy]/i.test(w));
  if (vowelLess.length / longWords.length > 0.5) return true;

  return false;
}

export function generateGibberishResponse(input: string): string {
  const syllables = ["ba", "ga", "da", "zo", "mi", "lu", "ka", "fi", "re", "po", "sha", "vro", "glip", "glop", "zorp", "blep"];
  const words = input.split(/\s+/);
  const responseWords = words.map(() => {
    const syllableCount = Math.floor(Math.random() * 3) + 1;
    let word = "";
    for (let i = 0; i < syllableCount; i++) {
      word += syllables[Math.floor(Math.random() * syllables.length)];
    }
    return word;
  });

  // Add some punctuation and capitalization to mirror structure
  const result = responseWords.map((w, i) => {
    if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
    if (i === responseWords.length - 1) return w + (Math.random() > 0.5 ? "!" : "?");
    return w;
  }).join(" ");

  return `${result} ${result.toUpperCase()}!!!`;
}
