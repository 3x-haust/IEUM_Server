jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;
  return {
    Column: decorator,
    CreateDateColumn: decorator,
    DeleteDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: decorator,
    OneToMany: decorator,
    PrimaryGeneratedColumn: decorator,
    QueryFailedError: class QueryFailedError extends Error {},
    Unique: decorator,
    UpdateDateColumn: decorator
  };
}, { virtual: true });

jest.mock('uuid', () => ({ v4: () => 'mock-file-id' }));

import { Logger } from '@nestjs/common';
import { AgeGroup, FileAccessLevel, RealtimeEventType, UserRole, VisitorType } from '../src/database/entities';
import { VisitorProfilesService } from '../src/modules/visitor-profiles/visitor-profiles.service';

describe('VisitorProfilesService', () => {
  const frontUpload = { originalname: 'front.jpg', mimetype: 'image/jpeg', size: 4, buffer: Buffer.from('front') };
  const backUpload = { originalname: 'back.jpg', mimetype: 'image/jpeg', size: 4, buffer: Buffer.from('back') };

  function createService() {
    const profiles = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({ ...value, id: 'profile-id' })),
      findOne: jest.fn()
    };
    const files = {
      saveImage: jest
        .fn()
        .mockResolvedValueOnce({ id: 'front-file-id', storageKey: 'private/front.jpg' })
        .mockResolvedValueOnce({ id: 'back-file-id', storageKey: 'private/back.jpg' })
    };
    const ocrQueue = { enqueueVisitorProfile: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new VisitorProfilesService(profiles as never, files as never, ocrQueue as never, events as never);
    return { service, profiles, files, ocrQueue, events };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the saved profile even when background OCR and event publishing fail', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service, files, ocrQueue, events } = createService();
    ocrQueue.enqueueVisitorProfile.mockRejectedValue(new Error('redis unavailable'));
    events.publish.mockRejectedValue(new Error('database timeout'));

    const result = await service.create(
      { ageGroup: AgeGroup.Adult, visitorType: VisitorType.Recruiter },
      { front: frontUpload, back: backUpload }
    );

    expect(result).toEqual(expect.objectContaining({
      id: 'profile-id',
      businessCardFileId: 'front-file-id',
      businessCardBackFileId: 'back-file-id',
      businessCardRegistered: true
    }));
    expect(files.saveImage).toHaveBeenNthCalledWith(1, frontUpload, FileAccessLevel.Private);
    expect(files.saveImage).toHaveBeenNthCalledWith(2, backUpload, FileAccessLevel.Private);
    expect(ocrQueue.enqueueVisitorProfile).toHaveBeenCalledWith('profile-id', ['private/front.jpg', 'private/back.jpg']);
    expect(events.publish).toHaveBeenCalledWith(
      RealtimeEventType.VisitorProfileCreated,
      null,
      UserRole.Teacher,
      { visitorProfileId: 'profile-id', visitorType: VisitorType.Recruiter },
      'visitor_profile',
      'profile-id'
    );

    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to enqueue business card OCR'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to publish visitor profile created event'));
  });
});
