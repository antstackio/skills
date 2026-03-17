#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { analyzeBundle } from './tools/bundleAnalyzer.js';
import { runLighthouse, startLocalServer, generateRecommendations } from './tools/lighthouseRunner.js';
import { scanDataFetching } from './tools/dataFetchingScanner.js';
import { applyCodeTransform, TransformType } from './tools/codeTransformer.js';
import { PerformanceAgent } from './agent.js';

class FrontendPerformanceServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'frontend-performance-agent',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyzeBundle',
            description: 'Analyzes Next.js bundle size, dependencies, and optimization opportunities',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the Next.js project root directory'
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'runLighthouse',
            description: 'Runs Lighthouse performance audit and returns detailed metrics',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to audit (e.g., http://localhost:3000)'
                },
                options: {
                  type: 'object',
                  properties: {
                    device: {
                      type: 'string',
                      enum: ['mobile', 'desktop'],
                      description: 'Device type for emulation'
                    },
                    throttling: {
                      type: 'string',
                      enum: ['simulated3G', 'simulated4G', 'none'],
                      description: 'Network throttling simulation'
                    }
                  }
                }
              },
              required: ['url']
            }
          },
          {
            name: 'scanDataFetching',
            description: 'Scans Next.js pages for data fetching patterns and optimization opportunities',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the Next.js project root'
                },
                pagesPath: {
                  type: 'string',
                  description: 'Relative path to pages directory (default: src/pages)'
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'applyCodeTransform',
            description: 'Applies performance-related code transformations using AST codemods',
            inputSchema: {
              type: 'object',
              properties: {
                transformType: {
                  type: 'string',
                  enum: [
                    'replaceMomentWithDayjs',
                    'optimizeLodashImports',
                    'convertImgToNextImage',
                    'addDynamicImports',
                    'convertSSRToISR',
                    'convertSSRToSSG',
                    'addImageOptimization'
                  ],
                  description: 'Type of transformation to apply'
                },
                filePath: {
                  type: 'string',
                  description: 'Path to the file to transform'
                },
                options: {
                  type: 'object',
                  properties: {
                    dryRun: {
                      type: 'boolean',
                      description: 'Preview changes without applying them'
                    },
                    backup: {
                      type: 'boolean',
                      description: 'Create backup file before transformation'
                    }
                  }
                }
              },
              required: ['transformType', 'filePath']
            }
          },
          {
            name: 'startDevServer',
            description: 'Starts a local development server for testing if not already running',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the Next.js project root'
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'generatePerformanceReport',
            description: 'Generates a comprehensive performance report with recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                bundleData: {
                  type: 'object',
                  description: 'Bundle analysis results'
                },
                lighthouseData: {
                  type: 'object',
                  description: 'Lighthouse audit results'
                },
                dataFetchingData: {
                  type: 'object',
                  description: 'Data fetching analysis results'
                }
              },
              required: ['bundleData', 'lighthouseData']
            }
          },
          {
            name: 'runPerformanceAgent',
            description: 'Runs the autonomous Performance Agent that analyzes and automatically optimizes a Next.js project using Lighthouse, bundle analysis, and code transforms. The agent decides what to fix and applies changes end-to-end.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Absolute path to the Next.js project root'
                },
                url: {
                  type: 'string',
                  description: 'URL for Lighthouse audit. If omitted the agent starts the dev server.'
                },
                dryRun: {
                  type: 'boolean',
                  description: 'When true, preview changes without applying them to disk (default: false)'
                },
                device: {
                  type: 'string',
                  enum: ['mobile', 'desktop'],
                  description: 'Device emulation for Lighthouse (default: mobile)'
                },
                throttling: {
                  type: 'string',
                  enum: ['simulated3G', 'simulated4G', 'none'],
                  description: 'Network throttling preset (default: simulated3G)'
                }
              },
              required: ['projectPath']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!args) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (name) {
          case 'analyzeBundle': {
            const result = await analyzeBundle(args.projectPath as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'runLighthouse': {
            const result = await runLighthouse(args.url as string, args.options || {});
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'scanDataFetching': {
            const result = await scanDataFetching(args.projectPath as string, args.pagesPath as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'applyCodeTransform': {
            const result = await applyCodeTransform(
              args.transformType as TransformType,
              args.filePath as string,
              args.options || {}
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'startDevServer': {
            const url = await startLocalServer(args.projectPath as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ url, success: true }, null, 2)
                }
              ]
            };
          }

          case 'generatePerformanceReport': {
            const report = generatePerformanceReport(
              args.bundleData,
              args.lighthouseData,
              args.dataFetchingData
            );
            return {
              content: [
                {
                  type: 'text',
                  text: report
                }
              ]
            };
          }

          case 'runPerformanceAgent': {
            const agent = new PerformanceAgent();
            const result = await agent.run(args.projectPath as string, {
              url: args.url as string | undefined,
              dryRun: args.dryRun as boolean | undefined,
              device: args.device as 'mobile' | 'desktop' | undefined,
              throttling: args.throttling as 'simulated3G' | 'simulated4G' | 'none' | undefined,
              verbose: false,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: result.report || JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Tool execution failed [${name}]:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Frontend Performance Agent MCP server running on stdio');
  }
}

function generatePerformanceReport(
  bundleData: any,
  lighthouseData: any,
  dataFetchingData?: any
): string {
  const report = [];
  
  report.push('# 🚀 Frontend Performance Analysis Report\n');
  
  // Executive Summary
  report.push('## Executive Summary\n');
  report.push(`- **Bundle Size**: ${(bundleData.totalSize / 1024 / 1024).toFixed(2)}MB`);
  report.push(`- **Performance Score**: ${lighthouseData.performanceScore}/100`);
  report.push(`- **LCP**: ${(lighthouseData.metrics.lcp / 1000).toFixed(2)}s`);
  report.push(`- **CLS**: ${lighthouseData.metrics.cls.toFixed(3)}`);
  if (dataFetchingData) {
    report.push(`- **Total Pages**: ${dataFetchingData.summary.totalPages}`);
  }
  report.push('');
  
  // Bundle Analysis
  report.push('## 📦 Bundle Analysis\n');
  if (bundleData.heavyDependencies?.length > 0) {
    report.push('### Heavy Dependencies');
    bundleData.heavyDependencies.forEach((dep: any) => {
      report.push(`- **${dep.name}**: ${(dep.size / 1024).toFixed(1)}kb - ${dep.reason}`);
      if (dep.suggestedReplacement) {
        report.push(`  → *Suggested replacement: ${dep.suggestedReplacement}*`);
      }
    });
    report.push('');
  }
  
  if (bundleData.treeshakingOpportunities?.length > 0) {
    report.push('### Tree-shaking Opportunities');
    bundleData.treeshakingOpportunities.forEach((opp: any) => {
      report.push(`- **${opp.library}**: Potential savings of ${(opp.estimatedSavings / 1024).toFixed(1)}kb`);
      report.push(`  → Change from: \`${opp.currentImport}\``);
      report.push(`  → Change to: \`${opp.suggestedImport}\``);
    });
    report.push('');
  }
  
  // Performance Analysis
  report.push('## ⚡ Performance Analysis\n');
  const recommendations = generateRecommendations(lighthouseData);
  if (recommendations.length > 0) {
    report.push('### Recommendations');
    recommendations.forEach(rec => {
      report.push(`- ${rec}`);
    });
    report.push('');
  }
  
  if (lighthouseData.opportunities?.length > 0) {
    report.push('### Optimization Opportunities');
    lighthouseData.opportunities
      .filter((opp: any) => opp.impact === 'high')
      .forEach((opp: any) => {
        report.push(`- **${opp.title}**: ${(opp.savings / 1000).toFixed(2)}s savings`);
      });
    report.push('');
  }
  
  // Data Fetching Analysis
  if (dataFetchingData?.pages?.length > 0) {
    report.push('## 🔄 Data Fetching Analysis\n');
    const optimizablePages = dataFetchingData.pages.filter((page: any) => 
      page.currentMethod !== page.recommendedMethod
    );
    
    if (optimizablePages.length > 0) {
      report.push('### Pages with Optimization Opportunities');
      optimizablePages.forEach((page: any) => {
        report.push(`- **${page.filePath}**: ${page.currentMethod} → ${page.recommendedMethod}`);
        report.push(`  → ${page.reasoning}`);
        if (page.autoFixable) {
          report.push(`  → ✅ *Auto-fixable*`);
        }
      });
      report.push('');
    }
  }
  
  // Quick Wins
  report.push('## 🎯 Quick Wins\n');
  const quickWins = [];
  
  if (bundleData.heavyDependencies?.some((dep: any) => dep.name === 'moment')) {
    quickWins.push('Replace moment.js with dayjs (auto-fixable)');
  }
  if (bundleData.heavyDependencies?.some((dep: any) => dep.name === 'lodash')) {
    quickWins.push('Optimize lodash imports for tree-shaking (auto-fixable)');
  }
  if (lighthouseData.opportunities?.some((opp: any) => opp.id === 'modern-image-formats')) {
    quickWins.push('Convert images to Next.js Image component (auto-fixable)');
  }
  
  if (quickWins.length > 0) {
    quickWins.forEach(win => {
      report.push(`- ${win}`);
    });
  } else {
    report.push('No immediate quick wins identified. Focus on the recommendations above.');
  }
  
  report.push('\n---\n');
  report.push('*Generated by Frontend Performance Agent*');
  
  return report.join('\n');
}

// Start the server
const server = new FrontendPerformanceServer();
server.run().catch(console.error);