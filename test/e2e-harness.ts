import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { applyNestResponse } from '@3xhaust/nest-response';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { MirimAuthGuard } from '../src/modules/auth/mirim-auth.guard';
import { BannedWordsController } from '../src/modules/banned-words/banned-words.controller';
import { BannedWordsService } from '../src/modules/banned-words/banned-words.service';
import { ContactsController } from '../src/modules/contacts/contacts.controller';
import { ContactsService } from '../src/modules/contacts/contacts.service';
import { FeedbackController } from '../src/modules/feedback/feedback.controller';
import { FeedbackService } from '../src/modules/feedback/feedback.service';
import { HealthController } from '../src/modules/health/health.controller';
import { ProjectInterestsController } from '../src/modules/project-interests/project-interests.controller';
import { ProjectInterestsService } from '../src/modules/project-interests/project-interests.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RealtimeController } from '../src/modules/realtime/realtime.controller';
import { RealtimeService } from '../src/modules/realtime/realtime.service';
import { StatsController } from '../src/modules/stats/stats.controller';
import { StatsService } from '../src/modules/stats/stats.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { VisitorProfilesController } from '../src/modules/visitor-profiles/visitor-profiles.controller';
import { VisitorProfilesService } from '../src/modules/visitor-profiles/visitor-profiles.service';
import { createStore } from './e2e/fixtures';
import { FakeAuthService, FakeBannedWordsService, FakeContactsService, FakeFeedbackService, FakeProjectInterestsService, FakeProjectsService, FakeRealtimeService, FakeStatsService, FakeUsersService, FakeVisitorProfilesService } from './e2e/fake-services';

export async function createE2eApp(options: { readonly acceptsFeedback?: boolean } = {}) {
  const store = createStore(options);
  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      BannedWordsController,
      ContactsController,
      FeedbackController,
      HealthController,
      ProjectInterestsController,
      ProjectsController,
      RealtimeController,
      StatsController,
      UsersController,
      VisitorProfilesController
    ],
    providers: [
      MirimAuthGuard,
      { provide: AuthService, useValue: new FakeAuthService(store) },
      { provide: BannedWordsService, useValue: new FakeBannedWordsService(store) },
      { provide: ContactsService, useValue: new FakeContactsService(store) },
      { provide: FeedbackService, useValue: new FakeFeedbackService(store) },
      { provide: ProjectInterestsService, useValue: new FakeProjectInterestsService(store) },
      { provide: ProjectsService, useValue: new FakeProjectsService(store) },
      { provide: RealtimeService, useValue: new FakeRealtimeService(store) },
      { provide: StatsService, useValue: new FakeStatsService(store) },
      { provide: UsersService, useValue: new FakeUsersService(store) },
      { provide: VisitorProfilesService, useValue: new FakeVisitorProfilesService(store) }
    ]
  }).compile();
  const app = moduleRef.createNestApplication();
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  applyNestResponse(app, { allExceptionsFilter: { exposeUnknownErrorMessages: true } });
  await app.init();
  return app;
}
