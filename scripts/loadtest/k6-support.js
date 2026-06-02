import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const flowDuration = new Trend('ieum_flow_duration', true);
export const flowSuccess = new Rate('ieum_flow_success');
export const http4xx = new Counter('ieum_http_4xx');
export const http5xx = new Counter('ieum_http_5xx');

let baseUrl = 'http://localhost:3100';

export function setBaseUrl(value) {
  baseUrl = value.replace(/\/$/, '');
}

export function measure(flow, callback) {
  const startedAt = Date.now();
  let ok = false;
  try {
    ok = callback();
  } finally {
    flowDuration.add(Date.now() - startedAt, { flow });
    flowSuccess.add(ok, { flow });
    check({ ok }, { [`${flow} flow succeeded`]: (value) => value.ok }, { flow });
  }
}

export function requestJson(flow, method, path, body, params, expectedStatuses) {
  const response = request(flow, method, path, body, params, expectedStatuses);
  return parseJson(response);
}

export function request(flow, method, path, body, params, expectedStatuses) {
  const url = `${baseUrl}${path}`;
  const requestBody = body === null ? null : JSON.stringify(body);
  const response = method === 'GET'
    ? http.get(url, withTags(params, flow, method, path))
    : http.request(method, url, requestBody, withTags(params, flow, method, path));
  recordStatus(response);
  check(response, { [`${method} ${path} status`]: (res) => expectedStatuses.indexOf(res.status) !== -1 }, { flow });
  return { ok: expectedStatuses.indexOf(response.status) !== -1, status: response.status, response };
}

export function createRecruiterProfile(flow) {
  const file = http.file(`ieum-load-card-${__VU}-${__ITER}`, 'business-card.png', 'image/png');
  const response = http.post(`${baseUrl}/visitor-profiles`, {
    ageGroup: 'adult',
    visitorType: 'recruiter',
    businessCard: file
  }, { tags: { flow, endpoint: 'POST /visitor-profiles multipart' } });
  recordStatus(response);
  check(response, { 'recruiter profile created': (res) => res.status === 201 }, { flow });
  return parseJson(response);
}

export function jsonParams(flow, extraHeaders) {
  return { headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) }, tags: { flow } };
}

export function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function uniqueIpHeaders(seed) {
  const second = ((__VU + seed) % 240) + 1;
  const third = ((__ITER + seed) % 240) + 1;
  const fourth = ((__VU + __ITER + seed) % 240) + 1;
  return { 'x-forwarded-for': `10.${second}.${third}.${fourth}` };
}

export function unwrap(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  if (value.data && typeof value.data === 'object') {
    return unwrap(value.data);
  }
  if (value.result && typeof value.result === 'object') {
    return unwrap(value.result);
  }
  return value;
}

export function firstItem(value, label) {
  const data = unwrap(value);
  if (Array.isArray(data.items) && data.items.length > 0) {
    return data.items[0];
  }
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error(`missing ${label}`);
}

export function firstArrayItem(value, label) {
  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }
  throw new Error(`missing ${label}`);
}

export function renderConsoleSummary(data) {
  const reqs = metric(data, 'http_reqs', 'rate').toFixed(2);
  const failed = percent(metric(data, 'http_req_failed', 'rate'));
  const p95 = metric(data, 'http_req_duration', 'p(95)').toFixed(1);
  const success = percent(metric(data, 'ieum_flow_success', 'rate'));
  return `\nIEUM k6 summary: ${reqs} req/s, failed ${failed}, p95 ${p95} ms, flow success ${success}\n`;
}

export function renderMarkdownSummary(data, context) {
  const reqs = metric(data, 'http_reqs', 'rate');
  const iterations = metric(data, 'iterations', 'rate');
  const failed = metric(data, 'http_req_failed', 'rate');
  const p95 = metric(data, 'http_req_duration', 'p(95)');
  const p99 = metric(data, 'http_req_duration', 'p(99)') || metric(data, 'http_req_duration', 'max');
  const success = metric(data, 'ieum_flow_success', 'rate');
  return [
    '# IEUM k6 Load Test Summary',
    '',
    `- Target: ${context.baseUrl}`,
    `- Arrival rate: ${context.rate} iterations/s`,
    `- Duration: ${context.duration}`,
    `- HTTP throughput: ${reqs.toFixed(2)} req/s`,
    `- Iteration throughput: ${iterations.toFixed(2)} it/s`,
    `- HTTP failed: ${percent(failed)}`,
    `- Flow success: ${percent(success)}`,
    `- HTTP p95: ${p95.toFixed(1)} ms`,
    `- HTTP p99/max: ${p99.toFixed(1)} ms`,
    `- 4xx count: ${metric(data, 'ieum_http_4xx', 'count').toFixed(0)}`,
    `- 5xx count: ${metric(data, 'ieum_http_5xx', 'count').toFixed(0)}`,
    ''
  ].join('\n');
}

function withTags(params, flow, method, path) {
  const base = params || {};
  return { ...base, tags: { ...(base.tags || {}), flow, endpoint: `${method} ${path}` } };
}

function recordStatus(response) {
  if (response.status >= 500) {
    http5xx.add(1);
  } else if (response.status >= 400) {
    http4xx.add(1);
  }
}

function parseJson(result) {
  const response = result.response || result;
  try {
    return response.json();
  } catch (error) {
    return {};
  }
}

function metric(data, name, key) {
  const values = data.metrics[name] && data.metrics[name].values;
  const value = values && values[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}
