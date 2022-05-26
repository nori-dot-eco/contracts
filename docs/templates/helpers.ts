import { Utils } from 'handlebars';
import type { HelperOptions } from 'handlebars';
import type { DocItemWithContext } from 'solidity-docgen';

interface HLevel {
  hlevel?: number;
}
type DocumentItemWithHLevel = DocItemWithContext & HLevel;

/**
 * Returns a Markdown heading marker. An optional number increases the heading level.
 *
 *    Input                  Output
 *    {{h}} {{name}}         # Name
 *    {{h 2}} {{name}}       ## Name
 */
export function h(
  this: DocumentItemWithHLevel,
  hsublevel: number | HelperOptions
) {
  ({ hsublevel } = getHSublevel(hsublevel));
  hsublevel = typeof hsublevel === 'number' ? Math.max(1, hsublevel) : 1;
  return Array.from({ length: getHLevel(this) + hsublevel - 1 })
    .fill('#')
    .join('');
}

/**
 * Delineates a section where headings should be increased by 1 or a custom number.
 *
 *    {{#hsection}}
 *    {{>partial-with-headings}}
 *    {{/hsection}}
 */
export function hsection(
  this: DocumentItemWithHLevel,
  hsublevel: number | HelperOptions,
  options?: HelperOptions
) {
  ({ hsublevel, opts: options } = getHSublevel(hsublevel, options));
  const hlevel = getHLevel(this) + hsublevel;
  const context = Utils.extend({}, this, { hlevel });
  return options.fn(context, options);
}

/**
 * Helper for dealing with the optional hsublevel argument.
 */
function getHSublevel(
  hsublevel: number | HelperOptions,
  options?: HelperOptions
) {
  if (typeof hsublevel === 'number') {
    options = options!;
    return { hsublevel: Math.max(1, hsublevel), opts: options };
  }
  options = hsublevel;
  return { hsublevel: 1, opts: options };
}

function getHLevel(context: HLevel): number {
  return context.hlevel ?? 1;
}

export function trim(text: string) {
  if (typeof text === 'string') {
    return text.trim();
  }
}

export function joinLines(text?: string) {
  if (typeof text === 'string') {
    return text.replace(/\n+/g, ' ');
  }
}
