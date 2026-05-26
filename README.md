# Nest.js_IEUM_Server

IEUM PRD 기반 NestJS 백엔드 서버다.

## Stack

- NestJS 11
- PostgreSQL, TypeORM
- pnpm
- `@3xhaust/nest-response`
- Swagger UI `/docs`, OpenAPI JSON `/docs-json`
- Redis cache/rate limit/pubsub 준비 구조
- Kafka outbox publisher 구조
- BullMQ OCR job 구조
- Tesseract.js OCR parser

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis kafka
pnpm migration:run
pnpm seed
pnpm start:dev
```

## Validation

```bash
pnpm test
pnpm lint
pnpm build
```

## Public APIs

- `GET /projects`
- `GET /projects/:id`
- `POST /visitor-profiles`
- `POST /projects/:projectId/feedback`
- `POST /projects/:projectId/contacts`
- `GET /files/public/:id`

## Authenticated APIs

프론트엔드는 `POST /auth/login`에 Mirim OAuth access token을 전달한다. 서버는 Mirim OAuth verify-token endpoint로 검증한 뒤 내부 사용자를 생성 또는 업데이트하고 HttpOnly JWT 쿠키 `ieum_auth`를 발급한다. 인증 API는 `credentials: 'include'`로 쿠키를 전송해 호출한다.

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /student/projects`
- `GET /student/projects/:projectId/feedback`
- `GET /student/projects/:projectId/stats`
- `GET /admin/projects`
- `POST /admin/projects/:projectId/interests`
- `GET /admin/feedback`
- `PATCH /admin/feedback/:id/status`
- `GET /admin/contacts`
- `GET /admin/contacts/:id`
- `PATCH /admin/contacts/:id/status`
- `PATCH /admin/contacts/:id/ocr`
- `GET /admin/banned-words`
- `POST /admin/banned-words`
- `PATCH /admin/banned-words/:id`
- `DELETE /admin/banned-words/:id`
- `GET /admin/users`
- `GET /admin/dashboard`
- `GET /admin/reports`
- `GET /realtime/events`
- `GET /realtime/events/recent`

## Security Notes

`cluade.sh`는 공개 저장소에 올리지 않도록 `.gitignore`에 제외했다. 공개 저장소에 민감 토큰이 포함되지 않게 유지한다.
