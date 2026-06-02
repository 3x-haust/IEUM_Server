import { AgeGroup, ContactStatus, FeedbackStatus, ProjectMemberRole, RealtimeEventType, UserEntity, UserRole, VisitorType } from '../../src/database/entities';

export const ids = {
  project: '11111111-1111-4111-8111-111111111111',
  student: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
  visitor: '44444444-4444-4444-8444-444444444444'
} as const;

export type CursorPage<T> = {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
};

export type Project = {
  readonly id: string;
  readonly serviceName: string;
  readonly teamName: string;
  readonly description: string;
  readonly thumbnailUrl: string | null;
  readonly developmentStacks: readonly string[];
  readonly designStacks: readonly string[];
  readonly isPublished: boolean;
  readonly feedbackCount: number;
  readonly contactCount: number;
  readonly interestCount: number;
  readonly members: readonly { readonly id: string; readonly name: string; readonly displayOrder: number; readonly roles: readonly ProjectMemberRole[] }[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type VisitorProfile = {
  readonly id: string;
  readonly ageGroup: AgeGroup;
  readonly visitorType: VisitorType;
  readonly businessCardFileId: string | null;
  readonly businessCardRegistered: boolean;
  readonly ocrRawText: string | null;
  readonly ocrName: string | null;
  readonly ocrOrganization: string | null;
  readonly ocrPosition: string | null;
  readonly ocrEmail: string | null;
  readonly ocrPhone: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Feedback = {
  readonly id: string;
  readonly projectId: string;
  readonly content: string;
  readonly status: FeedbackStatus;
  readonly moderationReason: string | null;
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Contact = {
  readonly id: string;
  readonly projectId: string;
  readonly visitorProfileId: string;
  readonly targetMemberUserId: string;
  readonly ageGroup: AgeGroup;
  readonly visitorType: VisitorType;
  readonly name: string | null;
  readonly organization: string | null;
  readonly position: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly memo: string | null;
  readonly businessCardFileId: string | null;
  readonly ocrRawText: string | null;
  readonly ocrName: string | null;
  readonly ocrOrganization: string | null;
  readonly ocrPosition: string | null;
  readonly ocrEmail: string | null;
  readonly ocrPhone: string | null;
  readonly status: ContactStatus;
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type RealtimeEvent = {
  readonly id: string;
  readonly type: RealtimeEventType;
  readonly projectId: string | null;
  readonly targetRole: UserRole | null;
  readonly payload: Record<string, unknown>;
  readonly createdAt: Date;
};

export type BannedWord = {
  readonly id: string;
  readonly word: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type E2eStore = {
  readonly users: Map<string, UserEntity>;
  readonly projects: Project[];
  readonly visitors: VisitorProfile[];
  readonly feedback: Feedback[];
  readonly contacts: Contact[];
  readonly events: RealtimeEvent[];
  readonly bannedWords: BannedWord[];
  interestCount: number;
};

export function page<T>(items: readonly T[]): CursorPage<T> {
  return { items, nextCursor: null };
}

export function createUser(id: string, oauthId: string, name: string, role: UserRole): UserEntity {
  return Object.assign(new UserEntity(), {
    id,
    oauthProvider: 'mirim_oauth',
    oauthId,
    name,
    email: `${oauthId}@example.com`,
    role,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z')
  });
}

export function createStore(): E2eStore {
  const student = createUser(ids.student, 'student', 'Student User', UserRole.Student);
  const admin = createUser(ids.admin, 'admin', 'Admin User', UserRole.Admin);
  return {
    users: new Map([['student-session', student], ['admin-session', admin], ['student-token', student], ['admin-token', admin]]),
    projects: [{
      id: ids.project,
      serviceName: 'IEUM',
      teamName: '3xhaust',
      description: '행사 프로젝트 피드백 플랫폼',
      thumbnailUrl: null,
      developmentStacks: ['NestJS', 'PostgreSQL'],
      designStacks: ['Figma'],
      isPublished: true,
      feedbackCount: 0,
      contactCount: 0,
      interestCount: 0,
      members: [{ id: ids.student, name: 'Student User', displayOrder: 0, roles: [ProjectMemberRole.Backend, ProjectMemberRole.Frontend] }],
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z')
    }],
    visitors: [],
    feedback: [],
    contacts: [],
    events: [],
    bannedWords: [{ id: 'banned-1', word: 'blocked', isActive: true, createdAt: new Date(), updatedAt: new Date() }],
    interestCount: 0
  };
}
