import { ContactStatus, FeedbackStatus, RealtimeEventType, UserRole } from '../../src/database/entities';
import { E2eStore, ids, page, RealtimeEvent } from './fixtures';

export class FakeStatsService {
  constructor(private readonly store: E2eStore) {}

  dashboard() {
    return {
      projectCount: this.store.projects.length,
      feedbackCount: this.store.feedback.length,
      contactCount: this.store.contacts.length,
      newContactCount: this.store.contacts.filter((contact) => contact.status === ContactStatus.New).length,
      interestCount: this.store.interestCount,
      feedbackByStatus: { public: this.store.feedback.length },
      contactsByStatus: { new: this.store.contacts.length }
    };
  }

  report() {
    return { generatedAt: new Date().toISOString(), projectStats: [this.projectStats(ids.project)] };
  }

  projectStats(projectId: string) {
    return {
      projectId,
      feedbackCount: this.store.feedback.length,
      contactCount: this.store.contacts.length,
      interestCount: this.store.interestCount,
      feedbackByDate: [{ date: '2026-06-01', count: this.store.feedback.length }],
      contactsByDate: [{ date: '2026-06-01', count: this.store.contacts.length }],
      interestsByDate: [{ date: '2026-06-01', count: this.store.interestCount }]
    };
  }

  studentProjectStats(projectId: string) {
    return {
      projectId,
      feedbackCount: this.store.feedback.filter((feedback) => feedback.status === FeedbackStatus.Public).length,
      feedbackByDate: [{ date: '2026-06-01', count: this.store.feedback.length }]
    };
  }
}

export class FakeUsersService {
  constructor(private readonly store: E2eStore) {}

  list() {
    return page([...this.store.users.values()].filter((user, index, users) => users.findIndex((candidate) => candidate.id === user.id) === index));
  }
}

export class FakeBannedWordsService {
  constructor(private readonly store: E2eStore) {}

  list() {
    return page(this.store.bannedWords);
  }

  create(dto: { readonly word: string }) {
    const word = {
      id: `banned-${this.store.bannedWords.length + 1}`,
      word: dto.word,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.bannedWords.push(word);
    return word;
  }

  update(id: string, dto: { readonly word?: string; readonly isActive?: boolean }) {
    const current = this.store.bannedWords.find((word) => word.id === id);
    if (!current) {
      throw new Error(`Missing fake banned word ${id}`);
    }
    const updated = { ...current, ...dto, updatedAt: new Date() };
    this.store.bannedWords.splice(this.store.bannedWords.indexOf(current), 1, updated);
    return updated;
  }

  remove(id: string) {
    this.store.bannedWords.splice(this.store.bannedWords.findIndex((word) => word.id === id), 1);
    return { id, deleted: true };
  }
}

export class FakeProjectInterestsService {
  constructor(private readonly store: E2eStore) {}

  create(projectId: string) {
    this.store.interestCount += 1;
    this.store.events.unshift({
      id: `event-${this.store.events.length + 1}`,
      type: RealtimeEventType.ProjectInterestCreated,
      projectId,
      targetRole: UserRole.Teacher,
      payload: { interestCount: this.store.interestCount },
      createdAt: new Date()
    });
    return { projectId, interestCount: this.store.interestCount, alreadyInterested: false };
  }
}

export class FakeRealtimeService {
  constructor(private readonly store: E2eStore) {}

  recent(): readonly RealtimeEvent[] {
    return this.store.events;
  }
}
