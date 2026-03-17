import jscodeshift from 'jscodeshift';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { CodeTransformResult } from '../types/index.js';

export type TransformType = 
  | 'replaceMomentWithDayjs'
  | 'optimizeLodashImports'
  | 'convertImgToNextImage'
  | 'addDynamicImports'
  | 'convertSSRToISR'
  | 'convertSSRToSSG'
  | 'addImageOptimization';

export interface TransformOptions {
  dryRun?: boolean;
  backup?: boolean;
  projectPath?: string;
}

export async function applyCodeTransform(
  transformType: TransformType,
  filePath: string,
  options: TransformOptions = {}
): Promise<CodeTransformResult> {
  const { dryRun = false, backup = true } = options;
  
  try {
    console.log(`🔧 Applying ${transformType} to ${filePath}...`);
    
    // Read original file
    const originalContent = await fs.readFile(filePath, 'utf-8');
    
    // Create backup if requested
    if (backup && !dryRun) {
      const backupPath = `${filePath}.backup`;
      await fs.writeFile(backupPath, originalContent);
    }
    
    // Apply transformation
    const transformedContent = await runTransformation(transformType, originalContent, filePath);
    
    // Calculate diff
    const diff = generateDiff(originalContent, transformedContent);
    
    // Write transformed content if not dry run
    if (!dryRun && transformedContent !== originalContent) {
      await fs.writeFile(filePath, transformedContent);
    }
    
    const changes = extractChanges(diff);
    
    return {
      success: true,
      changes,
      diff: diff.length > 0 ? diff : undefined,
      filePath,
      transformType,
    } as CodeTransformResult;
    
  } catch (error) {
    return {
      success: false,
      changes: [],
      error: `Transform failed: ${error}`,
      filePath,
      transformType,
    };
  }
}

async function runTransformation(
  transformType: TransformType,
  source: string,
  filePath: string
): Promise<string> {
  const j = jscodeshift.withParser('tsx');
  const root = j(source);
  
  switch (transformType) {
    case 'replaceMomentWithDayjs':
      return replaceMomentWithDayjs(root, j);
    case 'optimizeLodashImports':
      return optimizeLodashImports(root, j);
    case 'convertImgToNextImage':
      return convertImgToNextImage(root, j);
    case 'addDynamicImports':
      return addDynamicImports(root, j, filePath);
    case 'convertSSRToISR':
      return convertSSRToISR(root, j);
    case 'convertSSRToSSG':
      return convertSSRToSSG(root, j);
    case 'addImageOptimization':
      return addImageOptimization(root, j);
    default:
      throw new Error(`Unknown transform type: ${transformType}`);
  }
}

function replaceMomentWithDayjs(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  
  // Replace import statements
  root.find(j.ImportDeclaration)
    .filter((path: any) => path.value.source.value === 'moment')
    .forEach((path: any) => {
      path.value.source.value = 'dayjs';
      hasChanges = true;
    });
  
  // Replace require statements
  root.find(j.CallExpression)
    .filter((path: any) => 
      path.value.callee.name === 'require' &&
      path.value.arguments[0]?.value === 'moment'
    )
    .forEach((path: any) => {
      path.value.arguments[0].value = 'dayjs';
      hasChanges = true;
    });
  
  // Add dayjs plugins if moment features are used
  if (hasChanges) {
    const hasFormat = root.find(j.CallExpression)
      .filter((path: any) => path.value.callee.property?.name === 'format')
      .length > 0;
    
    if (hasFormat) {
      // Add import for dayjs plugins if needed
      root.get().node.body.unshift(
        j.importDeclaration([], j.literal('dayjs/locale/en')),
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('relativeTime'))], 
          j.literal('dayjs/plugin/relativeTime')
        )
      );
    }
  }
  
  return root.toSource();
}

function optimizeLodashImports(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  
  // Find lodash imports
  root.find(j.ImportDeclaration)
    .filter((path: any) => path.value.source.value === 'lodash')
    .forEach((path: any) => {
      const specifiers = path.value.specifiers;
      
      if (specifiers.length === 1 && specifiers[0].type === 'ImportDefaultSpecifier') {
        // Convert default import to specific imports
        const usedFunctions = findLodashUsage(root, specifiers[0].local.name);
        
        if (usedFunctions.length > 0) {
          // Replace with specific imports
          const newImports = usedFunctions.map(func => 
            j.importDeclaration(
              [j.importDefaultSpecifier(j.identifier(func))],
              j.literal(`lodash/${func}`)
            )
          );
          
          // Replace the old import
          j(path).replaceWith(newImports);
          hasChanges = true;
        }
      }
    });
  
  return root.toSource();
}

function convertImgToNextImage(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  let needsImageImport = false;
  
  // Convert <img> to <Image>
  root.find(j.JSXElement)
    .filter((path: any) => path.value.openingElement.name.name === 'img')
    .forEach((path: any) => {
      const element = path.value;
      const attributes = element.openingElement.attributes;
      
      // Change tag name
      element.openingElement.name.name = 'Image';
      if (element.closingElement) {
        element.closingElement.name.name = 'Image';
      }
      
      // Add required width and height if missing
      const hasWidth = attributes.some((attr: any) => attr.name?.name === 'width');
      const hasHeight = attributes.some((attr: any) => attr.name?.name === 'height');
      
      if (!hasWidth) {
        attributes.push(j.jsxAttribute(j.jsxIdentifier('width'), j.literal(600)));
      }
      if (!hasHeight) {
        attributes.push(j.jsxAttribute(j.jsxIdentifier('height'), j.literal(400)));
      }
      
      // Add alt attribute if missing
      const hasAlt = attributes.some((attr: any) => attr.name?.name === 'alt');
      if (!hasAlt) {
        attributes.push(j.jsxAttribute(j.jsxIdentifier('alt'), j.literal('')));
      }
      
      hasChanges = true;
      needsImageImport = true;
    });
  
  // Add Next.js Image import if needed
  if (needsImageImport) {
    const hasImageImport = root.find(j.ImportDeclaration)
      .filter((path: any) => 
        path.value.source.value === 'next/image' &&
        path.value.specifiers.some((spec: any) => spec.local.name === 'Image')
      )
      .length > 0;
    
    if (!hasImageImport) {
      root.get().node.body.unshift(
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('Image'))],
          j.literal('next/image')
        )
      );
    }
  }
  
  return root.toSource();
}

function addDynamicImports(root: any, j: jscodeshift.JSCodeshift, filePath: string): string {
  let hasChanges = false;
  
  // Find large component imports that could be dynamic
  const componentImports = root.find(j.ImportDeclaration)
    .filter((path: any) => {
      const source = path.value.source.value;
      return typeof source === 'string' && 
             (source.includes('components/') || source.includes('modules/')) &&
             !source.includes('node_modules');
    });
  
  componentImports.forEach((path: any) => {
    const importPath = path.value;
    const defaultSpecifier = importPath.specifiers.find((spec: any) => 
      spec.type === 'ImportDefaultSpecifier'
    );
    
    if (defaultSpecifier) {
      const componentName = defaultSpecifier.local.name;
      
      // Check if component is used in JSX (and could be lazy loaded)
      const isUsedInJSX = root.find(j.JSXElement)
        .filter((jsxPath: any) => 
          jsxPath.value.openingElement.name.name === componentName
        )
        .length > 0;
      
      if (isUsedInJSX) {
        // Replace with dynamic import
        const dynamicImport = j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier(componentName),
            j.callExpression(j.identifier('dynamic'), [
              j.arrowFunctionExpression(
                [],
                j.callExpression(j.identifier('import'), [j.literal(importPath.source.value)])
              ),
              j.objectExpression([
                j.property('init', j.identifier('ssr'), j.literal(false))
              ])
            ])
          )
        ]);
        
        j(path).replaceWith(dynamicImport);
        hasChanges = true;
      }
    }
  });
  
  // Add dynamic import if needed
  if (hasChanges) {
    const hasDynamicImport = root.find(j.ImportDeclaration)
      .filter((path: any) => path.value.source.value === 'next/dynamic')
      .length > 0;
    
    if (!hasDynamicImport) {
      root.get().node.body.unshift(
        j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('dynamic'))],
          j.literal('next/dynamic')
        )
      );
    }
  }
  
  return root.toSource();
}

function convertSSRToISR(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  
  // Find getServerSideProps and convert to getStaticProps with revalidate
  root.find(j.FunctionDeclaration)
    .filter((path: any) => path.value.id?.name === 'getServerSideProps')
    .forEach((path: any) => {
      path.value.id.name = 'getStaticProps';
      
      // Add revalidate to return statement
      const returnStatements = j(path).find(j.ReturnStatement);
      returnStatements.forEach((returnPath: any) => {
        const returnValue = returnPath.value.argument;
        if (returnValue.type === 'ObjectExpression') {
          // Add revalidate property
          returnValue.properties.push(
            j.property('init', j.identifier('revalidate'), j.literal(60))
          );
        }
      });
      
      hasChanges = true;
    });
  
  // Also handle exported functions
  root.find(j.ExportNamedDeclaration)
    .filter((path: any) => 
      path.value.declaration?.type === 'FunctionDeclaration' &&
      path.value.declaration?.id?.name === 'getServerSideProps'
    )
    .forEach((path: any) => {
      path.value.declaration.id.name = 'getStaticProps';
      hasChanges = true;
    });
  
  return root.toSource();
}

function convertSSRToSSG(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  
  // Convert getServerSideProps to getStaticProps (without revalidate)
  root.find(j.FunctionDeclaration)
    .filter((path: any) => path.value.id?.name === 'getServerSideProps')
    .forEach((path: any) => {
      path.value.id.name = 'getStaticProps';
      hasChanges = true;
    });
  
  return root.toSource();
}

function addImageOptimization(root: any, j: jscodeshift.JSCodeshift): string {
  let hasChanges = false;
  
  // Add priority prop to images that appear above the fold
  root.find(j.JSXElement)
    .filter((path: any) => path.value.openingElement.name.name === 'Image')
    .slice(0, 1) // First image is likely above the fold
    .forEach((path: any) => {
      const attributes = path.value.openingElement.attributes;
      const hasPriority = attributes.some((attr: any) => attr.name?.name === 'priority');
      
      if (!hasPriority) {
        attributes.push(j.jsxAttribute(j.jsxIdentifier('priority'), null));
        hasChanges = true;
      }
    });
  
  return root.toSource();
}

// Helper functions
function findLodashUsage(root: any, variableName: string): string[] {
  const usedFunctions: string[] = [];
  
  root.find(jscodeshift.MemberExpression)
    .filter((path: any) => path.value.object.name === variableName)
    .forEach((path: any) => {
      if (path.value.property.name) {
        usedFunctions.push(path.value.property.name);
      }
    });
  
  return [...new Set(usedFunctions)]; // Remove duplicates
}

function generateDiff(original: string, transformed: string): string {
  if (original === transformed) return '';
  
  // Simple diff - in production, use a proper diff library
  const originalLines = original.split('\n');
  const transformedLines = transformed.split('\n');
  
  const diff: string[] = [];
  const maxLines = Math.max(originalLines.length, transformedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || '';
    const newLine = transformedLines[i] || '';
    
    if (origLine !== newLine) {
      if (origLine) diff.push(`- ${origLine}`);
      if (newLine) diff.push(`+ ${newLine}`);
    }
  }
  
  return diff.join('\n');
}

function extractChanges(diff: string): string[] {
  if (!diff) return [];
  
  const changes: string[] = [];
  const lines = diff.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('+ ')) {
      const change = line.substring(2).trim();
      if (change.includes('import')) {
        changes.push(`Added import: ${change}`);
      } else if (change.includes('dayjs')) {
        changes.push('Replaced moment.js with dayjs');
      } else if (change.includes('Image')) {
        changes.push('Converted img to Next.js Image component');
      } else if (change.includes('dynamic')) {
        changes.push('Added dynamic import for code splitting');
      } else if (change.includes('getStaticProps')) {
        changes.push('Converted SSR to SSG/ISR');
      }
    }
  }
  
  return changes.length > 0 ? changes : ['Applied code transformation'];
}