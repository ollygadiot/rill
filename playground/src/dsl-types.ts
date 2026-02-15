/** DSL type declarations fed to Monaco for autocomplete */
export const DSL_TYPE_DECLARATIONS = `
declare module "rill" {
  export interface Expression {
    readonly value: string;
  }

  export interface ElementRef {
    readonly id: string;
  }

  export type VarType = StringConstructor | BooleanConstructor | NumberConstructor | DateConstructor;

  export interface Var {
    readonly name: string;
    readonly varType: VarType;
  }

  export interface ProcessOptions {
    name?: string;
    isExecutable?: boolean;
  }

  export interface ServiceOptions {
    name?: string;
    delegate?: string;
    class?: string;
    fields?: Record<string, string | Expression>;
    async?: boolean;
    in?: Var[];
    out?: Record<string, VarType>;
  }

  export interface ScriptOptions {
    name?: string;
    format?: string;
    script: string;
    autoStoreVariables?: boolean;
    in?: Var[];
    out?: Record<string, VarType>;
  }

  export interface UserOptions {
    name?: string;
    assignee?: string;
    candidateGroups?: string[];
    formKey?: string;
    form?: Record<string, { type: string; required?: boolean }>;
    in?: Var[];
    out?: Record<string, VarType>;
  }

  export interface GatewayOptions {
    name?: string;
    default?: string;
  }

  export interface ParallelOptions {
    name?: string;
  }

  export interface TimerBoundaryOptions {
    attachedTo: ElementRef;
    interrupting?: boolean;
    duration?: string;
    date?: string;
    cycle?: string;
  }

  export interface TimerCatchOptions {
    name?: string;
    duration?: string;
    date?: string;
    cycle?: string;
  }

  export interface ErrorBoundaryOptions {
    attachedTo: ElementRef;
    errorRef: string;
  }

  export interface SubProcessOptions {
    name?: string;
  }

  export interface CallActivityOptions {
    name?: string;
    calledElement: string;
    inheritVariables?: boolean;
    in?: Record<string, string | Expression>;
    out?: Record<string, string>;
  }

  export interface FlowOptions {
    id?: string;
    name?: string;
    condition?: string;
  }

  export interface ProcessDefinition {
    readonly id: string;
    readonly name?: string;
    readonly isExecutable: boolean;
  }

  export class ProcessBuilder {
    /** Declare a process-level input variable */
    var(name: string, varType: VarType): Var;
    start(id: string, options?: { name?: string }): ElementRef;
    end(id: string): ElementRef;
    service<O extends Record<string, VarType>>(id: string, options: ServiceOptions & { out: O }): ElementRef & { [K in keyof O]: Var };
    service(id: string, options: ServiceOptions): ElementRef;
    script<O extends Record<string, VarType>>(id: string, options: ScriptOptions & { out: O }): ElementRef & { [K in keyof O]: Var };
    script(id: string, options: ScriptOptions): ElementRef;
    user<O extends Record<string, VarType>>(id: string, options: UserOptions & { out: O }): ElementRef & { [K in keyof O]: Var };
    user(id: string, options: UserOptions): ElementRef;
    gateway(id: string, options?: GatewayOptions): ElementRef;
    parallel(id: string, options?: ParallelOptions): ElementRef;
    timer(id: string, options: TimerBoundaryOptions): ElementRef;
    timerCatch(id: string, options: TimerCatchOptions): ElementRef;
    errorBoundary(id: string, options: ErrorBoundaryOptions): ElementRef;
    subprocess(id: string, builderFn: (sub: ProcessBuilder) => void, options?: SubProcessOptions): ElementRef;
    call(id: string, options: CallActivityOptions): ElementRef;
    error(id: string, errorCode: string): void;
    /** Chain elements linearly: pipe(a, b, c) creates flows a→b and b→c */
    pipe(...refs: ElementRef[]): void;
    flow(source: ElementRef, target: ElementRef, condition?: string | Var | FlowOptions): void;
  }

  export function expr(value: string): Expression;
  export function isVar(value: unknown): value is Var;
  export function process(id: string, builderFn: (p: ProcessBuilder) => void, options?: ProcessOptions): ProcessDefinition;
  export function toBpmn(definition: ProcessDefinition): string;
}
`;
