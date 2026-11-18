import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { renderMarkdownToHtml } from '../src/legacy.js';

const parse = async (md: string, options?: ConstructorParameters<typeof Featherdown>[0]) =>
  (await new Featherdown(options).parse(md)).html;

describe('GitHub alerts', () => {
  it.each([
    ['NOTE', 'note', 'Note'],
    ['TIP', 'tip', 'Tip'],
    ['IMPORTANT', 'important', 'Important'],
    ['WARNING', 'warning', 'Warning'],
    ['CAUTION', 'caution', 'Caution'],
  ])('renders [!%s]', async (marker, type, title) => {
    const html = await parse(`> [!${marker}]\n> Body text`);
    expect(html).toContain(`<div class="callout callout-${type}">`);
    expect(html).toContain(`<div class="callout-title">${title}</div>`);
    expect(html).toContain('Body text');
    expect(html).not.toContain('<blockquote');
    expect(html).not.toContain('[!');
  });

  it('is case-insensitive', async () => {
    const html = await parse('> [!wArNiNg]\n> careful');
    expect(html).toContain('callout callout-warning');
  });

  it('supports a custom title and multiple paragraphs', async () => {
    const html = await parse('> [!TIP] Pro tip\n> first\n>\n> second');
    expect(html).toContain('<div class="callout-title">Pro tip</div>');
    expect(html).toContain('first');
    expect(html).toContain('second');
  });

  it('renders marker-only alerts with just a title', async () => {
    const html = await parse('> [!NOTE]');
    expect(html).toContain('<div class="callout-title">Note</div>');
  });

  it('leaves normal and unknown blockquotes untouched', async () => {
    expect(await parse('> plain quote')).toContain('<blockquote>');
    const unknown = await parse('> [!FOO]\n> body');
    expect(unknown).toContain('<blockquote>');
    expect(unknown).not.toContain('callout');
    const notFirst = await parse('> hello [!NOTE]\n> body');
    expect(notFirst).toContain('<blockquote>');
  });

  it('keeps inline markdown in the body', async () => {
    const html = await parse('> [!NOTE]\n> some **bold** text');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('can be disabled', async () => {
    const html = await parse('> [!NOTE]\n> body', { alerts: false });
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('callout');
  });
});

describe(':::details', () => {
  it('renders summary and body', async () => {
    const html = await parse(':::details[More info]\nHidden **content**\n:::');
    expect(html).toContain('<details class="details">');
    expect(html).toContain('<summary>More info</summary>');
    expect(html).toContain('<strong>content</strong>');
  });

  it('defaults the summary to Details', async () => {
    const html = await parse(':::details\nbody\n:::');
    expect(html).toContain('<summary>Details</summary>');
  });

  it('supports {open}', async () => {
    const html = await parse(':::details[Title]{open}\nbody\n:::');
    expect(html).toMatch(/<details class="details" open(="")?>/);
  });

  it('supports nested callouts', async () => {
    const html = await parse(':::::details[Outer]\n::::note\nInner\n::::\n:::::');
    expect(html).toContain('<details class="details">');
    expect(html).toContain('<div class="callout callout-note">');
    expect(html).toContain('Inner');
  });

  it('supports alerts inside details', async () => {
    const html = await parse(':::details[Outer]\n> [!TIP]\n> inner\n:::');
    expect(html).toContain('callout callout-tip');
  });

  it('can be disabled', async () => {
    const html = await parse(':::details[Title]\nbody\n:::', { details: false });
    expect(html).not.toContain('<details');
    expect(html).toContain(':::details[Title]');
  });
});

describe('legacy output unchanged', () => {
  it('does not transform alerts', async () => {
    const html = await renderMarkdownToHtml('> [!NOTE]\n> body');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('callout');
  });

  it('does not transform :::details', async () => {
    const html = await renderMarkdownToHtml(':::details[T]\nbody\n:::');
    expect(html).not.toContain('<details');
    expect(html).toContain(':::details[T]');
  });
});

describe('raw HTML cannot spoof', () => {
  it('drops extra classes on details and summary', async () => {
    const html = await parse('<details class="details fixed inset-0"><summary class="x">S</summary>b</details>');
    expect(html).not.toContain('fixed');
    expect(html).not.toContain('class="x"');
  });

  it('drops the details class on other elements', async () => {
    const html = await parse('<p class="details">x</p>\n\n<div class="details">y</div>');
    expect(html).not.toContain('class="details"');
  });
});

describe('alert titles with inline markup', () => {
  it('uses the plain text of the whole marker line as the title', async () => {
    const { Featherdown } = await import('../src/index.js');
    const { html } = await new Featherdown().parse('> [!NOTE] **Heads** up `now`\n> body text\n');
    expect(html).toContain('<div class="callout-title">Heads up now</div>');
    expect(html).toContain('<p>body text</p>');
    expect(html).not.toContain('<strong>Heads</strong>');
  });
});
