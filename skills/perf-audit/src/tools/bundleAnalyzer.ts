import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { BundleAnalysis, ChunkInfo, HeavyDependency, DuplicateDependency, TreeshakingOpportunity } from '../types/index.js';

const HEAVY_LIBRARIES: Record<string, { size: number; replacement: string; reason: string }> = {
  'moment': { 
    size: 300000, 
    replacement: 'dayjs', 
    reason: 'moment.js is 300kb+ and not tree-shakeable. dayjs is 2kb with similar API.'
  },
  'lodash': { 
    size: 150000, 
    replacement: 'lodash-es', 
    reason: 'Use lodash-es for tree-shaking or import specific functions.'
  },
  'uuid': { 
    size: 50000, 
    replacement: 'nanoid', 
    reason: 'nanoid is smaller (130 bytes) and faster than uuid.'
  },
  '@material-ui/core': { 
    size: 500000, 
    replacement: '@mui/material', 
    reason: 'Upgrade to MUI v5 for better tree-shaking and smaller bundle.'
  },
  'date-fns': {
    size: 200000,
    replacement: 'date-fns with tree-shaking',
    reason: 'Import specific functions instead of the entire library.'
  }
};

export async function analyzeBundle(projectPath: string): Promise<BundleAnalysis> {
  console.log('📦 Analyzing bundle size...');
  
  try {
    // Check if this is a Next.js project
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    if (!packageJson.dependencies?.next && !packageJson.devDependencies?.next) {
      throw new Error('This doesn\'t appear to be a Next.js project');
    }

    // Run build with bundle analyzer
    console.log('Building project with bundle analysis...');
    
    // Check if bundle analyzer is configured
    const nextConfigPath = path.join(projectPath, 'next.config.js');
    const nextConfigMjsPath = path.join(projectPath, 'next.config.mjs');
    
    let hasAnalyzer = false;
    try {
      if (await fileExists(nextConfigPath)) {
        const config = await fs.readFile(nextConfigPath, 'utf-8');
        hasAnalyzer = config.includes('bundle-analyzer');
      } else if (await fileExists(nextConfigMjsPath)) {
        const config = await fs.readFile(nextConfigMjsPath, 'utf-8');
        hasAnalyzer = config.includes('bundle-analyzer');
      }
    } catch (e) {
      // Ignore config read errors
    }

    // Install bundle analyzer if not present
    if (!hasAnalyzer) {
      console.log('Installing @next/bundle-analyzer...');
      execSync('npm install --save-dev @next/bundle-analyzer', { 
        cwd: projectPath, 
        stdio: 'pipe' 
      });
      
      // Create or update next.config.js with bundle analyzer
      await setupBundleAnalyzer(projectPath);
    }

    // Run build with analyzer
    const env = { ...process.env, ANALYZE: 'true' };
    execSync('npm run build', { 
      cwd: projectPath, 
      stdio: 'pipe',
      env
    });
    
    // Parse webpack stats
    const statsPath = path.join(projectPath, '.next', 'analyze', 'client.json');
    
    if (await fileExists(statsPath)) {
      const stats = JSON.parse(await fs.readFile(statsPath, 'utf-8'));
      return parseWebpackStats(stats);
    } else {
      // Fallback: analyze .next/static directory
      return await analyzeBuildOutput(projectPath);
    }
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error);
    throw new Error(`Bundle analysis failed: ${error}`);
  }
}

async function setupBundleAnalyzer(projectPath: string): Promise<void> {
  const nextConfigPath = path.join(projectPath, 'next.config.js');
  const nextConfigMjsPath = path.join(projectPath, 'next.config.mjs');
  
  const configContent = `const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // your existing config
}

module.exports = withBundleAnalyzer(nextConfig)
`;

  // Check if config exists
  if (await fileExists(nextConfigPath) || await fileExists(nextConfigMjsPath)) {
    console.log('⚠️  next.config.js exists. Please add @next/bundle-analyzer manually.');
    console.log('Add this to your next.config.js:');
    console.log(configContent);
    return;
  }
  
  // Create new config
  await fs.writeFile(nextConfigPath, configContent);
}

function parseWebpackStats(stats: any): BundleAnalysis {
  const chunks = stats.chunks?.map((chunk: any) => ({
    name: chunk.name || 'unnamed',
    size: chunk.size || 0,
    modules: chunk.modules?.map((mod: any) => ({
      name: mod.name || 'unnamed',
      size: mod.size || 0,
      id: mod.id || 0,
    })) || [],
  })) || [];
  
  const heavyDependencies = findHeavyDependencies(chunks);
  const duplicates = findDuplicateDependencies(chunks);
  const treeshakingOpportunities = findTreeshakingOpportunities(chunks);
  
  return {
    totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
    chunks,
    heavyDependencies,
    duplicates,
    treeshakingOpportunities,
  };
}

async function analyzeBuildOutput(projectPath: string): Promise<BundleAnalysis> {
  console.log('Analyzing .next/static directory...');
  
  const staticPath = path.join(projectPath, '.next', 'static');
  const chunks: ChunkInfo[] = [];
  
  try {
    const buildId = await fs.readdir(path.join(projectPath, '.next', 'static', 'chunks'));
    
    for (const file of buildId) {
      if (file.endsWith('.js')) {
        const filePath = path.join(staticPath, 'chunks', file);
        const stats = await fs.stat(filePath);
        
        chunks.push({
          name: file,
          size: stats.size,
          modules: [], // Can't get module info without webpack stats
        });
      }
    }
  } catch (error) {
    console.warn('Could not analyze build output:', error);
  }
  
  return {
    totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
    chunks,
    heavyDependencies: [],
    duplicates: [],
    treeshakingOpportunities: [],
  };
}

function findHeavyDependencies(chunks: ChunkInfo[]): HeavyDependency[] {
  const dependencies = new Map<string, number>();
  
  chunks.forEach(chunk => {
    chunk.modules.forEach(module => {
      const packageName = extractPackageName(module.name);
      if (packageName) {
        dependencies.set(packageName, (dependencies.get(packageName) || 0) + module.size);
      }
    });
  });
  
  return Array.from(dependencies.entries())
    .filter(([name, size]) => size > 100000 || HEAVY_LIBRARIES[name])
    .map(([name, size]) => {
      const heavy = HEAVY_LIBRARIES[name];
      return {
        name,
        size,
        suggestedReplacement: heavy?.replacement,
        impact: size > 200000 ? 'high' : size > 100000 ? 'medium' : 'low',
        reason: heavy?.reason || `Large dependency (${(size / 1000).toFixed(1)}kb)`,
      } as HeavyDependency;
    })
    .sort((a, b) => b.size - a.size);
}

function findDuplicateDependencies(chunks: ChunkInfo[]): DuplicateDependency[] {
  const packageVersions = new Map<string, Set<string>>();
  
  chunks.forEach(chunk => {
    chunk.modules.forEach(module => {
      const packageInfo = extractPackageInfo(module.name);
      if (packageInfo) {
        const { name, version } = packageInfo;
        if (!packageVersions.has(name)) {
          packageVersions.set(name, new Set());
        }
        packageVersions.get(name)!.add(version);
      }
    });
  });
  
  return Array.from(packageVersions.entries())
    .filter(([_, versions]) => versions.size > 1)
    .map(([name, versions]) => ({
      name,
      versions: Array.from(versions),
      totalSize: 0, // Would need more analysis to calculate
    }));
}

function findTreeshakingOpportunities(chunks: ChunkInfo[]): TreeshakingOpportunity[] {
  const opportunities: TreeshakingOpportunity[] = [];
  
  chunks.forEach(chunk => {
    chunk.modules.forEach(module => {
      const moduleName = module.name;
      
      // Check for common non-tree-shakeable imports
      if (moduleName.includes('lodash') && !moduleName.includes('lodash-es')) {
        opportunities.push({
          library: 'lodash',
          currentImport: 'import _ from "lodash"',
          suggestedImport: 'import { debounce } from "lodash-es"',
          estimatedSavings: module.size * 0.8, // Estimate 80% savings
        });
      }
      
      if (moduleName.includes('date-fns') && moduleName.includes('index')) {
        opportunities.push({
          library: 'date-fns',
          currentImport: 'import * as dateFns from "date-fns"',
          suggestedImport: 'import { format, parseISO } from "date-fns"',
          estimatedSavings: module.size * 0.9,
        });
      }
    });
  });
  
  return opportunities;
}

function extractPackageName(moduleName: string): string | null {
  const match = moduleName.match(/node_modules\/([^\/]+)/);
  if (match) {
    const packageName = match[1];
    // Handle scoped packages
    if (packageName.startsWith('@')) {
      const scopedMatch = moduleName.match(/node_modules\/(@[^\/]+\/[^\/]+)/);
      return scopedMatch ? scopedMatch[1] : packageName;
    }
    return packageName;
  }
  return null;
}

function extractPackageInfo(moduleName: string): { name: string; version: string } | null {
  const packageName = extractPackageName(moduleName);
  if (!packageName) return null;
  
  // Try to extract version (this is simplified)
  const versionMatch = moduleName.match(/node_modules\/[^\/]+@([^\/]+)/);
  const version = versionMatch ? versionMatch[1] : 'unknown';
  
  return { name: packageName, version };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}