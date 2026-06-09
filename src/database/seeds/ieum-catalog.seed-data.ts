import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProjectFeatureDescription, ProjectMemberRole, ProjectStackCategory, ProjectStackGroup } from '../entities';

interface SeedMember {
  name: string;
  roleText: string;
}

export interface SeedProject {
  catalogId: number;
  serviceName: string;
  boothSlot: string;
  experienceCategory: string;
  description: string;
  features: ProjectFeatureDescription[];
  stacks: string[];
  members: SeedMember[];
  thumbnailPath: string;
  acceptsFeedback: boolean;
}

const STACK_GROUPS: readonly { category: ProjectStackCategory; color: string; items: readonly string[] }[] = [
  { category: 'Language', color: '#5EAEDB', items: ['Java', 'Python', 'C', 'C#', 'HTML5', 'CSS3', 'PHP', 'JavaScript', 'TypeScript'] },
  { category: 'Framework', color: '#F09DC0', items: ['NestJS', 'Spring', 'Spring Boot', 'React', 'React Native', 'Node.js', 'Express.js', 'Flask', 'Flutter', 'Vite', 'Next.js'] },
  { category: 'Database', color: '#EE827A', items: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQLite', 'Redis', 'Elasticsearch', 'Firebase', 'Supabase'] },
  { category: 'Tools & Container', color: '#24AE53', items: ['Git', 'GitHub', 'VSCode', 'IntelliJ', 'AWS', 'Docker', 'Kubernetes', 'Ubuntu', 'Cloudflare R2', 'Playwright', 'Prisma', 'ESLint', 'Figma'] },
  { category: 'External API / AI', color: '#F9D062', items: ['MediaPipe Hands', 'MediaPipe Face Landmarker', 'RAG', 'Ontology'] }
];

const STACK_LOOKUP = new Map<string, ProjectStackCategory>(
  STACK_GROUPS.flatMap((group) => group.items.map((item) => [item.toLowerCase(), group.category])),
);

export function loadIeumCatalogProjects(): SeedProject[] {
  const path = join(__dirname, 'ieum-catalog.projects.json');
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('IEUM catalog seed data must be an array');
  }
  return raw.map(parseSeedProject);
}

export function buildStackGroups(stacks: readonly string[]): ProjectStackGroup[] {
  const groups: ProjectStackGroup[] = STACK_GROUPS.map((group) => ({
    category: group.category,
    color: group.color,
    items: []
  }));
  for (const stack of stacks) {
    const normalized = normalizeStack(stack);
    const category = stackCategoryFor(normalized);
    for (const group of groups) {
      if (group.category !== category) continue;
      if (!group.items.includes(normalized)) {
        group.items.push(normalized);
      }
      break;
    }
  }
  return groups.filter((group) => group.items.length > 0);
}

export function flattenStackGroups(groups: readonly ProjectStackGroup[]): string[] {
  return groups.flatMap((group) => group.items);
}

export function rolesFromText(roleText: string): ProjectMemberRole[] {
  const normalized = roleText.toLowerCase();
  const roles = new Set<ProjectMemberRole>();
  if (normalized.includes('full')) {
    roles.add(ProjectMemberRole.Backend);
    roles.add(ProjectMemberRole.Frontend);
  }
  if (normalized.includes('front') || normalized.includes('fe')) {
    roles.add(ProjectMemberRole.Frontend);
  }
  if (normalized.includes('back') || normalized.includes('be') || normalized.includes('db')) {
    roles.add(ProjectMemberRole.Backend);
  }
  if (normalized.includes('design') || normalized.includes('desing')) {
    roles.add(ProjectMemberRole.Design);
  }
  if (normalized.includes('pm') || normalized.includes('plan')) {
    roles.add(ProjectMemberRole.ProductManager);
  }
  if (normalized.includes('ai')) {
    roles.add(ProjectMemberRole.Ai);
  }
  return [...roles];
}

function normalizeStack(stack: string): string {
  const trimmed = stack.trim();
  if (trimmed.toLowerCase() === 'express') return 'Express.js';
  if (trimmed.toLowerCase() === 'node') return 'Node.js';
  if (trimmed.toLowerCase() === 'postgres') return 'PostgreSQL';
  return trimmed;
}

function stackCategoryFor(stack: string): ProjectStackCategory {
  const direct = STACK_LOOKUP.get(stack.toLowerCase());
  if (direct) return direct;
  if (stack.endsWith('.js') || stack.endsWith('JS')) return 'Framework';
  if (stack.toLowerCase().includes('api') || stack.toLowerCase().includes('ai')) return 'External API / AI';
  return 'Tools & Container';
}

function parseSeedProject(value: unknown, index: number): SeedProject {
  const record = expectRecord(value, `project[${index}]`);
  return {
    catalogId: expectNumber(record.catalogId, `project[${index}].catalogId`),
    serviceName: expectString(record.serviceName, `project[${index}].serviceName`),
    boothSlot: expectString(record.boothSlot, `project[${index}].boothSlot`),
    experienceCategory: expectString(record.experienceCategory, `project[${index}].experienceCategory`),
    description: expectString(record.description, `project[${index}].description`),
    features: expectArray(record.features, `project[${index}].features`).map(parseFeature),
    stacks: expectArray(record.stacks, `project[${index}].stacks`).map((stack, stackIndex) => expectString(stack, `project[${index}].stacks[${stackIndex}]`)),
    members: expectArray(record.members, `project[${index}].members`).map(parseMember),
    thumbnailPath: expectString(record.thumbnailPath, `project[${index}].thumbnailPath`),
    acceptsFeedback: record.acceptsFeedback === undefined ? true : expectBoolean(record.acceptsFeedback, `project[${index}].acceptsFeedback`)
  };
}

function parseFeature(value: unknown, index: number): ProjectFeatureDescription {
  const record = expectRecord(value, `feature[${index}]`);
  return {
    title: expectString(record.title, `feature[${index}].title`),
    description: expectString(record.description, `feature[${index}].description`)
  };
}

function parseMember(value: unknown, index: number): SeedMember {
  const record = expectRecord(value, `member[${index}]`);
  return {
    name: expectString(record.name, `member[${index}].name`),
    roleText: expectString(record.roleText, `member[${index}].roleText`)
  };
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function expectNumber(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}
