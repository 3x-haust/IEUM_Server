# IEUM k6 Whole-Flow Load Test Report

- 작성 시각: 2026-06-01T18:25:16.992Z
- 대상: http://localhost:3100
- k6 스크립트: `scripts/loadtest/ieum-flows.k6.js`
- 기준: HTTP 실패율 <= 1.00%, flow success >= 95.00%, HTTP p95 < 2000ms, actual it/s >= target 95%
- 로컬 환경: 8 CPU threads, 24.0 GiB RAM
- 실행 플래그: NODE_ENV=production, REDIS_ENABLED=true, OCR_QUEUE_ENABLED=true, OCR_ENABLED=false, KAFKA_ENABLED=false, DATABASE_POOL_MAX=10

## 결론

- 마지막 통과 지점: **140 iterations/s** (545.89 req/s, p95 250.9ms, 실패율 0.00%).
- 첫 실패 지점: **141 iterations/s** (349.84 req/s, p95 2677.1ms, 실패율 0.00%, target 달성률 59.2%).
- 여기서 iteration은 단일 HTTP 요청이 아니라 공개 탐색, 방문자 입력, 관리자/학생 조회, 검수 흐름 중 하나의 실제 사용자 플로우다.
- in-flight 동접자는 평균 35.7명, p95 기준 144.8명이다.
- active user 모델은 think time 3/5/10초 기준 401/669/1338명이다.
- 141 it/s부터는 요청이 쌓이면서 target 처리량을 못 맞추는 붕괴 구간으로 본다.

## 최적화 반영 사항

- 프로젝트 목록 count N+1 제거: 목록 페이지의 프로젝트별 feedback/contact/interest count를 개별 count 3회씩 호출하지 않고, 페이지 단위 grouped count 3회로 배치 처리했다.
- 통계 조회 캐시: dashboard/project/student/report 통계에 Redis read-through 캐시를 적용했고, dashboard status count는 grouped query 결과에서 합산하도록 줄였다.
- 금칙어 매처: 이미 Aho-Corasick을 사용 중이었고, 동시 cold lookup에서 매처 rebuild가 중복되지 않도록 single-flight 처리했다.
- 이벤트 쓰기 경로: audit/realtime/outbox는 TypeORM `save()` 대신 파라미터 바인딩 raw insert로 변경해서 엔티티 hydration 비용을 줄였다.
- DB 풀: `DATABASE_POOL_MAX`를 env로 열었고, 이번 로컬 측정은 10으로 고정했다.

## 측정 결과

phase | target it/s | 판정 | req/s | actual it/s | target 달성 | in-flight 평균 | in-flight p95 | http failed | flow success | p95 ms | p99/max ms | 4xx/5xx
--- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:
ramp | 120 | PASS | 504.74 | 119.31 | 99.4% | 4.0 | 18.1 | 0.00% | 100.00% | 38.9 | 87.0 | 0/0
ramp | 140 | PASS | 545.89 | 133.77 | 95.5% | 35.7 | 144.8 | 0.00% | 100.00% | 250.9 | 500.1 | 0/0
refine | 141 | FAIL | 349.84 | 83.46 | 59.2% | 385.5 | 1026.7 | 0.00% | 100.00% | 2677.1 | 3873.6 | 0/0
refine | 142 | FAIL | 456.82 | 110.78 | 78.0% | 146.2 | 584.0 | 0.00% | 100.00% | 1281.6 | 2648.8 | 0/0
refine | 145 | FAIL | 526.43 | 126.13 | 87.0% | 155.0 | 394.5 | 0.00% | 100.00% | 801.4 | 1222.1 | 0/0
ramp | 150 | FAIL | 473.49 | 113.17 | 75.4% | 138.4 | 614.1 | 0.00% | 100.00% | 1475.2 | 2384.2 | 0/0

## 가능 동접자 수

- in-flight 평균 동접: **35.7명**
- in-flight p95 동접: **144.8명**
- in-flight 산정식: `actual it/s * 플로우 소요시간(ms) / 1000`
- 기준 지점: 140 target it/s, 133.77 actual it/s, flow avg 266.6ms, flow p95 1082.2ms

think time | active users
---: | ---:
3s | 401
5s | 669
10s | 1338

- active user 산정식: `actual it/s * think time seconds`
- 초과 지점: 141 target it/s, 83.46 actual it/s, flow p95 12301.7ms

## 종료 시점 데이터 규모

table | rows
--- | ---:
users | 4
projects | 1
feedback | 4402
contacts | 2466
visitor_profiles | 6283
files | 2466
project_interests | 1806
realtime_events | 15542
event_outbox | 15542
audit_logs | 585

## Redis 상태

- total commands processed: 317413
- keyspace hits/misses: 86506 / 28765
- db0 keys: 5416

## 시나리오 범위

- 공개 탐색: `GET /health`, `GET /projects`, `GET /projects/:id`
- 방문자 피드백: `POST /visitor-profiles`, `POST /projects/:projectId/feedback`
- 회사 관계자 컨택: multipart `POST /visitor-profiles`, `POST /projects/:projectId/contacts`
- 관리자 플로우: `POST /auth/login`, `GET /auth/me`, dashboard/report/projects/feedback/contacts/users/banned-words/realtime recent, project interest write
- 학생 플로우: `POST /auth/login`, student projects/detail/feedback/stats
- 검수 플로우: blocked feedback 생성 후 admin status patch
