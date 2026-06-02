# IEUM k6 부하 테스트 실행법

## 전제

- `k6`, `psql`, `redis-server`, `redis-cli`, `pnpm`이 설치되어 있어야 한다.
- 최대치 탐색은 프로덕션 도메인에 직접 실행하지 않는다. 공유 서버에서는 다른 서비스까지 지연될 수 있다.
- 운영 유사 테스트는 별도 PostgreSQL DB와 별도 Redis 포트를 사용한다.
- 아래 `AUTH_DEV_TOKENS`, `JWT_SECRET`, DB 비밀번호 예시는 로컬 부하 테스트 전용이다. 운영 환경에 그대로 배포하지 않는다.

## 1. 테스트 DB 생성

```bash
DB_NAME=ieum_prodlike_$(date +%Y%m%d_%H%M%S)
PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "CREATE DATABASE $DB_NAME"
echo "$DB_NAME"
```

## 2. 마이그레이션과 seed

```bash
DATABASE_NAME=$DB_NAME \
DATABASE_HOST=localhost \
DATABASE_PORT=5432 \
DATABASE_USER=postgres \
DATABASE_PASSWORD=postgres \
DATABASE_SSL=false \
DATABASE_POOL_MAX=10 \
pnpm migration:run

DATABASE_NAME=$DB_NAME \
DATABASE_HOST=localhost \
DATABASE_PORT=5432 \
DATABASE_USER=postgres \
DATABASE_PASSWORD=postgres \
DATABASE_SSL=false \
DATABASE_POOL_MAX=10 \
pnpm seed
```

## 3. Redis 실행

```bash
redis-server --port 6380 --save "" --appendonly no
```

다른 터미널에서 확인한다.

```bash
redis-cli -p 6380 ping
```

## 4. 서버 실행

```bash
pnpm build

NODE_ENV=production \
AUTH_DEV_TOKENS=true \
JWT_SECRET=prodlike-loadtest-secret \
PORT=3100 \
DATABASE_NAME=$DB_NAME \
DATABASE_HOST=localhost \
DATABASE_PORT=5432 \
DATABASE_USER=postgres \
DATABASE_PASSWORD=postgres \
DATABASE_SSL=false \
DATABASE_SYNCHRONIZE=false \
DATABASE_POOL_MAX=10 \
REDIS_ENABLED=true \
REDIS_URL=redis://localhost:6380 \
OCR_QUEUE_ENABLED=true \
OCR_ENABLED=false \
KAFKA_ENABLED=false \
UPLOAD_DIR=uploads-loadtest \
PUBLIC_FILE_BASE_URL=http://localhost:3100/files/public \
node dist/main.js
```

헬스체크:

```bash
curl -fsS http://localhost:3100/health
```

## 5. Smoke 테스트

```bash
BASE_URL=http://localhost:3100 \
RATE=5 \
DURATION=30s \
pnpm load:k6:smoke
```

## 6. 최대치 탐색

```bash
BASE_URL=http://localhost:3100 \
DURATION=20s \
REFINE_DURATION=20s \
RATES=120,140,150,160,170,180 \
COOLDOWN_SECONDS=8 \
P95_LIMIT_MS=2000 \
FAIL_RATE_LIMIT=0.01 \
FLOW_SUCCESS_LIMIT=0.95 \
MIN_ITERATION_RATE_RATIO=0.95 \
ACTIVE_THINK_SECONDS=3,5,10 \
pnpm load:k6:max
```

결과 리포트는 `reports/load-test/prodlike-k6-report.md`에 덮어쓴다. 단계별 JSON/요약 파일은 `reports/load-test/artifacts/`에 생성되며 git에 저장하지 않는다.

리포트의 동접자 수는 k6가 실제 완료한 플로우 처리량과 플로우 소요시간으로 계산한다.

```text
in-flight 평균 동접 = actual iterations/s * flow avg ms / 1000
in-flight p95 동접 = actual iterations/s * flow p95 ms / 1000
active users = actual iterations/s * think time seconds
```

`actual iterations/s`가 target의 95% 미만이면 요청이 밀린 것으로 보고 실패 처리한다.

## 7. 정리

```bash
rm -rf uploads-loadtest
PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME"
```

Redis와 서버 프로세스는 각각 실행 중인 터미널에서 `Ctrl-C`로 종료한다.
