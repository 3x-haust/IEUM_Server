import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const reportDir = 'reports/load-test';
const scriptPath = 'scripts/loadtest/ieum-flows.k6.js';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactsDir = process.env.K6_ARTIFACTS_DIR || join(reportDir, 'artifacts', timestamp);
const reportPath = process.env.K6_REPORT_MD || join(reportDir, 'prodlike-k6-report.md');
const baseUrl = process.env.BASE_URL || 'http://localhost:3100';
const duration = process.env.DURATION || '20s';
const refineDuration = process.env.REFINE_DURATION || duration;
const p95LimitMs = Number(process.env.P95_LIMIT_MS || '2000');
const failRateLimit = Number(process.env.FAIL_RATE_LIMIT || '0.01');
const flowSuccessLimit = Number(process.env.FLOW_SUCCESS_LIMIT || '0.95');
const minIterationRateRatio = Number(process.env.MIN_ITERATION_RATE_RATIO || '0.95');
const cooldownSeconds = Number(process.env.COOLDOWN_SECONDS || '5');
const rates = parseRates(process.env.RATES || '5,10,20,40,80,120,160,200');
const activeThinkSeconds = parseRates(process.env.ACTIVE_THINK_SECONDS || '3,5,10');
const environmentSummary = [
  `NODE_ENV=${process.env.NODE_ENV || 'unset'}`,
  `REDIS_ENABLED=${process.env.REDIS_ENABLED || 'false'}`,
  `OCR_QUEUE_ENABLED=${process.env.OCR_QUEUE_ENABLED || 'false'}`,
  `OCR_ENABLED=${process.env.OCR_ENABLED || 'false'}`,
  `KAFKA_ENABLED=${process.env.KAFKA_ENABLED || 'false'}`,
  `DATABASE_POOL_MAX=${process.env.DATABASE_POOL_MAX || '10'}`
].join(', ');

mkdirSync(reportDir, { recursive: true });
mkdirSync(artifactsDir, { recursive: true });

const results = [];
let lastPass = null;
let firstFail = null;

for (const rate of rates) {
  const result = runK6(rate, duration, 'ramp');
  results.push(result);
  if (result.passed) {
    lastPass = result;
  } else {
    firstFail = result;
    break;
  }
}

if (lastPass && firstFail && firstFail.rate - lastPass.rate > 1) {
  let low = lastPass.rate;
  let high = firstFail.rate;
  while (high - low > 1) {
    const midpoint = Math.floor((low + high) / 2);
    const result = runK6(midpoint, refineDuration, 'refine');
    results.push(result);
    if (result.passed) {
      low = midpoint;
      lastPass = result;
    } else {
      high = midpoint;
      firstFail = result;
    }
  }
}

const report = renderReport(results, lastPass, firstFail);
writeFileSync(reportPath, report);

console.log(report);
console.log(`\nReport: ${reportPath}`);

function runK6(rate, runDuration, phase) {
  const summaryJson = join(artifactsDir, `ieum-k6-${phase}-${rate}rps.json`);
  const summaryMd = join(artifactsDir, `ieum-k6-${phase}-${rate}rps.md`);
  const env = {
    ...process.env,
    BASE_URL: baseUrl,
    RATE: String(rate),
    DURATION: runDuration,
    PRE_ALLOCATED_VUS: String(Math.max(10, rate)),
    MAX_VUS: String(Math.max(20, rate * 4)),
    P95_LIMIT_MS: String(p95LimitMs),
    FAIL_RATE_LIMIT: String(failRateLimit),
    FLOW_SUCCESS_LIMIT: String(flowSuccessLimit),
    K6_SUMMARY_JSON: summaryJson,
    K6_SUMMARY_MD: summaryMd
  };
  const startedAt = Date.now();
  const completed = spawnSync('k6', ['run', scriptPath], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const summary = existsSync(summaryJson) ? JSON.parse(readFileSync(summaryJson, 'utf8')) : null;
  const measurements = summary ? readMeasurements(summary, rate) : emptyMeasurements();
  const passed = completed.status === 0
    && measurements.httpFailedRate <= failRateLimit
    && measurements.httpP95Ms < p95LimitMs
    && measurements.flowSuccessRate >= flowSuccessLimit
    && measurements.arrivalFulfillmentRate >= minIterationRateRatio;
  const result = {
    phase,
    rate,
    duration: runDuration,
    elapsedSeconds,
    exitCode: completed.status,
    passed,
    summaryJson,
    summaryMd,
    stdoutTail: tail(completed.stdout),
    stderrTail: tail(completed.stderr),
    ...measurements
  };
  if (cooldownSeconds > 0) {
    waitSeconds(cooldownSeconds);
  }
  return result;
}

function readMeasurements(summary, targetRate) {
  const iterationsPerSecond = metric(summary, 'iterations', 'rate');
  const flowAvgMs = metric(summary, 'ieum_flow_duration', 'avg') || metric(summary, 'iteration_duration', 'avg');
  const flowP95Ms = metric(summary, 'ieum_flow_duration', 'p(95)') || metric(summary, 'iteration_duration', 'p(95)');
  return {
    httpReqsPerSecond: metric(summary, 'http_reqs', 'rate'),
    iterationsPerSecond,
    arrivalFulfillmentRate: iterationsPerSecond / targetRate,
    httpFailedRate: metric(summary, 'http_req_failed', 'rate'),
    httpP50Ms: metric(summary, 'http_req_duration', 'p(50)'),
    httpP95Ms: metric(summary, 'http_req_duration', 'p(95)'),
    httpP99Ms: metric(summary, 'http_req_duration', 'p(99)') || metric(summary, 'http_req_duration', 'max'),
    flowAvgMs,
    flowP95Ms,
    averageConcurrentUsers: iterationsPerSecond * flowAvgMs / 1000,
    p95ConcurrentUsers: iterationsPerSecond * flowP95Ms / 1000,
    flowSuccessRate: metric(summary, 'ieum_flow_success', 'rate'),
    http4xxCount: metric(summary, 'ieum_http_4xx', 'count'),
    http5xxCount: metric(summary, 'ieum_http_5xx', 'count'),
    checkRate: metric(summary, 'checks', 'rate')
  };
}

function emptyMeasurements() {
  return {
    httpReqsPerSecond: 0,
    iterationsPerSecond: 0,
    arrivalFulfillmentRate: 0,
    httpFailedRate: 1,
    httpP50Ms: 0,
    httpP95Ms: Number.POSITIVE_INFINITY,
    httpP99Ms: Number.POSITIVE_INFINITY,
    flowAvgMs: 0,
    flowP95Ms: Number.POSITIVE_INFINITY,
    averageConcurrentUsers: 0,
    p95ConcurrentUsers: Number.POSITIVE_INFINITY,
    flowSuccessRate: 0,
    http4xxCount: 0,
    http5xxCount: 0,
    checkRate: 0
  };
}

function renderReport(results, lastPass, firstFail) {
  const sorted = [...results].sort((left, right) => left.rate - right.rate || left.phase.localeCompare(right.phase));
  const conclusion = renderConclusion(lastPass, firstFail);
  const rows = sorted.map((result) => [
    result.phase,
    `${result.rate}`,
    result.passed ? 'PASS' : 'FAIL',
    result.httpReqsPerSecond.toFixed(2),
    result.iterationsPerSecond.toFixed(2),
    `${(result.arrivalFulfillmentRate * 100).toFixed(1)}%`,
    result.averageConcurrentUsers.toFixed(1),
    result.p95ConcurrentUsers.toFixed(1),
    `${(result.httpFailedRate * 100).toFixed(2)}%`,
    `${(result.flowSuccessRate * 100).toFixed(2)}%`,
    result.httpP95Ms.toFixed(1),
    result.httpP99Ms.toFixed(1),
    `${result.http4xxCount.toFixed(0)}/${result.http5xxCount.toFixed(0)}`
  ].join(' | '));
  return [
    '# IEUM k6 Whole-Flow Load Test Report',
    '',
    `- 작성 시각: ${new Date().toISOString()}`,
    `- 대상: ${baseUrl}`,
    `- k6 스크립트: \`${scriptPath}\``,
    `- 기준: HTTP 실패율 <= ${(failRateLimit * 100).toFixed(2)}%, flow success >= ${(flowSuccessLimit * 100).toFixed(2)}%, HTTP p95 < ${p95LimitMs}ms, actual it/s >= target ${(minIterationRateRatio * 100).toFixed(0)}%`,
    `- 로컬 환경: ${cpus().length} CPU threads, ${(totalmem() / 1024 / 1024 / 1024).toFixed(1)} GiB RAM`,
    `- 실행 플래그: ${environmentSummary}`,
    '',
    '## 결론',
    '',
    conclusion,
    '',
    '## 최적화 반영 사항',
    '',
    '- 프로젝트 목록 count N+1 제거: 프로젝트별 feedback/contact/interest count를 페이지 단위 grouped count로 배치 처리한다.',
    '- 통계 조회 캐시: dashboard/project/student/report 통계는 Redis read-through cache를 사용하고 dashboard status count는 grouped query 결과에서 합산한다.',
    '- 금칙어 매처: Aho-Corasick matcher cold rebuild는 single-flight로 공유한다.',
    '- 이벤트 쓰기 경로: audit/realtime/outbox write는 parameterized insert path를 사용한다.',
    '- DB 풀: `DATABASE_POOL_MAX`로 pg pool 크기를 조절한다.',
    '',
    '## 측정 결과',
    '',
    'phase | target it/s | 판정 | req/s | actual it/s | target 달성 | in-flight 평균 | in-flight p95 | http failed | flow success | p95 ms | p99/max ms | 4xx/5xx',
    '--- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:',
    ...rows,
    '',
    '## 가능 동접자 수',
    '',
    renderConcurrency(lastPass, firstFail),
    '',
    '## 시나리오 범위',
    '',
    '- 공개 탐색: `GET /health`, `GET /projects`, `GET /projects/:id`',
    '- 방문자 피드백: `POST /visitor-profiles`, `POST /projects/:projectId/feedback`',
    '- 회사 관계자 컨택: multipart `POST /visitor-profiles`, `POST /projects/:projectId/contacts`',
    '- 관리자 플로우: `POST /auth/login`, `GET /auth/me`, dashboard/report/projects/feedback/contacts/users/banned-words/realtime recent, project interest write',
    '- 학생 플로우: `POST /auth/login`, student projects/detail/feedback/stats',
    '- 검수 플로우: blocked feedback 생성 후 admin status patch',
    ''
  ].join('\n');
}

function renderConclusion(lastPass, firstFail) {
  if (lastPass && firstFail) {
    return [
      `- 마지막 통과 지점: **${lastPass.rate} iterations/s** (${lastPass.httpReqsPerSecond.toFixed(2)} req/s, p95 ${lastPass.httpP95Ms.toFixed(1)}ms, 실패율 ${(lastPass.httpFailedRate * 100).toFixed(2)}%).`,
      `- 첫 실패 지점: **${firstFail.rate} iterations/s** (${firstFail.httpReqsPerSecond.toFixed(2)} req/s, p95 ${firstFail.httpP95Ms.toFixed(1)}ms, 실패율 ${(firstFail.httpFailedRate * 100).toFixed(2)}%, target 달성률 ${(firstFail.arrivalFulfillmentRate * 100).toFixed(1)}%).`,
      `- in-flight 동접자는 평균 ${lastPass.averageConcurrentUsers.toFixed(1)}명, p95 기준 ${lastPass.p95ConcurrentUsers.toFixed(1)}명이다.`,
      `- active user 모델은 think time ${activeThinkSeconds.join('/')}초 기준 ${activeThinkSeconds.map((seconds) => activeUsers(lastPass, seconds).toFixed(0)).join('/')}명이다.`,
      `- ${firstFail.rate} it/s부터는 요청이 쌓이면서 target 처리량을 못 맞추는 붕괴 구간으로 본다.`
    ].join('\n');
  }
  if (lastPass) {
    return `- 테스트한 범위 안에서는 실패 지점을 찾지 못했다. 현재 관측된 최소 안정 상한은 **${lastPass.rate} iterations/s**이며, 더 높은 \`RATES\`로 재실행해야 붕괴점을 좁힐 수 있다.`;
  }
  return '- 첫 단계부터 기준을 통과하지 못했다. 서버 기동 상태, DB 연결, seed 데이터, p95/실패율 기준을 먼저 확인해야 한다.';
}

function renderConcurrency(lastPass, firstFail) {
  if (!lastPass) {
    return '- 안정 동접자 수를 산정할 통과 구간이 없다.';
  }
  const lines = [
    `- in-flight 평균 동접: **${lastPass.averageConcurrentUsers.toFixed(1)}명**`,
    `- in-flight p95 동접: **${lastPass.p95ConcurrentUsers.toFixed(1)}명**`,
    `- in-flight 산정식: \`actual it/s * 플로우 소요시간(ms) / 1000\``,
    `- 기준 지점: ${lastPass.rate} target it/s, ${lastPass.iterationsPerSecond.toFixed(2)} actual it/s, flow avg ${lastPass.flowAvgMs.toFixed(1)}ms, flow p95 ${lastPass.flowP95Ms.toFixed(1)}ms`
  ];
  lines.push('');
  lines.push('think time | active users');
  lines.push('---: | ---:');
  for (const seconds of activeThinkSeconds) {
    lines.push(`${seconds}s | ${activeUsers(lastPass, seconds).toFixed(0)}`);
  }
  lines.push('');
  lines.push(`- active user 산정식: \`actual it/s * think time seconds\``);
  if (firstFail) {
    lines.push(`- 초과 지점: ${firstFail.rate} target it/s, ${firstFail.iterationsPerSecond.toFixed(2)} actual it/s, flow p95 ${firstFail.flowP95Ms.toFixed(1)}ms`);
  }
  return lines.join('\n');
}

function activeUsers(result, thinkSeconds) {
  return result.iterationsPerSecond * thinkSeconds;
}

function metric(summary, name, key) {
  const value = summary.metrics?.[name]?.values?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseRates(value) {
  const parsed = value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0);
  if (parsed.length === 0) {
    throw new Error('RATES must contain at least one positive integer');
  }
  return parsed;
}

function tail(value) {
  return value.split('\n').slice(-20).join('\n').trim();
}

function waitSeconds(seconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

if (lastPass?.summaryMd && existsSync(lastPass.summaryMd)) {
  copyFileSync(lastPass.summaryMd, join(artifactsDir, 'latest-k6-passing-summary.md'));
}
