export const MAX_PLAQUE_CHARACTERS = 160;
export const MAX_PLAQUE_LINES = 7;
export const MAX_PLAQUE_LINE_UNITS = 32;

function splitLongWord(word: string) {
  const characters = Array.from(word);
  const parts: string[] = [];

  while (characters.length > MAX_PLAQUE_LINE_UNITS) {
    parts.push(characters.splice(0, MAX_PLAQUE_LINE_UNITS).join(""));
  }

  if (characters.length) {
    parts.push(characters.join(""));
  }

  return parts;
}

export function getPlaqueLines(message: string) {
  if (!message) {
    return [""];
  }

  return message.split("\n").flatMap((paragraph) => {
    if (!paragraph.trim()) {
      return [""];
    }

    const words = paragraph.trim().split(/\s+/).flatMap(splitLongWord);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (Array.from(candidate).length <= MAX_PLAQUE_LINE_UNITS) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  });
}

export function isPlaqueMessageValid(message: string) {
  return (
    Array.from(message).length <= MAX_PLAQUE_CHARACTERS &&
    getPlaqueLines(message).length <= MAX_PLAQUE_LINES
  );
}
