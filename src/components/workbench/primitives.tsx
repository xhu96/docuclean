import type { ReactElement } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { File } from 'lucide-react';
import type { DocumentKind } from '../../lib/documents';

export function FileGlyph({ kind, large = false }: { kind: DocumentKind; large?: boolean }) {
  return <span className={`file-glyph ${kind}${large ? ' large' : ''}`} aria-hidden="true"><File strokeWidth={1.3} /><span>{kind.toUpperCase()}</span></span>;
}

export function Hint({ children, text }: { children: ReactElement; text: string }) {
  return <Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip-content" sideOffset={7}>{text}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}
