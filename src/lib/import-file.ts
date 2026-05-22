import { parseFloExport, type ImportPreview } from '@/lib/import';
import { isFloTextExport, parseFloText } from '@/lib/import-text';

/**
 * Parse an uploaded Flo export, auto-detecting JSON vs the plain-text (.txt)
 * format Flo emails. Throws a friendly error if neither parser can read it.
 */
export function parseFloFile(fileName: string, text: string): ImportPreview {
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  const isTxt = /\.txt$/i.test(fileName);

  // Try JSON first when it looks like JSON or has a .json name.
  if (looksJson && !isTxt) {
    try {
      return parseFloExport(JSON.parse(trimmed));
    } catch {
      // fall through to text detection
    }
  }

  if (isFloTextExport(text)) {
    return parseFloText(text);
  }

  // Last resort: maybe it's JSON with a misleading extension.
  if (looksJson) {
    try {
      return parseFloExport(JSON.parse(trimmed));
    } catch {
      /* ignore */
    }
  }

  throw new Error(
    "We couldn't read that file. Upload the Flo export you received — either the .json or the .txt file."
  );
}
