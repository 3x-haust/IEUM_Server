import { sleep } from 'k6';
import {
  bearerHeaders,
  createRecruiterProfile,
  firstArrayItem,
  firstItem,
  jsonParams,
  measure,
  renderConsoleSummary,
  renderMarkdownSummary,
  request,
  requestJson,
  setBaseUrl,
  uniqueIpHeaders,
  unwrap
} from './k6-support.js';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const RATE = Number(__ENV.RATE || '10');
const DURATION = __ENV.DURATION || '30s';
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || Math.max(10, RATE));
const MAX_VUS = Number(__ENV.MAX_VUS || Math.max(20, RATE * 3));
const P95_LIMIT_MS = Number(__ENV.P95_LIMIT_MS || '2000');
const FAIL_RATE_LIMIT = Number(__ENV.FAIL_RATE_LIMIT || '0.01');
const FLOW_SUCCESS_LIMIT = Number(__ENV.FLOW_SUCCESS_LIMIT || '0.95');
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'dev:load-admin:admin:LoadAdmin:load-admin@example.com';
const STUDENT_TOKEN = __ENV.STUDENT_TOKEN || 'dev:seed-student-1:student:LoadStudent:student1@example.com';

setBaseUrl(BASE_URL);

export const options = {
  scenarios: {
    whole_flow: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS
    }
  },
  thresholds: {
    http_req_failed: [`rate<${FAIL_RATE_LIMIT}`],
    http_req_duration: [`p(95)<${P95_LIMIT_MS}`],
    ieum_flow_success: [`rate>${FLOW_SUCCESS_LIMIT}`]
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)']
};

export function setup() {
  const health = request('setup', 'GET', '/health', null, {}, [200]);
  if (!health.ok) {
    throw new Error(`health check failed: ${health.status}`);
  }
  login(ADMIN_TOKEN, 'setup_admin');
  login(STUDENT_TOKEN, 'setup_student');
  const projects = requestJson('setup', 'GET', '/projects?limit=20', null, {}, [200]);
  const project = firstItem(projects, 'projects');
  const detail = requestJson('setup', 'GET', `/projects/${project.id}`, null, {}, [200]);
  const detailData = unwrap(detail);
  const member = firstArrayItem(detailData.members, 'project members');
  return {
    adminToken: ADMIN_TOKEN,
    studentToken: STUDENT_TOKEN,
    projectId: project.id,
    targetMemberUserId: member.id
  };
}

export default function (state) {
  const roll = Math.random();
  if (roll < 0.25) {
    publicBrowse(state);
  } else if (roll < 0.5) {
    visitorFeedback(state);
  } else if (roll < 0.67) {
    recruiterContact(state);
  } else if (roll < 0.84) {
    adminReadFlow(state);
  } else if (roll < 0.96) {
    studentReadFlow(state);
  } else {
    moderationFlow(state);
  }
  sleep(Math.random() * 0.05);
}

function publicBrowse(state) {
  measure('public_browse', () => {
    const health = request('public_browse', 'GET', '/health', null, {}, [200]);
    const list = request('public_browse', 'GET', '/projects?limit=10', null, {}, [200]);
    const detail = request('public_browse', 'GET', `/projects/${state.projectId}`, null, {}, [200]);
    return health.ok && list.ok && detail.ok;
  });
}

function visitorFeedback(state) {
  measure('visitor_feedback', () => {
    const profile = requestJson('visitor_feedback', 'POST', '/visitor-profiles', {
      ageGroup: 'high_school',
      visitorType: 'general'
    }, jsonParams('visitor_feedback'), [201]);
    const profileData = unwrap(profile);
    const content = __ITER % 9 === 0 ? `badword load-test feedback ${__VU}-${__ITER}` : `Great demo feedback ${__VU}-${__ITER}`;
    const feedback = request('visitor_feedback', 'POST', `/projects/${state.projectId}/feedback`, { content }, jsonParams('visitor_feedback', uniqueIpHeaders(11)), [201]);
    return Boolean(profileData.id) && feedback.ok;
  });
}

function recruiterContact(state) {
  measure('recruiter_contact', () => {
    const profile = createRecruiterProfile('recruiter_contact');
    const profileData = unwrap(profile);
    if (!profileData.id) {
      return false;
    }
    const contact = request('recruiter_contact', 'POST', `/projects/${state.projectId}/contacts`, {
      visitorProfileId: profileData.id,
      targetMemberUserId: state.targetMemberUserId,
      name: `Load Recruiter ${__VU}`,
      organization: 'Load Test Company',
      position: 'Engineer',
      email: `load-${__VU}-${__ITER}@example.com`,
      phone: '010-1234-5678',
      memo: `Contact flow ${__VU}-${__ITER}`
    }, jsonParams('recruiter_contact', uniqueIpHeaders(23)), [201]);
    return contact.ok;
  });
}

function adminReadFlow(state) {
  measure('admin_read', () => {
    const loginRes = login(state.adminToken, 'admin_read');
    const headers = bearerHeaders(state.adminToken);
    const me = request('admin_read', 'GET', '/auth/me', null, { headers }, [200]);
    const dashboard = request('admin_read', 'GET', '/admin/dashboard', null, { headers }, [200]);
    const report = request('admin_read', 'GET', '/admin/reports', null, { headers }, [200]);
    const projects = request('admin_read', 'GET', '/admin/projects?limit=10', null, { headers }, [200]);
    const feedback = request('admin_read', 'GET', '/admin/feedback?limit=10', null, { headers }, [200]);
    const contacts = request('admin_read', 'GET', '/admin/contacts?limit=10', null, { headers }, [200]);
    const users = request('admin_read', 'GET', '/admin/users?limit=10', null, { headers }, [200]);
    const banned = request('admin_read', 'GET', '/admin/banned-words?limit=10', null, { headers }, [200]);
    const recent = request('admin_read', 'GET', '/realtime/events/recent', null, { headers }, [200]);
    const interest = request('admin_read', 'POST', `/admin/projects/${state.projectId}/interests`, null, { headers: { ...headers, ...uniqueIpHeaders(37) } }, [201]);
    return loginRes.ok && me.ok && dashboard.ok && report.ok && projects.ok && feedback.ok && contacts.ok && users.ok && banned.ok && recent.ok && interest.ok;
  });
}

function studentReadFlow(state) {
  measure('student_read', () => {
    const loginRes = login(state.studentToken, 'student_read');
    const headers = bearerHeaders(state.studentToken);
    const projects = request('student_read', 'GET', '/student/projects', null, { headers }, [200]);
    const detail = request('student_read', 'GET', `/student/projects/${state.projectId}`, null, { headers }, [200]);
    const feedback = request('student_read', 'GET', `/student/projects/${state.projectId}/feedback?limit=10`, null, { headers }, [200]);
    const stats = request('student_read', 'GET', `/student/projects/${state.projectId}/stats`, null, { headers }, [200]);
    return loginRes.ok && projects.ok && detail.ok && feedback.ok && stats.ok;
  });
}

function moderationFlow(state) {
  measure('moderation', () => {
    const created = requestJson('moderation', 'POST', `/projects/${state.projectId}/feedback`, {
      content: `badword moderation target ${__VU}-${__ITER}`
    }, jsonParams('moderation', uniqueIpHeaders(41)), [201]);
    const feedbackData = unwrap(created);
    if (!feedbackData.id) {
      return false;
    }
    const headers = bearerHeaders(state.adminToken);
    const patched = request('moderation', 'PATCH', `/admin/feedback/${feedbackData.id}/status`, {
      status: 'public',
      moderationReason: 'load_test_reviewed'
    }, { headers }, [200]);
    return patched.ok;
  });
}

function login(token, flow) {
  return request(flow, 'POST', '/auth/login', { accessToken: token }, jsonParams(flow), [200, 201]);
}

export function handleSummary(data) {
  const jsonPath = __ENV.K6_SUMMARY_JSON || 'reports/load-test/latest-k6-summary.json';
  const mdPath = __ENV.K6_SUMMARY_MD || 'reports/load-test/latest-k6-summary.md';
  return {
    stdout: renderConsoleSummary(data),
    [jsonPath]: JSON.stringify(data, null, 2),
    [mdPath]: renderMarkdownSummary(data, { baseUrl: BASE_URL, rate: RATE, duration: DURATION })
  };
}
