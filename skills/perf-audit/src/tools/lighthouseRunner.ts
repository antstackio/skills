import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { LighthouseAnalysis, LighthouseMetrics, Opportunity, Diagnostic } from '../types/index.js';

export async function runLighthouse(
  url: string, 
  options: { device?: 'mobile' | 'desktop'; throttling?: 'simulated3G' | 'simulated4G' | 'none' } = {}
): Promise<LighthouseAnalysis> {
  console.log(`🔍 Running Lighthouse audit for ${url}...`);
  
  const { device = 'mobile', throttling = 'simulated3G' } = options;
  
  let chrome;
  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({ 
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] 
    });
    
    // Configure Lighthouse options
    const lighthouseOptions = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance'],
      port: chrome.port,
      emulatedFormFactor: device,
      throttlingMethod: throttling === 'none' ? 'provided' : 'simulate',
      throttling: getThrottlingConfig(throttling),
    };
    
    // Run Lighthouse
    const runnerResult = await lighthouse(url, lighthouseOptions);
    
    if (!runnerResult?.report) {
      throw new Error('Lighthouse failed to generate report');
    }
    
    const report = JSON.parse(runnerResult.report);
    return parseLighthouseReport(report);
    
  } catch (error) {
    throw new Error(`Lighthouse audit failed: ${error}`);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

function getThrottlingConfig(throttling: string) {
  switch (throttling) {
    case 'simulated3G':
      return {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      };
    case 'simulated4G':
      return {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      };
    case 'none':
    default:
      return {
        rttMs: 0,
        throughputKbps: 0,
        cpuSlowdownMultiplier: 1,
      };
  }
}

function parseLighthouseReport(report: any): LighthouseAnalysis {
  const audits = report.audits;
  
  // Extract Core Web Vitals and performance metrics
  const metrics: LighthouseMetrics = {
    lcp: audits['largest-contentful-paint']?.numericValue || 0,
    fid: audits['max-potential-fid']?.numericValue || 0,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    tbt: audits['total-blocking-time']?.numericValue || 0,
    fcp: audits['first-contentful-paint']?.numericValue || 0,
    tti: audits['interactive']?.numericValue || 0,
    si: audits['speed-index']?.numericValue || 0,
    ttfb: audits['server-response-time']?.numericValue || 0,
  };
  
  // Extract optimization opportunities
  const opportunities = extractOpportunities(audits);
  
  // Extract diagnostics
  const diagnostics = extractDiagnostics(audits);
  
  return {
    performanceScore: Math.round(report.categories.performance.score * 100),
    metrics,
    opportunities,
    diagnostics,
  };
}

function extractOpportunities(audits: any): Opportunity[] {
  const opportunityAudits = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript',
    'preload-lcp-image',
    'total-byte-weight',
  ];
  
  return opportunityAudits
    .map(auditId => {
      const audit = audits[auditId];
      if (!audit || audit.score === 1 || !audit.details?.overallSavingsMs) {
        return null;
      }
      
      return {
        id: auditId,
        title: audit.title,
        description: audit.description,
        savings: audit.details.overallSavingsMs,
        impact: audit.details.overallSavingsMs > 1000 ? 'high' : 
                audit.details.overallSavingsMs > 500 ? 'medium' : 'low',
      } as Opportunity;
    })
    .filter(Boolean) as Opportunity[];
}

function extractDiagnostics(audits: any): Diagnostic[] {
  const diagnosticAudits = [
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-long-cache-ttl',
    'total-byte-weight',
    'dom-size',
    'critical-request-chains',
    'user-timings',
    'third-party-summary',
  ];
  
  return diagnosticAudits
    .map(auditId => {
      const audit = audits[auditId];
      if (!audit) return null;
      
      return {
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score || 0,
      } as Diagnostic;
    })
    .filter(Boolean) as Diagnostic[];
}

// Utility function to check if URL is accessible
export async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Utility to start local dev server if needed
export async function startLocalServer(projectPath: string): Promise<string> {
  const { spawn } = await import('child_process');

  // Check if already running
  const isRunning = await checkUrlAccessibility('http://localhost:3000');
  if (isRunning) {
    return 'http://localhost:3000';
  }

  console.log('Starting Next.js dev server...');

  spawn('npm', ['run', 'dev'], {
    cwd: projectPath,
    stdio: 'pipe',
    detached: true,
  });

  // Wait for server to start (up to 60 seconds)
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkUrlAccessibility('http://localhost:3000')) {
      console.log('✅ Dev server started at http://localhost:3000');
      return 'http://localhost:3000';
    }
  }

  throw new Error('Dev server failed to start within 60 seconds');
}

// Utility to build for production then start the production server
export async function startProdServer(projectPath: string): Promise<string> {
  const { execSync, spawn } = await import('child_process');

  // If something is already listening on 3000, just use it
  const isRunning = await checkUrlAccessibility('http://localhost:3000');
  if (isRunning) {
    console.log('✅ Server already running at http://localhost:3000');
    return 'http://localhost:3000';
  }

  console.log('🏗️  Running next build (this may take a few minutes)...');
  try {
    execSync('npm run build', {
      cwd: projectPath,
      stdio: 'inherit',   // stream build output so the user can see progress
    });
  } catch (error) {
    throw new Error(`next build failed: ${error}`);
  }

  console.log('🚀 Starting Next.js production server (next start)...');
  spawn('npm', ['run', 'start'], {
    cwd: projectPath,
    stdio: 'pipe',
    detached: true,
  });

  // Wait up to 60 seconds for the production server to become accessible
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkUrlAccessibility('http://localhost:3000')) {
      console.log('✅ Production server ready at http://localhost:3000');
      return 'http://localhost:3000';
    }
  }

  throw new Error('Production server failed to start within 60 seconds after build');
}

// Generate performance recommendations based on Lighthouse results
export function generateRecommendations(analysis: LighthouseAnalysis): string[] {
  const recommendations: string[] = [];
  
  // Core Web Vitals recommendations
  if (analysis.metrics.lcp > 2500) {
    recommendations.push('🔥 LCP is poor (>2.5s). Optimize largest contentful paint by preloading critical images and reducing server response time.');
  }
  
  if (analysis.metrics.cls > 0.1) {
    recommendations.push('📐 CLS is poor (>0.1). Fix layout shifts by setting explicit dimensions for images and ads.');
  }
  
  if (analysis.metrics.tbt > 300) {
    recommendations.push('⚡ Total Blocking Time is high (>300ms). Reduce JavaScript execution time and split large bundles.');
  }
  
  // Opportunity-based recommendations
  analysis.opportunities.forEach(opp => {
    switch (opp.id) {
      case 'render-blocking-resources':
        recommendations.push('🚫 Remove render-blocking resources. Inline critical CSS and defer non-critical JavaScript.');
        break;
      case 'unused-javascript':
        recommendations.push('📦 Remove unused JavaScript. Use code splitting and tree shaking.');
        break;
      case 'modern-image-formats':
        recommendations.push('🖼️ Use modern image formats (WebP, AVIF) for better compression.');
        break;
      case 'offscreen-images':
        recommendations.push('👁️ Lazy load offscreen images to improve initial load time.');
        break;
    }
  });
  
  return recommendations;
}