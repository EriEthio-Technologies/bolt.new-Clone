import { Service } from 'typedi';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import * as ts from 'typescript';
import { validateEnv } from '~/config/env.server';
import type { 
  DomainContext,
  EntityDefinition,
  ServiceDefinition,
  DependencyGraph,
  ContextMetadata 
} from '~/types/context';
import { execAsync } from '~/utils/execAsync';

@Service()
export class DomainContextExtractor {
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly typeChecker: ts.TypeChecker;

  constructor() {
    this.env = validateEnv();
    const program = ts.createProgram(
      this.getProjectFiles(),
      { allowJs: true, checkJs: true }
    );
    this.typeChecker = program.getTypeChecker();
  }

  async extractContext(rootPath: string): Promise<DomainContext> {
    try {
      const [
        entities,
        services,
        dependencies,
        metadata
      ] = await Promise.all([
        this.extractEntities(rootPath),
        this.extractServices(rootPath),
        this.buildDependencyGraph(rootPath),
        this.generateContextMetadata(rootPath)
      ]);

      return {
        entities,
        services,
        dependencies,
        metadata,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to extract domain context:', error);
      throw new Error(`Domain context extraction failed: ${error.message}`);
    }
  }

  private async extractEntities(rootPath: string): Promise<EntityDefinition[]> {
    const entities: EntityDefinition[] = [];
    const typeFiles = await this.findTypeDefinitions(rootPath);

    for (const file of typeFiles) {
      const sourceFile = ts.createSourceFile(
        file,
        await readFile(file, 'utf-8'),
        ts.ScriptTarget.Latest,
        true
      );

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
          const symbol = this.typeChecker.getSymbolAtLocation(node.name!);
          if (!symbol) return;

          const properties = this.extractProperties(symbol);
          const relations = this.extractRelations(symbol);
          const documentation = ts.displayPartsToString(
            symbol.getDocumentationComment(this.typeChecker)
          );

          entities.push({
            name: node.name!.text,
            type: ts.isInterfaceDeclaration(node) ? 'interface' : 'class',
            properties,
            relations,
            documentation,
            file: file.replace(rootPath, ''),
            metadata: {
              isAbstract: node.modifiers?.some(
                m => m.kind === ts.SyntaxKind.AbstractKeyword
              ) || false,
              decorators: this.extractDecorators(node)
            }
          });
        }
      });
    }

    return entities;
  }

  private async extractServices(rootPath: string): Promise<ServiceDefinition[]> {
    const services: ServiceDefinition[] = [];
    const serviceFiles = await this.findServiceDefinitions(rootPath);

    for (const file of serviceFiles) {
      const sourceFile = ts.createSourceFile(
        file,
        await readFile(file, 'utf-8'),
        ts.ScriptTarget.Latest,
        true
      );

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node) && 
            node.decorators?.some(d => 
              (d.expression as ts.Identifier).text === 'Service'
            )) {
          const symbol = this.typeChecker.getSymbolAtLocation(node.name!);
          if (!symbol) return;

          const methods = this.extractMethods(symbol);
          const dependencies = this.extractDependencies(node);
          const documentation = ts.displayPartsToString(
            symbol.getDocumentationComment(this.typeChecker)
          );

          services.push({
            name: node.name!.text,
            methods,
            dependencies,
            documentation,
            file: file.replace(rootPath, ''),
            metadata: {
              isAsync: methods.some(m => m.isAsync),
              hasTests: this.hasAssociatedTests(file),
              metrics: this.calculateServiceMetrics(node)
            }
          });
        }
      });
    }

    return services;
  }

  private async buildDependencyGraph(rootPath: string): Promise<DependencyGraph> {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: []
    };

    const files = await this.getAllSourceFiles(rootPath);
    for (const file of files) {
      const sourceFile = ts.createSourceFile(
        file,
        await readFile(file, 'utf-8'),
        ts.ScriptTarget.Latest,
        true
      );

      const imports = this.extractImports(sourceFile);
      const exports = this.extractExports(sourceFile);

      graph.nodes.set(file.replace(rootPath, ''), {
        imports,
        exports,
        type: this.determineFileType(file)
      });

      imports.forEach(imp => {
        graph.edges.push({
          from: file.replace(rootPath, ''),
          to: this.resolveImportPath(imp.path, file),
          type: imp.type
        });
      });
    }

    return graph;
  }

  private async generateContextMetadata(rootPath: string): Promise<ContextMetadata> {
    const files = await this.getAllSourceFiles(rootPath);
    const stats = await Promise.all(
      files.map(f => this.analyzeFile(f))
    );

    return {
      totalFiles: files.length,
      totalLines: stats.reduce((acc, s) => acc + s.lines, 0),
      fileTypes: this.aggregateFileTypes(stats),
      complexity: this.calculateOverallComplexity(stats),
      coverage: await this.getTestCoverage(),
      lastUpdated: new Date(),
      version: this.env.APP_VERSION
    };
  }

  // Helper methods...
  private extractProperties(symbol: ts.Symbol): any[] {
    return symbol.members ? 
      Array.from(symbol.members.values()).map(member => ({
        name: member.getName(),
        type: this.typeChecker.typeToString(
          this.typeChecker.getTypeOfSymbolAtLocation(
            member,
            member.valueDeclaration!
          )
        ),
        optional: this.isOptionalProperty(member),
        documentation: ts.displayPartsToString(
          member.getDocumentationComment(this.typeChecker)
        )
      })) : [];
  }

  private extractRelations(symbol: ts.Symbol): EntityDefinition['relations'] {
    const relations: EntityDefinition['relations'] = [];
    
    if (!symbol.members) return relations;

    Array.from(symbol.members.values()).forEach(member => {
      const type = this.typeChecker.getTypeOfSymbolAtLocation(
        member,
        member.valueDeclaration!
      );
      const typeString = this.typeChecker.typeToString(type);

      // Check for relation decorators or type patterns
      const isOneToOne = typeString.includes('OneToOne');
      const isOneToMany = typeString.includes('OneToMany');
      const isManyToOne = typeString.includes('ManyToOne');
      const isManyToMany = typeString.includes('ManyToMany');

      if (isOneToOne || isOneToMany || isManyToOne || isManyToMany) {
        relations.push({
          type: isOneToOne ? 'oneToOne' :
                isOneToMany ? 'oneToMany' :
                isManyToOne ? 'manyToOne' : 'manyToMany',
          target: this.extractRelationTarget(type),
          propertyName: member.getName(),
          isOptional: this.isOptionalProperty(member)
        });
      }
    });

    return relations;
  }

  private extractRelationTarget(type: ts.Type): string {
    const typeString = this.typeChecker.typeToString(type);
    const match = typeString.match(/<([^>]+)>/);
    return match ? match[1].trim() : typeString;
  }

  private extractDecorators(node: ts.Node): EntityDefinition['metadata']['decorators'] {
    return node.decorators?.map(decorator => {
      const expression = decorator.expression as ts.CallExpression;
      return {
        name: (expression.expression as ts.Identifier).text,
        arguments: expression.arguments.map(arg => 
          this.extractDecoratorArgument(arg)
        )
      };
    }) || [];
  }

  private extractDecoratorArgument(arg: ts.Expression): any {
    if (ts.isObjectLiteralExpression(arg)) {
      const obj: Record<string, any> = {};
      arg.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop)) {
          obj[prop.name.getText()] = this.extractDecoratorArgument(prop.initializer);
        }
      });
      return obj;
    }
    
    if (ts.isStringLiteral(arg)) return arg.text;
    if (ts.isNumericLiteral(arg)) return Number(arg.text);
    if (ts.isBooleanLiteral(arg)) return arg.kind === ts.SyntaxKind.TrueKeyword;
    
    return arg.getText();
  }

  private extractMethods(symbol: ts.Symbol): ServiceDefinition['methods'] {
    const methods: ServiceDefinition['methods'] = [];
    
    if (!symbol.members) return methods;

    Array.from(symbol.members.values()).forEach(member => {
      if (!member.valueDeclaration || !ts.isMethodDeclaration(member.valueDeclaration)) {
        return;
      }

      const declaration = member.valueDeclaration;
      const signature = this.typeChecker.getSignatureFromDeclaration(declaration);
      
      if (!signature) return;

      methods.push({
        name: member.getName(),
        returnType: this.typeChecker.typeToString(
          this.typeChecker.getReturnTypeOfSignature(signature)
        ),
        parameters: this.extractParameters(signature),
        documentation: ts.displayPartsToString(
          member.getDocumentationComment(this.typeChecker)
        ),
        isAsync: declaration.modifiers?.some(
          m => m.kind === ts.SyntaxKind.AsyncKeyword
        ) || false,
        visibility: this.getMethodVisibility(declaration)
      });
    });

    return methods;
  }

  private extractParameters(signature: ts.Signature): Array<{
    name: string;
    type: string;
    optional: boolean;
  }> {
    return signature.parameters.map(param => ({
      name: param.getName(),
      type: this.typeChecker.typeToString(
        this.typeChecker.getTypeOfSymbolAtLocation(
          param,
          param.valueDeclaration!
        )
      ),
      optional: !!param.valueDeclaration?.getChildren().some(
        child => child.kind === ts.SyntaxKind.QuestionToken
      )
    }));
  }

  private getMethodVisibility(
    declaration: ts.MethodDeclaration
  ): 'public' | 'private' | 'protected' {
    if (declaration.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
      return 'private';
    }
    if (declaration.modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    }
    return 'public';
  }

  private extractDependencies(node: ts.ClassDeclaration): ServiceDefinition['dependencies'] {
    const dependencies: ServiceDefinition['dependencies'] = [];
    
    // Check constructor parameters for injected dependencies
    const constructor = node.members.find(
      member => ts.isConstructorDeclaration(member)
    ) as ts.ConstructorDeclaration;

    if (!constructor) return dependencies;

    constructor.parameters.forEach(param => {
      if (!param.type) return;

      const type = this.typeChecker.getTypeFromTypeNode(param.type);
      const symbol = type.getSymbol();
      
      if (!symbol) return;

      dependencies.push({
        service: symbol.getName(),
        type: param.questionToken ? 'optional' : 'required'
      });
    });

    return dependencies;
  }

  private hasAssociatedTests(file: string): boolean {
    const testFile = file.replace(/\.(ts|tsx)$/, '.test.$1');
    const testDirFile = file.replace(
      /^(.*?\/)[^/]+\.(ts|tsx)$/,
      '$1__tests__/$2'
    );
    
    try {
      return (
        ts.sys.fileExists(testFile) || 
        ts.sys.fileExists(testDirFile)
      );
    } catch {
      return false;
    }
  }

  private calculateServiceMetrics(node: ts.ClassDeclaration): ServiceDefinition['metadata']['metrics'] {
    let complexity = 0;
    let dependencies = 0;
    
    // Calculate cyclomatic complexity
    function walk(node: ts.Node) {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.SwitchCase:
          complexity++;
          break;
        case ts.SyntaxKind.CallExpression:
          if (ts.isPropertyAccessExpression((node as ts.CallExpression).expression)) {
            dependencies++;
          }
          break;
      }
      ts.forEachChild(node, walk);
    }
    walk(node);

    // Get test coverage if available
    const coverage = this.getMethodCoverage(node);

    return {
      complexity,
      dependencies,
      coverage
    };
  }

  private getMethodCoverage(node: ts.ClassDeclaration): number {
    try {
      const coverage = require(join(process.cwd(), 'coverage/coverage-summary.json'));
      const fileName = node.getSourceFile().fileName;
      const relativePath = fileName.replace(process.cwd(), '');
      
      return coverage[relativePath]?.statements?.pct || 0;
    } catch {
      return 0;
    }
  }

  private getProjectFiles(): string[] {
    const tsconfigPath = ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!tsconfigPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const { fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      process.cwd()
    );

    return fileNames;
  }

  private async findTypeDefinitions(rootPath: string): Promise<string[]> {
    const files = await this.getAllSourceFiles(rootPath);
    return files.filter(file => 
      file.includes('/types/') || 
      file.includes('/interfaces/') || 
      file.includes('/models/')
    );
  }

  private async findServiceDefinitions(rootPath: string): Promise<string[]> {
    const files = await this.getAllSourceFiles(rootPath);
    return files.filter(file => 
      file.includes('/services/') || 
      file.includes('/providers/') || 
      file.includes('/controllers/')
    );
  }

  private isOptionalProperty(symbol: ts.Symbol): boolean {
    return symbol.valueDeclaration?.getChildren().some(
      child => child.kind === ts.SyntaxKind.QuestionToken
    ) || false;
  }

  private async getAllSourceFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const path = join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await walk(path);
        } else if (
          entry.isFile() && 
          (path.endsWith('.ts') || path.endsWith('.tsx')) &&
          !path.endsWith('.d.ts')
        ) {
          files.push(path);
        }
      }
    }

    await walk(rootPath);
    return files;
  }

  private extractImports(sourceFile: ts.SourceFile): DependencyGraph['nodes']['values']['next']['imports'] {
    const imports: DependencyGraph['nodes']['values']['next']['imports'] = [];
    
    ts.forEachChild(sourceFile, node => {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        const importClause = node.importClause;
        
        if (importClause) {
          if (importClause.name) {
            imports.push({
              name: importClause.name.text,
              path: importPath,
              type: 'value'
            });
          }
          
          if (importClause.namedBindings) {
            if (ts.isNamedImports(importClause.namedBindings)) {
              importClause.namedBindings.elements.forEach(element => {
                imports.push({
                  name: element.name.text,
                  path: importPath,
                  type: this.determineImportType(element)
                });
              });
            }
          }
        }
      }
    });

    return imports;
  }

  private determineImportType(element: ts.ImportSpecifier): 'type' | 'value' | 'namespace' {
    if (element.isTypeOnly) return 'type';
    if (element.propertyName?.text.startsWith('namespace')) return 'namespace';
    return 'value';
  }

  private extractExports(sourceFile: ts.SourceFile): DependencyGraph['nodes']['values']['next']['exports'] {
    const exports: DependencyGraph['nodes']['values']['next']['exports'] = [];
    
    ts.forEachChild(sourceFile, node => {
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            exports.push({
              name: element.name.text,
              type: this.determineExportType(element)
            });
          });
        }
      }
    });

    return exports;
  }

  private determineExportType(element: ts.ExportSpecifier): 'type' | 'value' | 'namespace' {
    if (element.isTypeOnly) return 'type';
    const symbol = this.typeChecker.getSymbolAtLocation(element.name);
    if (!symbol) return 'value';
    
    return symbol.flags & ts.SymbolFlags.Type ? 'type' :
           symbol.flags & ts.SymbolFlags.Namespace ? 'namespace' : 'value';
  }

  private determineFileType(file: string): DependencyGraph['nodes']['values']['next']['type'] {
    if (file.includes('/types/') || file.includes('/interfaces/')) return 'entity';
    if (file.includes('/services/') || file.includes('/providers/')) return 'service';
    if (file.includes('/__tests__/') || file.includes('.test.')) return 'test';
    if (file.includes('/config/')) return 'config';
    return 'util';
  }

  private resolveImportPath(importPath: string, currentFile: string): string {
    if (importPath.startsWith('.')) {
      return join(currentFile, '..', importPath).replace(/\\/g, '/');
    }
    return importPath;
  }

  private async analyzeFile(file: string): Promise<{
    lines: number;
    complexity: number;
    type: string;
  }> {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n').length;
    
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let complexity = 0;
    function walk(node: ts.Node) {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.SwitchCase:
          complexity++;
          break;
      }
      ts.forEachChild(node, walk);
    }
    walk(sourceFile);

    return {
      lines,
      complexity,
      type: this.determineFileType(file)
    };
  }

  private aggregateFileTypes(stats: Array<{ type: string }>): Record<string, number> {
    return stats.reduce((acc, stat) => {
      acc[stat.type] = (acc[stat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateOverallComplexity(
    stats: Array<{ complexity: number }>
  ): ContextMetadata['complexity'] {
    const complexities = stats.map(s => s.complexity);
    const total = complexities.reduce((acc, c) => acc + c, 0);
    
    return {
      average: total / complexities.length,
      highest: Math.max(...complexities),
      distribution: complexities.reduce((acc, c) => {
        const range = Math.floor(c / 5) * 5;
        acc[`${range}-${range + 4}`] = (acc[`${range}-${range + 4}`] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private async getTestCoverage(): Promise<ContextMetadata['coverage']> {
    try {
      const { stdout } = await execAsync('jest --coverage --coverageReporters=json-summary');
      const coverage = JSON.parse(stdout);
      
      return {
        lines: coverage.total.lines.pct,
        functions: coverage.total.functions.pct,
        branches: coverage.total.branches.pct,
        statements: coverage.total.statements.pct
      };
    } catch (error) {
      console.error('Failed to get test coverage:', error);
      return {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      };
    }
  }
} 