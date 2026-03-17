export interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  heavyDependencies: HeavyDependency[];
  duplicates: DuplicateDependency[];
  treeshakingOpportunities: TreeshakingOpportunity[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  id: string | number;
}

export interface HeavyDependency {
  name: string;
  size: number;
  suggestedReplacement?: string;
  impact: 'high' | 'medium' | 'low';
  reason: string;
}

export interface DuplicateDependency {
  name: string;
  versions: string[];
  totalSize: number;
}

export interface TreeshakingOpportunity {
  library: string;
  currentImport: string;
  suggestedImport: string;
  estimatedSavings: number;
}

export interface LighthouseMetrics {
  lcp: number;   // Largest Contentful Paint (ms)
  fid: number;   // First Input Delay / Max Potential FID (ms)
  cls: number;   // Cumulative Layout Shift (score)
  tbt: number;   // Total Blocking Time (ms)
  fcp: number;   // First Contentful Paint (ms)
  tti: number;   // Time to Interactive (ms)
  si: number;    // Speed Index (ms)
  ttfb: number;  // Time to First Byte (ms)
}

export interface LighthouseAnalysis {
  performanceScore: number;
  metrics: LighthouseMetrics;
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  savings: number;
  impact: 'high' | 'medium' | 'low';
}

export interface Diagnostic {
  id: string;
  title: string;
  description: string;
  score: number;
}

export interface DataFetchingAnalysis {
  pages: PageAnalysis[];
  summary: {
    totalPages: number;
    ssrPages: number;
    ssgPages: number;
    isrPages: number;
    clientOnlyPages: number;
  };
}

export interface PageAnalysis {
  filePath: string;
  currentMethod: 'SSR' | 'SSG' | 'ISR' | 'CLIENT' | 'UNKNOWN';
  recommendedMethod: 'SSR' | 'SSG' | 'ISR' | 'CLIENT';
  reasoning: string;
  autoFixable: boolean;
  dataFetching: {
    hasGetServerSideProps: boolean;
    hasGetStaticProps: boolean;
    hasGetStaticPaths: boolean;
    hasClientFetch: boolean;
    isStatic: boolean;
    isCacheable: boolean;
  };
}

export interface CodeTransformResult {
  success: boolean;
  changes: string[];
  diff?: string;
  error?: string;
  filePath: string;
  transformType: string;
}

export interface AnalysisOptions {
  projectPath: string;
  buildCommand?: string;
  url?: string;
  skipBuild?: boolean;
}

export interface PerformanceScores {
  performanceScore: number;
  metrics: LighthouseMetrics;
}

export interface AgentOptions {
  url?: string;
  dryRun?: boolean;
  device?: 'mobile' | 'desktop';
  throttling?: 'simulated3G' | 'simulated4G' | 'none';
  maxIterations?: number;
  model?: string;
  verbose?: boolean;
}

export interface AgentResult {
  projectPath: string;
  url?: string;
  initialScores?: PerformanceScores;
  finalScores?: PerformanceScores;
  improvement?: number;
  appliedTransformations: CodeTransformResult[];
  skippedTransformations: Array<{ type: string; filePath: string; reason: string }>;
  bundleAnalysis?: BundleAnalysis;
  dataFetchingAnalysis?: DataFetchingAnalysis;
  report: string;
  duration: number;
  iterations: number;
}