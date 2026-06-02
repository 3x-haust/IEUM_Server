export enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Admin = 'admin'
}

export const ProjectMemberRole = {
  Backend: 'backend',
  Frontend: 'frontend',
  Design: 'design',
  ProductManager: 'pm',
  Ai: 'ai'
} as const;

export type ProjectMemberRole = typeof ProjectMemberRole[keyof typeof ProjectMemberRole];

export enum VisitorType {
  General = 'general',
  Recruiter = 'recruiter'
}

export enum AgeGroup {
  MiddleSchool = 'middle_school',
  HighSchool = 'high_school',
  University = 'university',
  Adult = 'adult',
  Other = 'other'
}

export enum FeedbackStatus {
  Public = 'public',
  Blocked = 'blocked',
  Deleted = 'deleted'
}

export enum ContactStatus {
  New = 'new',
  Checked = 'checked',
  Archived = 'archived',
  Deleted = 'deleted'
}

export enum FileAccessLevel {
  Public = 'public',
  Private = 'private'
}

export enum AuditAction {
  FeedbackStatusChanged = 'feedback_status_changed',
  ContactViewed = 'contact_viewed',
  ContactStatusChanged = 'contact_status_changed',
  ContactOcrUpdated = 'contact_ocr_updated',
  BannedWordCreated = 'banned_word_created',
  BannedWordUpdated = 'banned_word_updated',
  BannedWordDeleted = 'banned_word_deleted',
  FileViewed = 'file_viewed'
}

export enum RealtimeEventType {
  FeedbackCreated = 'feedback.created',
  FeedbackStatusChanged = 'feedback.status_changed',
  ContactCreated = 'contact.created',
  ContactStatusChanged = 'contact.status_changed',
  ProjectInterestCreated = 'project_interest.created',
  VisitorProfileCreated = 'visitor_profile.created',
  FileUploaded = 'file.uploaded',
  AuditCreated = 'audit.created'
}

export enum OutboxStatus {
  Pending = 'pending',
  Published = 'published',
  Failed = 'failed'
}
