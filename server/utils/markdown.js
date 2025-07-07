
export function convertMarkdownToPlainText(mdContent) {
  let plainText = mdContent;

  // Replace headers (# Header, ## Header, etc.)
  plainText = plainText.replace(/^#+\s+(.*?)$/gm, (match, headerText) => {
    return headerText.toUpperCase();
  });

  // Replace bold text (**text** or __text__)
  plainText = plainText.replace(/(\*\*|__)(.*?)\1/g, "$2");

  // Replace italic text (*text* or _text_)
  plainText = plainText.replace(/(\*|_)(.*?)\1/g, "$2");

  // Replace inline code (`code`)
  plainText = plainText.replace(/`([^`]+)`/g, "$1");

  // Replace code blocks
  plainText = plainText.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```(?:\w+)?\n([\s\S]*?)```/g, "$1");
  });

  // Replace links [text](url)
  plainText = plainText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Replace unordered list items
  plainText = plainText.replace(/^\s*[-*+]\s+(.*?)$/gm, "• $1");

  // Replace ordered list items
  plainText = plainText.replace(/^\s*\d+\.\s+(.*?)$/gm, (match, listItem) => {
    return `• ${listItem}`;
  });

  // Replace horizontal rules
  plainText = plainText.replace(/^\s*[-*_]{3,}\s*$/gm, "\n----------\n");

  // Handle blockquotes
  plainText = plainText.replace(/^\s*>\s+(.*?)$/gm, '"$1"');

  // Normalize whitespace
  plainText = plainText.replace(/\n{3,}/g, "\n\n");

  return plainText;
}
