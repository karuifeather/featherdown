export type RenderMarkdownOptions = {
  kind?: string;
  slug?: string;
  manifest?: {
    map?: Record<string, { url: string }>;
    remote?: Record<string, { url: string }>;
  };
};

export type RenderDiagnostic = {
  code: string;
  message: string;
  severity: 'warning';
  source: 'chart' | 'images';
};

