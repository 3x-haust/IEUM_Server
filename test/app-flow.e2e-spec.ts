import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AgeGroup, ContactStatus, FeedbackStatus, ProjectMemberRole, VisitorType } from '../src/database/entities';
import { createE2eApp } from './e2e-harness';
import { ids } from './e2e/fixtures';

type Wrapped<T> = {
  readonly statusCode: number;
  readonly data: T;
};

type Page<T> = {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
};

type ProjectBody = {
  readonly id: string;
  readonly serviceName: string;
  readonly acceptsFeedback: boolean;
  readonly members: readonly { readonly id: string; readonly roles: readonly ProjectMemberRole[] }[];
};

type FeedbackBody = {
  readonly id: string;
  readonly content: string;
  readonly status: FeedbackStatus;
};

type ContactBody = {
  readonly id: string;
  readonly status: ContactStatus;
  readonly ocrName: string | null;
};

const body = <T>(response: request.Response): Wrapped<T> => response.body;

const httpServer = (app: INestApplication): App => app.getHttpServer();

describe('IEUM e2e app flow', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('completes the whole IEUM user flow without local services', async () => {
    app = await createE2eApp();
    const server = httpServer(app);

    const health = await request(server).get('/health').expect(200);
    expect(body<{ readonly status: string }>(health).data.status).toBe('ok');

    const projects = await request(server).get('/projects').expect(200);
    const project = body<Page<ProjectBody>>(projects).data.items[0];
    expect(project.serviceName).toBe('IEUM');

    const detail = await request(server).get(`/projects/${project.id}`).expect(200);
    expect(body<ProjectBody>(detail).data.acceptsFeedback).toBe(true);
    expect(body<ProjectBody>(detail).data.members[0].id).toBe(ids.student);
    expect(body<ProjectBody>(detail).data.members[0].roles).toEqual([ProjectMemberRole.Backend, ProjectMemberRole.Frontend]);

    const visitor = await request(server)
      .post('/visitor-profiles')
      .field('ageGroup', AgeGroup.Adult)
      .field('visitorType', VisitorType.Recruiter)
      .attach('businessCard', Buffer.from('business card'), 'card.txt')
      .expect(201);
    const visitorId = body<{ readonly id: string; readonly businessCardRegistered: boolean }>(visitor).data.id;
    expect(body<{ readonly businessCardRegistered: boolean }>(visitor).data.businessCardRegistered).toBe(true);

    const feedback = await request(server)
      .post(`/projects/${project.id}/feedback`)
      .send({ content: '발표에서 기술 선택 이유를 더 듣고 싶어요.' })
      .expect(201);
    const feedbackId = body<FeedbackBody>(feedback).data.id;

    const contact = await request(server)
      .post(`/projects/${project.id}/contacts`)
      .send({ visitorProfileId: visitorId, targetMemberUserId: ids.student, name: 'Recruiter', organization: 'Mirim Corp', position: 'Engineer', email: 'recruiter@example.com', phone: '010-1234-5678', memo: '프로젝트 설명을 더 듣고 싶습니다.' })
      .expect(201);
    const contactId = body<ContactBody>(contact).data.id;
    expect(body<ContactBody>(contact).data.status).toBe(ContactStatus.New);

    const adminLogin = await request(server).post('/auth/login').send({ accessToken: 'admin-token' }).expect(201);
    const adminCookie = adminLogin.headers['set-cookie'];
    expect(adminCookie).toBeDefined();

    const dashboard = await request(server).get('/admin/dashboard').set('Cookie', adminCookie).expect(200);
    expect(body<{ readonly feedbackCount: number; readonly contactCount: number }>(dashboard).data).toMatchObject({ feedbackCount: 1, contactCount: 1 });

    const report = await request(server).get('/admin/reports').set('Cookie', adminCookie).expect(200);
    expect(body<{ readonly projectStats: readonly unknown[] }>(report).data.projectStats).toHaveLength(1);

    const adminProjects = await request(server).get('/admin/projects').set('Cookie', adminCookie).expect(200);
    expect(body<Page<ProjectBody>>(adminProjects).data.items[0].id).toBe(project.id);

    const adminFeedback = await request(server).get('/admin/feedback').set('Cookie', adminCookie).expect(200);
    expect(body<Page<FeedbackBody>>(adminFeedback).data.items[0].id).toBe(feedbackId);

    const adminContacts = await request(server).get('/admin/contacts').set('Cookie', adminCookie).expect(200);
    expect(body<Page<ContactBody>>(adminContacts).data.items[0].id).toBe(contactId);

    const contactDetail = await request(server).get(`/admin/contacts/${contactId}`).set('Cookie', adminCookie).expect(200);
    expect(body<ContactBody>(contactDetail).data.id).toBe(contactId);

    const users = await request(server).get('/admin/users').set('Cookie', adminCookie).expect(200);
    expect(body<Page<{ readonly role: string }>>(users).data.items.map((user) => user.role)).toContain('admin');

    const bannedWords = await request(server).get('/admin/banned-words').set('Cookie', adminCookie).expect(200);
    expect(body<Page<{ readonly word: string }>>(bannedWords).data.items[0].word).toBe('blocked');

    const interest = await request(server).post(`/admin/projects/${project.id}/interests`).set('Cookie', adminCookie).expect(201);
    expect(body<{ readonly interestCount: number }>(interest).data.interestCount).toBe(1);

    const recent = await request(server).get('/realtime/events/recent').set('Cookie', adminCookie).expect(200);
    expect(body<readonly { readonly projectId: string | null }[]>(recent).data.some((event) => event.projectId === project.id)).toBe(true);

    const studentLogin = await request(server).post('/auth/login').send({ accessToken: 'student-token' }).expect(201);
    const studentCookie = studentLogin.headers['set-cookie'];

    const studentProjects = await request(server).get('/student/projects').set('Cookie', studentCookie).expect(200);
    expect(body<readonly ProjectBody[]>(studentProjects).data[0].id).toBe(project.id);

    const studentProject = await request(server).get(`/student/projects/${project.id}`).set('Cookie', studentCookie).expect(200);
    expect(body<ProjectBody>(studentProject).data.serviceName).toBe('IEUM');

    const studentFeedback = await request(server).get(`/student/projects/${project.id}/feedback`).set('Cookie', studentCookie).expect(200);
    expect(body<Page<FeedbackBody>>(studentFeedback).data.items[0].content).toContain('기술 선택');

    const studentStats = await request(server).get(`/student/projects/${project.id}/stats`).set('Cookie', studentCookie).expect(200);
    expect(body<{ readonly feedbackCount: number }>(studentStats).data.feedbackCount).toBe(1);

    const moderated = await request(server)
      .patch(`/admin/feedback/${feedbackId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: FeedbackStatus.Blocked, moderationReason: 'manual review' })
      .expect(200);
    expect(body<FeedbackBody>(moderated).data.status).toBe(FeedbackStatus.Blocked);
  });

  it('rejects malformed visitor feedback and non-admin dashboard access', async () => {
    app = await createE2eApp();
    const server = httpServer(app);

    await request(server).post(`/projects/${ids.project}/feedback`).send({ content: 'x' }).expect(400);
    const studentLogin = await request(server).post('/auth/login').send({ accessToken: 'student-token' }).expect(201);
    await request(server).get('/admin/dashboard').set('Cookie', studentLogin.headers['set-cookie']).expect(403);
  });

  it('rejects visitor feedback when the CSV disables feedback for a project', async () => {
    app = await createE2eApp({ acceptsFeedback: false });
    const server = httpServer(app);

    const projects = await request(server).get('/projects').expect(200);
    const project = body<Page<ProjectBody>>(projects).data.items[0];
    expect(project.acceptsFeedback).toBe(false);

    await request(server)
      .post(`/projects/${project.id}/feedback`)
      .send({ content: '발표에서 기술 선택 이유를 더 듣고 싶어요.' })
      .expect(403);
  });

  it('does not read local database or redis environment for the e2e harness', async () => {
    process.env.DATABASE_NAME = 'poison_database_for_e2e';
    process.env.REDIS_URL = 'redis://poison.invalid:6379';
    app = await createE2eApp();
    const server = httpServer(app);

    await request(server).get('/health').expect(200);
    const projects = await request(server).get('/projects').expect(200);
    expect(body<Page<ProjectBody>>(projects).data.items[0].serviceName).toBe('IEUM');
  });
});
