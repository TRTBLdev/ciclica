import { describe, expect, it } from 'vitest';
import { parseInlineLinks } from './inlineLinks';

describe('parseInlineLinks', () => {
  it('recognizes a standard Markdown link with spaces in its title and a query string', () => {
    expect(parseInlineLinks('[clase de yoga 1](https://www.youtube.com/watch?v=wehehhshfghs)')).toEqual([
      {
        type: 'link',
        label: 'clase de yoga 1',
        href: 'https://www.youtube.com/watch?v=wehehhshfghs',
      },
    ]);
  });

  it('recognizes multiple web and email links while preserving surrounding text', () => {
    expect(parseInlineLinks('Ver [guía](https://example.com/guia) o [escribir](mailto:hola@example.com).')).toEqual([
      { type: 'text', value: 'Ver ' },
      { type: 'link', label: 'guía', href: 'https://example.com/guia' },
      { type: 'text', value: ' o ' },
      { type: 'link', label: 'escribir', href: 'mailto:hola@example.com' },
      { type: 'text', value: '.' },
    ]);
  });

  it('leaves malformed and unsafe links as plain text', () => {
    expect(parseInlineLinks('[incompleto](https://example.com\n[peligro](javascript:alert(1))')).toEqual([
      { type: 'text', value: '[incompleto](https://example.com\n[peligro](javascript:alert(1))' },
    ]);
  });

  it('preserves line breaks around links', () => {
    expect(parseInlineLinks('Primera línea\n[segunda](http://example.com)')).toEqual([
      { type: 'text', value: 'Primera línea\n' },
      { type: 'link', label: 'segunda', href: 'http://example.com' },
    ]);
  });
});
