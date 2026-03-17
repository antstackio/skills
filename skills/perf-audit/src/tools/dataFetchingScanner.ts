import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { DataFetchingAnalysis, PageAnalysis } from '../types/index.js';

export async function scanDataFetching(
  projectPath: string, 
  pagesPath: string = 'src/pages'
): Promise<DataFetchingAnalysis> {
  console.log('🔍 Scanning data fetching patterns...');
  
  try {
    const fullPagesPath = path.join(projectPath, pagesPath);
    
    // Check if pages directory exists (Pages Router)
    let pageFiles: string[] = [];
    try {
      pageFiles = await glob('**/*.{js,jsx,ts,tsx}', { 
        cwd: fullPagesPath,
        absolute: true 
      });
    } catch (error) {
      // Try app directory (App Router)
      const appPath = path.join(projectPath, 'src/app');
      try {
        pageFiles = await glob('**/page.{js,jsx,ts,tsx}', { 
          cwd: appPath,
          absolute: true 
        });
      } catch (appError) {
        console.warn('No pages or app directory found');
        return createEmptyAnalysis();
      }
    }
    
    const pageAnalyses: PageAnalysis[] = [];
    
    for (const filePath of pageFiles) {
      try {
        const analysis = await analyzePageFile(filePath, projectPath);
        if (analysis) {
          pageAnalyses.push(analysis);
        }
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }
    
    return {
      pages: pageAnalyses,
      summary: generateSummary(pageAnalyses),
    };
    
  } catch (error) {
    throw new Error(`Data fetching analysis failed: ${error}`);
  }
}

async function analyzePageFile(filePath: string, projectPath: string): Promise<PageAnalysis | null> {
  const relativePath = path.relative(projectPath, filePath);
  
  // Skip non-page files
  if (shouldSkipFile(relativePath)) {
    return null;
  }
  
  const content = await fs.readFile(filePath, 'utf-8');
  const analysis = analyzeSourceCode(content);
  
  const currentMethod = determineCurrentMethod(analysis);
  const recommendedMethod = determineRecommendedMethod(analysis);
  const reasoning = generateReasoning(analysis, currentMethod, recommendedMethod);
  const autoFixable = isAutoFixable(currentMethod, recommendedMethod);
  
  return {
    filePath: relativePath,
    currentMethod,
    recommendedMethod,
    reasoning,
    autoFixable,
    dataFetching: analysis,
  };
}

function analyzeSourceCode(content: string) {
  const analysis = {
    hasGetServerSideProps: false,
    hasGetStaticProps: false,
    hasGetStaticPaths: false,
    hasClientFetch: false,
    isStatic: false,
    isCacheable: false,
  };
  
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    
    traverse(ast, {
      // Check for Next.js data fetching functions
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        if (name === 'getServerSideProps') {
          analysis.hasGetServerSideProps = true;
        } else if (name === 'getStaticProps') {
          analysis.hasGetStaticProps = true;
        } else if (name === 'getStaticPaths') {
          analysis.hasGetStaticPaths = true;
        }
      },
      
      // Check for exported functions
      ExportNamedDeclaration(path) {
        if (path.node.declaration?.type === 'FunctionDeclaration') {
          const name = path.node.declaration.id?.name;
          if (name === 'getServerSideProps') {
            analysis.hasGetServerSideProps = true;
          } else if (name === 'getStaticProps') {
            analysis.hasGetStaticProps = true;
          } else if (name === 'getStaticPaths') {
            analysis.hasGetStaticPaths = true;
          }
        }
      },
      
      // Check for client-side data fetching
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Check for fetch, axios, etc.
        if (callee.type === 'Identifier') {
          if (['fetch', 'axios'].includes(callee.name)) {
            analysis.hasClientFetch = true;
          }
        }
        
        // Check for hooks like useEffect, useSWR, etc.
        if (callee.type === 'Identifier') {
          if (['useEffect', 'useSWR', 'useQuery', 'useAsyncEffect'].includes(callee.name)) {
            analysis.hasClientFetch = true;
          }
        }
      },
      
      // Check for imports that suggest client fetching
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (typeof source === 'string') {
          if (['swr', 'react-query', '@tanstack/react-query', 'axios'].includes(source)) {
            analysis.hasClientFetch = true;
          }
        }
      },
    });
    
    // Determine if data appears static or cacheable
    analysis.isStatic = !analysis.hasClientFetch && !analysis.hasGetServerSideProps;
    analysis.isCacheable = !hasUserSpecificContent(content);
    
  } catch (error) {
    console.warn('Failed to parse file:', error);
  }
  
  return analysis;
}

function determineCurrentMethod(analysis: any): PageAnalysis['currentMethod'] {
  if (analysis.hasGetServerSideProps) return 'SSR';
  if (analysis.hasGetStaticProps) return 'SSG';
  if (analysis.hasGetStaticProps && analysis.hasGetStaticPaths) return 'SSG';
  if (analysis.hasClientFetch) return 'CLIENT';
  return 'UNKNOWN';
}

function determineRecommendedMethod(analysis: any): PageAnalysis['recommendedMethod'] {
  // Static content should use SSG
  if (analysis.isStatic && !analysis.hasClientFetch) {
    return 'SSG';
  }
  
  // Cacheable content should use ISR
  if (analysis.isCacheable && analysis.hasGetServerSideProps) {
    return 'ISR';
  }
  
  // User-specific content that needs SEO should stay SSR
  if (!analysis.isCacheable && analysis.hasGetServerSideProps) {
    return 'SSR';
  }
  
  // Client-only interactions can stay CLIENT
  if (analysis.hasClientFetch && !analysis.hasGetServerSideProps && !analysis.hasGetStaticProps) {
    return 'CLIENT';
  }
  
  // Default recommendation based on current method
  if (analysis.hasGetServerSideProps) return 'ISR';
  if (analysis.hasGetStaticProps) return 'SSG';
  
  return 'SSG'; // Default to SSG for better performance
}

function generateReasoning(
  analysis: any, 
  current: PageAnalysis['currentMethod'], 
  recommended: PageAnalysis['recommendedMethod']
): string {
  if (current === recommended) {
    return `Current ${current} method is optimal for this page's data requirements.`;
  }
  
  const reasons: string[] = [];
  
  if (recommended === 'SSG') {
    reasons.push('Page content appears static and can be pre-rendered at build time');
  } else if (recommended === 'ISR') {
    reasons.push('Page content is cacheable but may need periodic updates');
  } else if (recommended === 'SSR') {
    reasons.push('Page content is user-specific and requires server-side rendering');
  } else if (recommended === 'CLIENT') {
    reasons.push('Page content is highly interactive and best fetched client-side');
  }
  
  if (current === 'SSR' && recommended === 'ISR') {
    reasons.push('Converting to ISR will improve performance by enabling caching');
  } else if (current === 'SSR' && recommended === 'SSG') {
    reasons.push('Converting to SSG will significantly improve performance for static content');
  } else if (current === 'CLIENT' && recommended === 'SSG') {
    reasons.push('Pre-rendering will improve SEO and initial load performance');
  }
  
  return reasons.join('. ') + '.';
}

function isAutoFixable(
  current: PageAnalysis['currentMethod'], 
  recommended: PageAnalysis['recommendedMethod']
): boolean {
  // Simple transformations that can be automated
  const autoFixableTransitions = [
    ['SSR', 'ISR'],  // Add revalidate to getServerSideProps
    ['CLIENT', 'SSG'], // Move client fetch to getStaticProps
  ];
  
  return autoFixableTransitions.some(([from, to]) => current === from && recommended === to);
}

function hasUserSpecificContent(content: string): boolean {
  const userSpecificPatterns = [
    /\bcookie\b/i,
    /\bsession\b/i,
    /\bauth\b/i,
    /\blogin\b/i,
    /\buser\b/i,
    /\bpersonalized?\b/i,
    /\bdashboard\b/i,
    /\bprofile\b/i,
    /\baccount\b/i,
  ];
  
  return userSpecificPatterns.some(pattern => pattern.test(content));
}

function shouldSkipFile(relativePath: string): boolean {
  const skipPatterns = [
    /_app\./,
    /_document\./,
    /_error\./,
    /404\./,
    /500\./,
    /\.test\./,
    /\.spec\./,
    /\/api\//,
    /\.d\.ts$/,
  ];
  
  return skipPatterns.some(pattern => pattern.test(relativePath));
}

function generateSummary(pages: PageAnalysis[]) {
  const summary = {
    totalPages: pages.length,
    ssrPages: 0,
    ssgPages: 0,
    isrPages: 0,
    clientOnlyPages: 0,
  };
  
  pages.forEach(page => {
    switch (page.currentMethod) {
      case 'SSR':
        summary.ssrPages++;
        break;
      case 'SSG':
        summary.ssgPages++;
        break;
      case 'ISR':
        summary.isrPages++;
        break;
      case 'CLIENT':
        summary.clientOnlyPages++;
        break;
    }
  });
  
  return summary;
}

function createEmptyAnalysis(): DataFetchingAnalysis {
  return {
    pages: [],
    summary: {
      totalPages: 0,
      ssrPages: 0,
      ssgPages: 0,
      isrPages: 0,
      clientOnlyPages: 0,
    },
  };
}