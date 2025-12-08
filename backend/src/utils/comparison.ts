interface ComparisonOptions {
    fuzzyThreshold?: number;
    ignoreCase?: boolean;
    ignorePunctuation?: boolean;
    ignoreWhitespace?: boolean;
}

const defaultOptions: ComparisonOptions = {
    fuzzyThreshold: 0.8,
    ignoreCase: true,
    ignorePunctuation: true,
    ignoreWhitespace: true,
};

/**
 * Normalize text for comparison
 */
function normalizeText(text: string, options: ComparisonOptions): string {
    let normalized = text;

    if (options.ignoreCase) {
        normalized = normalized.toLowerCase();
    }

    if (options.ignorePunctuation) {
        normalized = normalized.replace(/[^\w\s]/g, '');
    }

    if (options.ignoreWhitespace) {
        normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0 to 1)
 */
export function calculateSimilarity(str1: string, str2: string, options: ComparisonOptions = {}): number {
    const opts = { ...defaultOptions, ...options };

    const normalized1 = normalizeText(str1, opts);
    const normalized2 = normalizeText(str2, opts);

    if (normalized1 === normalized2) {
        return 1.0;
    }

    if (normalized1.length === 0 || normalized2.length === 0) {
        return 0.0;
    }

    const distance = levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    return 1 - distance / maxLength;
}

/**
 * Check if two responses match based on comparison options
 */
export function responsesMatch(
    expected: string,
    actual: string,
    options: ComparisonOptions = {}
): { matched: boolean; score: number } {
    const opts = { ...defaultOptions, ...options };
    const score = calculateSimilarity(expected, actual, opts);

    return {
        matched: score >= (opts.fuzzyThreshold || 0.8),
        score,
    };
}

/**
 * Check if two intents match
 */
export function intentsMatch(expected: string | null, actual: string | null): boolean {
    if (!expected) return true; // No expected intent means any intent is acceptable
    if (!actual) return false;

    // Normalize intent names
    const normalizedExpected = expected.toLowerCase().replace(/\./g, '_');
    const normalizedActual = actual.toLowerCase().replace(/\./g, '_');

    return normalizedExpected === normalizedActual;
}

/**
 * Deep compare two objects for parameter matching
 */
export function parametersMatch(
    expected: Record<string, unknown> | null,
    actual: Record<string, unknown> | null
): { matched: boolean; differences: string[] } {
    if (!expected) return { matched: true, differences: [] };
    if (!actual) return { matched: false, differences: ['No parameters extracted'] };

    const differences: string[] = [];

    function compare(exp: unknown, act: unknown, path: string): void {
        if (typeof exp !== typeof act) {
            differences.push(`${path}: Type mismatch (expected ${typeof exp}, got ${typeof act})`);
            return;
        }

        if (exp === null || act === null) {
            if (exp !== act) {
                differences.push(`${path}: Value mismatch (expected ${exp}, got ${act})`);
            }
            return;
        }

        if (Array.isArray(exp)) {
            if (!Array.isArray(act)) {
                differences.push(`${path}: Expected array, got ${typeof act}`);
                return;
            }
            if (exp.length !== act.length) {
                differences.push(`${path}: Array length mismatch (expected ${exp.length}, got ${act.length})`);
            }
            exp.forEach((item, index) => {
                compare(item, act[index], `${path}[${index}]`);
            });
            return;
        }

        if (typeof exp === 'object') {
            const expObj = exp as Record<string, unknown>;
            const actObj = act as Record<string, unknown>;

            Object.keys(expObj).forEach((key) => {
                if (!(key in actObj)) {
                    differences.push(`${path}.${key}: Missing in actual`);
                } else {
                    compare(expObj[key], actObj[key], `${path}.${key}`);
                }
            });
            return;
        }

        if (exp !== act) {
            differences.push(`${path}: Value mismatch (expected ${exp}, got ${act})`);
        }
    }

    Object.keys(expected).forEach((key) => {
        compare(expected[key], actual[key], key);
    });

    return {
        matched: differences.length === 0,
        differences,
    };
}
