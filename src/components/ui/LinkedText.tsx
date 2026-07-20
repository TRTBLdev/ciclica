import React from 'react';
import { parseInlineLinks } from '../../domain/inlineLinks';
import { cn } from '../../lib/utils';

interface Props {
  text: string;
  linkClassName?: string;
}

export default function LinkedText({ text, linkClassName }: Props) {
  return (
    <>
      {parseInlineLinks(text).map((token, index) => {
        if (token.type === 'text') {
          return <React.Fragment key={`${index}-${token.value}`}>{token.value}</React.Fragment>;
        }
        const isEmail = token.href.toLowerCase().startsWith('mailto:');
        return (
          <a
            key={`${index}-${token.href}`}
            href={token.href}
            target={isEmail ? undefined : '_blank'}
            rel={isEmail ? undefined : 'noopener noreferrer'}
            className={cn('underline underline-offset-2 hover:text-text-main focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-dim', linkClassName)}
            title={token.href}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {token.label}
          </a>
        );
      })}
    </>
  );
}
