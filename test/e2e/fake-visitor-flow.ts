import { ForbiddenException } from '@nestjs/common';
import { ContactStatus, FeedbackStatus, RealtimeEventType, UserRole, VisitorType } from '../../src/database/entities';
import { Contact, E2eStore, Feedback, ids, page, VisitorProfile } from './fixtures';

export class FakeVisitorProfilesService {
  constructor(private readonly store: E2eStore) {}

  create(dto: { readonly ageGroup: VisitorProfile['ageGroup']; readonly visitorType: VisitorType }, file?: { readonly originalname: string }): VisitorProfile {
    const profile: VisitorProfile = {
      id: ids.visitor,
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: file ? 'file-business-card' : null,
      businessCardRegistered: Boolean(file),
      ocrRawText: file ? 'IEUM Recruiter' : null,
      ocrName: 'Recruiter',
      ocrOrganization: 'Mirim Corp',
      ocrPosition: 'Engineer',
      ocrEmail: 'recruiter@example.com',
      ocrPhone: '010-1234-5678',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.visitors.push(profile);
    this.record(RealtimeEventType.VisitorProfileCreated, null, null, { visitorProfileId: profile.id });
    return profile;
  }

  findById(id: string): VisitorProfile {
    const profile = this.store.visitors.find((candidate) => candidate.id === id);
    if (!profile) {
      throw new Error(`Missing fake visitor profile ${id}`);
    }
    return profile;
  }

  private record(type: RealtimeEventType, projectId: string | null, targetRole: UserRole | null, payload: Record<string, unknown>): void {
    this.store.events.unshift({ id: `event-${this.store.events.length + 1}`, type, projectId, targetRole, payload, createdAt: new Date() });
  }
}

export class FakeFeedbackService {
  constructor(private readonly store: E2eStore) {}

  create(
    projectId: string,
    dto: { readonly content: string; readonly visitorProfileId?: string | null; readonly ageGroup?: string | null; readonly visitorType?: string | null; readonly gender?: string | null },
    ipHash?: string,
    userAgent?: string
  ): Feedback {
    const project = this.store.projects.find((candidate) => candidate.id === projectId);
    if (project && !project.acceptsFeedback) {
      throw new ForbiddenException('Feedback is disabled for this project');
    }
    const visitorProfile = dto.visitorProfileId ? this.store.visitors.find((candidate) => candidate.id === dto.visitorProfileId) ?? null : null;
    const feedback: Feedback = {
      id: `feedback-${this.store.feedback.length + 1}`,
      projectId,
      visitorProfileId: visitorProfile?.id ?? null,
      ageGroup: dto.ageGroup ?? visitorProfile?.ageGroup ?? null,
      visitorType: dto.visitorType ?? visitorProfile?.visitorType ?? null,
      gender: dto.gender ?? null,
      content: dto.content,
      status: FeedbackStatus.Public,
      moderationReason: null,
      ipHash: ipHash ?? null,
      userAgent: userAgent ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.feedback.push(feedback);
    this.store.events.unshift({
      id: `event-${this.store.events.length + 1}`,
      type: RealtimeEventType.FeedbackCreated,
      projectId,
      targetRole: UserRole.Teacher,
      payload: { feedbackId: feedback.id },
      createdAt: new Date()
    });
    return feedback;
  }

  listStudent(projectId: string): ReturnType<typeof page<Feedback>> {
    return page(this.store.feedback.filter((feedback) => feedback.projectId === projectId && feedback.status === FeedbackStatus.Public));
  }

  listAdmin(): ReturnType<typeof page<Feedback>> {
    return page(this.store.feedback);
  }

  updateStatus(id: string, dto: { readonly status: FeedbackStatus; readonly moderationReason?: string }): Feedback {
    const current = this.store.feedback.find((feedback) => feedback.id === id);
    if (!current) {
      throw new Error(`Missing fake feedback ${id}`);
    }
    const updated = { ...current, status: dto.status, moderationReason: dto.moderationReason ?? null, updatedAt: new Date() };
    this.store.feedback.splice(this.store.feedback.indexOf(current), 1, updated);
    return updated;
  }
}

export class FakeContactsService {
  constructor(private readonly store: E2eStore) {}

  create(
    projectId: string,
    dto: {
      readonly visitorProfileId: string;
      readonly targetMemberUserId: string;
      readonly name?: string;
      readonly organization?: string;
      readonly position?: string;
      readonly email?: string;
      readonly phone?: string;
      readonly memo?: string;
    },
    ipHash?: string,
    userAgent?: string
  ): Contact {
    const profile = this.store.visitors.find((candidate) => candidate.id === dto.visitorProfileId);
    if (!profile) {
      throw new Error(`Missing fake visitor profile ${dto.visitorProfileId}`);
    }
    const contact: Contact = {
      id: `contact-${this.store.contacts.length + 1}`,
      projectId,
      visitorProfileId: dto.visitorProfileId,
      targetMemberUserId: dto.targetMemberUserId,
      ageGroup: profile.ageGroup,
      visitorType: profile.visitorType,
      name: dto.name ?? null,
      organization: dto.organization ?? null,
      position: dto.position ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      memo: dto.memo ?? null,
      businessCardFileId: profile.businessCardFileId,
      ocrRawText: profile.ocrRawText,
      ocrName: profile.ocrName,
      ocrOrganization: profile.ocrOrganization,
      ocrPosition: profile.ocrPosition,
      ocrEmail: profile.ocrEmail,
      ocrPhone: profile.ocrPhone,
      status: ContactStatus.New,
      ipHash: ipHash ?? null,
      userAgent: userAgent ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.contacts.push(contact);
    this.store.events.unshift({
      id: `event-${this.store.events.length + 1}`,
      type: RealtimeEventType.ContactCreated,
      projectId,
      targetRole: UserRole.Teacher,
      payload: { contactId: contact.id },
      createdAt: new Date()
    });
    return contact;
  }

  list(): ReturnType<typeof page<Contact>> {
    return page(this.store.contacts);
  }

  getDetail(id: string): Contact {
    return this.find(id);
  }

  updateStatus(id: string, dto: { readonly status: ContactStatus }): Contact {
    return this.replace(id, { status: dto.status });
  }

  updateOcr(id: string, dto: Partial<Pick<Contact, 'ocrName' | 'ocrOrganization' | 'ocrPosition' | 'ocrEmail' | 'ocrPhone'>>): Contact {
    return this.replace(id, dto);
  }

  private find(id: string): Contact {
    const contact = this.store.contacts.find((candidate) => candidate.id === id);
    if (!contact) {
      throw new Error(`Missing fake contact ${id}`);
    }
    return contact;
  }

  private replace(id: string, patch: Partial<Contact>): Contact {
    const current = this.find(id);
    const updated = { ...current, ...patch, updatedAt: new Date() };
    this.store.contacts.splice(this.store.contacts.indexOf(current), 1, updated);
    return updated;
  }
}
