/**
 * Calculates the Levenshtein distance between two strings.
 * Lower distance means more similar strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const m = s1.length;
  const n = s2.length;
  
  // Create a matrix to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Finds the best matching string from a list of options.
 * Returns null if no good match is found.
 * Uses a lower threshold (0.25) to be more tolerant of typos.
 */
export function findBestMatch(
  input: string, 
  options: { id: string; name: string }[]
): { id: string; name: string; score: number } | null {
  if (!input.trim() || options.length === 0) return null;
  
  const normalizedInput = input.toLowerCase().trim();
  
  // First, try exact match
  const exactMatch = options.find(
    opt => opt.name.toLowerCase() === normalizedInput
  );
  if (exactMatch) {
    return { ...exactMatch, score: 1 };
  }
  
  // Then, try "contains" match (input is part of option or vice versa)
  const containsMatch = options.find(
    opt => opt.name.toLowerCase().includes(normalizedInput) ||
           normalizedInput.includes(opt.name.toLowerCase())
  );
  if (containsMatch) {
    return { ...containsMatch, score: 0.8 };
  }

  // Try "starts with" match on any word in the option name
  const startsWithMatch = options.find(opt => {
    const words = opt.name.toLowerCase().split(/\s+/);
    return words.some(word => word.startsWith(normalizedInput) || normalizedInput.startsWith(word));
  });
  if (startsWithMatch) {
    return { ...startsWithMatch, score: 0.7 };
  }
  
  // Finally, use Levenshtein distance with a lower threshold
  let bestMatch: { id: string; name: string; score: number } | null = null;
  let minDistance = Infinity;
  
  for (const option of options) {
    const distance = levenshteinDistance(normalizedInput, option.name);
    const maxLength = Math.max(normalizedInput.length, option.name.length);
    const similarity = 1 - distance / maxLength;
    
    // Lower threshold to 0.25 to catch more typos
    if (distance < minDistance && similarity >= 0.25) {
      minDistance = distance;
      bestMatch = { ...option, score: similarity };
    }
  }
  
  return bestMatch;
}

/**
 * Get all matching options that meet a minimum similarity threshold.
 * Useful for showing suggestions to the user.
 */
export function findAllMatches(
  input: string,
  options: { id: string; name: string }[],
  minSimilarity: number = 0.2
): { id: string; name: string; score: number }[] {
  if (!input.trim() || options.length === 0) return [];
  
  const normalizedInput = input.toLowerCase().trim();
  const matches: { id: string; name: string; score: number }[] = [];
  
  for (const option of options) {
    const optName = option.name.toLowerCase();
    
    // Exact match
    if (optName === normalizedInput) {
      matches.push({ ...option, score: 1 });
      continue;
    }
    
    // Contains match
    if (optName.includes(normalizedInput) || normalizedInput.includes(optName)) {
      matches.push({ ...option, score: 0.8 });
      continue;
    }

    // Starts with match on any word
    const words = optName.split(/\s+/);
    if (words.some(word => word.startsWith(normalizedInput) || normalizedInput.startsWith(word))) {
      matches.push({ ...option, score: 0.7 });
      continue;
    }
    
    // Levenshtein similarity
    const distance = levenshteinDistance(normalizedInput, option.name);
    const maxLength = Math.max(normalizedInput.length, option.name.length);
    const similarity = 1 - distance / maxLength;
    
    if (similarity >= minSimilarity) {
      matches.push({ ...option, score: similarity });
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
