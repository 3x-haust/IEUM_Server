import { createUser, E2eStore, page, Project } from './fixtures';

type LoginSession = {
  readonly token: string;
  readonly user: ReturnType<typeof createUser>;
};

export class FakeAuthService {
  readonly cookieName = 'ieum_auth';

  constructor(private readonly store: E2eStore) {}

  async loginWithMirimToken(accessToken: string): Promise<LoginSession> {
    const token = accessToken.includes('admin') ? 'admin-session' : 'student-session';
    const user = this.store.users.get(token);
    if (!user) {
      throw new Error(`Missing fake user for ${token}`);
    }
    return { token, user };
  }

  async verifySessionToken(token: string): Promise<ReturnType<typeof createUser>> {
    const user = this.store.users.get(token);
    if (!user) {
      throw new Error(`Invalid fake session ${token}`);
    }
    return user;
  }

  async verifyBearerToken(token: string): Promise<ReturnType<typeof createUser>> {
    return this.verifySessionToken(token);
  }

  getCookieOptions() {
    return { httpOnly: true, sameSite: 'lax' as const, path: '/' };
  }

  getClearCookieOptions() {
    return { httpOnly: true, sameSite: 'lax' as const, path: '/' };
  }

  async logout(): Promise<{ readonly status: string }> {
    return { status: 'ok' };
  }
}

export class FakeProjectsService {
  constructor(private readonly store: E2eStore) {}

  listPublic(): ReturnType<typeof page<Project>> {
    return page(this.store.projects);
  }

  getPublic(id: string): Project {
    return this.findProject(id);
  }

  listAdmin(): ReturnType<typeof page<Project>> {
    return page(this.store.projects.map((project) => ({ ...project, interestCount: this.store.interestCount })));
  }

  getAdmin(id: string): Project {
    return { ...this.findProject(id), interestCount: this.store.interestCount };
  }

  listStudentProjects(): readonly Project[] {
    return this.store.projects;
  }

  getStudentProject(id: string): Project {
    return this.findProject(id);
  }

  findProject(id: string): Project {
    const project = this.store.projects.find((candidate) => candidate.id === id);
    if (!project) {
      throw new Error(`Missing fake project ${id}`);
    }
    return project;
  }
}
