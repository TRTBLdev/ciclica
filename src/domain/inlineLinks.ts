export type InlineLinkToken =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

const INLINE_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const isAllowedLink = (href: string) => {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(href).protocol.toLowerCase());
  } catch {
    return false;
  }
};

export const parseInlineLinks = (text: string): InlineLinkToken[] => {
  const tokens: InlineLinkToken[] = [];
  let cursor = 0;
  const pushText = (value: string) => {
    if (!value) return;
    const previous = tokens[tokens.length - 1];
    if (previous?.type === 'text') {
      previous.value += value;
    } else {
      tokens.push({ type: 'text', value });
    }
  };

  for (const match of text.matchAll(INLINE_LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      pushText(text.slice(cursor, index));
    }

    const [raw, label, href] = match;
    if (isAllowedLink(href)) {
      tokens.push({ type: 'link', label, href });
    } else {
      pushText(raw);
    }
    cursor = index + raw.length;
  }

  if (cursor < text.length) {
    pushText(text.slice(cursor));
  }

  return tokens;
};
