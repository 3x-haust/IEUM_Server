import { createHash } from 'node:crypto';

export type StudentRosterEntry = {
  readonly studentNumber: string;
  readonly name: string;
};

export type SeedStudentIdentity = {
  readonly oauthId: string;
  readonly name: string;
  readonly email: string;
  readonly studentNumber: string | null;
};

export const LEGACY_ITSHOW_SEED_USER_PREFIX = 'seed-itshow-';
export const SEED_STUDENT_USER_PREFIX = 'seed-student-';
export const SEED_STUDENT_NAME_USER_PREFIX = 'seed-student-name-';

export const STUDENT_ROSTER: readonly StudentRosterEntry[] = [
  { studentNumber: '3101', name: '기태연' },
  { studentNumber: '3102', name: '김민재' },
  { studentNumber: '3103', name: '김이레' },
  { studentNumber: '3104', name: '김이진' },
  { studentNumber: '3105', name: '김주람' },
  { studentNumber: '3106', name: '박준세' },
  { studentNumber: '3107', name: '박준원' },
  { studentNumber: '3108', name: '윤건' },
  { studentNumber: '3109', name: '윤정후' },
  { studentNumber: '3110', name: '이민준' },
  { studentNumber: '3111', name: '이서영' },
  { studentNumber: '3112', name: '이세현' },
  { studentNumber: '3113', name: '장시후' },
  { studentNumber: '3114', name: '전유림' },
  { studentNumber: '3115', name: '전희진' },
  { studentNumber: '3116', name: '조현진' },
  { studentNumber: '3201', name: '곽자경' },
  { studentNumber: '3202', name: '김효일' },
  { studentNumber: '3203', name: '박진우' },
  { studentNumber: '3204', name: '박태윤' },
  { studentNumber: '3205', name: '송민채' },
  { studentNumber: '3206', name: '우지영' },
  { studentNumber: '3207', name: '육준성' },
  { studentNumber: '3208', name: '윤성연' },
  { studentNumber: '3209', name: '윤시웅' },
  { studentNumber: '3210', name: '이상희' },
  { studentNumber: '3211', name: '임소영' },
  { studentNumber: '3212', name: '임지유' },
  { studentNumber: '3213', name: '임하정' },
  { studentNumber: '3214', name: '장세은' },
  { studentNumber: '3215', name: '정다운' },
  { studentNumber: '3216', name: '지수민' },
  { studentNumber: '3301', name: '강재호' },
  { studentNumber: '3302', name: '김서준' },
  { studentNumber: '3303', name: '김승주' },
  { studentNumber: '3304', name: '김지성' },
  { studentNumber: '3305', name: '신채은' },
  { studentNumber: '3306', name: '위은서' },
  { studentNumber: '3307', name: '유성윤' },
  { studentNumber: '3308', name: '윤서우' },
  { studentNumber: '3309', name: '윤태민' },
  { studentNumber: '3310', name: '이상연' },
  { studentNumber: '3311', name: '임동혁' },
  { studentNumber: '3312', name: '장경준' },
  { studentNumber: '3313', name: '정희진' },
  { studentNumber: '3314', name: '조연주' },
  { studentNumber: '3315', name: '조원빈' },
  { studentNumber: '3316', name: '한지연' },
  { studentNumber: '3401', name: '강서현' },
  { studentNumber: '3402', name: '김태환' },
  { studentNumber: '3403', name: '민정원' },
  { studentNumber: '3404', name: '박재영' },
  { studentNumber: '3405', name: '박홍준' },
  { studentNumber: '3406', name: '서규원' },
  { studentNumber: '3407', name: '윤다경' },
  { studentNumber: '3408', name: '이제희' },
  { studentNumber: '3409', name: '이함한해' },
  { studentNumber: '3410', name: '이현우' },
  { studentNumber: '3411', name: '이효은' },
  { studentNumber: '3412', name: '임채이' },
  { studentNumber: '3413', name: '정예서' },
  { studentNumber: '3414', name: '조현서' },
  { studentNumber: '3415', name: '최소영' },
  { studentNumber: '3416', name: '최주희' },
  { studentNumber: '3501', name: '김민선' },
  { studentNumber: '3502', name: '김설애' },
  { studentNumber: '3503', name: '김예인' },
  { studentNumber: '3504', name: '김태현' },
  { studentNumber: '3505', name: '박시은' },
  { studentNumber: '3506', name: '박채윤' },
  { studentNumber: '3507', name: '송지아' },
  { studentNumber: '3508', name: '유태린' },
  { studentNumber: '3509', name: '이다은' },
  { studentNumber: '3510', name: '이민욱' },
  { studentNumber: '3511', name: '이승주' },
  { studentNumber: '3512', name: '전누리' },
  { studentNumber: '3513', name: '정서현' },
  { studentNumber: '3514', name: '정수민' },
  { studentNumber: '3515', name: '정지영' },
  { studentNumber: '3516', name: '한정훈' },
  { studentNumber: '3601', name: '김나영' },
  { studentNumber: '3602', name: '김예진' },
  { studentNumber: '3603', name: '김희향' },
  { studentNumber: '3604', name: '문지우' },
  { studentNumber: '3605', name: '박미주' },
  { studentNumber: '3606', name: '박솔하' },
  { studentNumber: '3607', name: '봉지민' },
  { studentNumber: '3608', name: '송채린' },
  { studentNumber: '3609', name: '신인서' },
  { studentNumber: '3610', name: '이민지' },
  { studentNumber: '3611', name: '이서현' },
  { studentNumber: '3612', name: '이수현' },
  { studentNumber: '3613', name: '임예나' },
  { studentNumber: '3614', name: '장윤아' },
  { studentNumber: '3615', name: '조예찬' },
  { studentNumber: '3616', name: '주다인' },
];

const rosterByName = new Map(STUDENT_ROSTER.map((student) => [normalizeStudentName(student.name), student]));
const rosterByNumber = new Map(STUDENT_ROSTER.map((student) => [student.studentNumber, student]));

export function normalizeStudentName(name: string): string {
  return name.replace(/^\s*\d{4}\s+/, '').replace(/\s+/g, '').trim();
}

export function resolveRosterStudentByName(name: string | null | undefined): StudentRosterEntry | null {
  const normalized = name ? normalizeStudentName(name) : '';
  return normalized ? rosterByName.get(normalized) ?? null : null;
}

export function resolveRosterStudentByNumber(studentNumber: string | null | undefined): StudentRosterEntry | null {
  return studentNumber ? rosterByNumber.get(studentNumber) ?? null : null;
}

export function seedStudentOauthId(studentNumber: string): string {
  return `${SEED_STUDENT_USER_PREFIX}${studentNumber}`;
}

export function seedNameOauthId(name: string): string {
  const normalized = normalizeStudentName(name);
  const hash = createHash('sha1').update(normalized).digest('hex').slice(0, 12);
  return `${SEED_STUDENT_NAME_USER_PREFIX}${hash}`;
}

export function isSeedUserOauthId(oauthId: string): boolean {
  return oauthId.startsWith(LEGACY_ITSHOW_SEED_USER_PREFIX) || oauthId.startsWith(SEED_STUDENT_USER_PREFIX) || oauthId.startsWith(SEED_STUDENT_NAME_USER_PREFIX);
}

export function resolveSeedStudentIdentity(name: string): SeedStudentIdentity {
  const rosterStudent = resolveRosterStudentByName(name);
  if (rosterStudent) {
    const oauthId = seedStudentOauthId(rosterStudent.studentNumber);
    return {
      oauthId,
      name: rosterStudent.name,
      email: `${oauthId}@ieum.local`,
      studentNumber: rosterStudent.studentNumber
    };
  }
  const normalizedName = normalizeStudentName(name) || name.trim();
  const oauthId = seedNameOauthId(normalizedName);
  return {
    oauthId,
    name: name.trim(),
    email: `${oauthId}@ieum.local`,
    studentNumber: null
  };
}
