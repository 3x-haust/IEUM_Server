import { useMemo, useState } from 'react';

type AdminAppProps = {
  readonly initialPath?: string;
};

type AdminRoute = {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly sectionTitle: string;
  readonly description: string;
  readonly action: string;
  readonly statLabels: readonly string[];
  readonly detailTitle: string;
  readonly note: string;
  readonly rows: readonly AdminRow[];
};

type AdminRow = {
  readonly name: string;
  readonly meta: string;
  readonly status: string;
  readonly tone: 'cream' | 'coral' | 'purple';
};

const routes = [
  {
    path: '/admin/dashboard',
    label: '대시보드',
    title: '관리자 대시보드',
    sectionTitle: '행사 운영 요약',
    description: '피드백, 컨택, 관심 신호를 행사 운영자가 바로 확인합니다.',
    action: '리포트',
    statLabels: ['프로젝트', '피드백', '컨택', '관심'],
    detailTitle: '실시간',
    note: '새 피드백/컨택 이벤트가 실시간으로 반영됩니다.',
    rows: [
      { name: 'IEUM Admin', meta: 'Network', status: '공개', tone: 'cream' },
      { name: 'Growy', meta: 'Global', status: '공개', tone: 'cream' },
      { name: 'AI EXP', meta: 'AI', status: '대기', tone: 'coral' }
    ]
  },
  {
    path: '/admin/projects',
    label: '프로젝트',
    title: '프로젝트 조회',
    sectionTitle: '등록 프로젝트',
    description: '팀/스택/공개 여부와 프로젝트별 연결 데이터를 확인합니다.',
    action: '필터',
    statLabels: ['공개', '비공개', '피드백', '컨택'],
    detailTitle: '프로젝트 상세',
    note: '프로젝트 데이터는 DB seed/운영 작업으로 관리합니다.',
    rows: [
      { name: 'IEUM', meta: 'Network', status: '공개', tone: 'cream' },
      { name: 'Growy', meta: 'Global', status: '공개', tone: 'cream' },
      { name: 'AI EXP', meta: 'AI', status: '비공개', tone: 'coral' }
    ]
  },
  {
    path: '/admin/feedback',
    label: '피드백',
    title: '피드백 관리',
    sectionTitle: '익명 피드백 검수',
    description: '금칙어 자동 처리 결과와 공개/차단 상태를 검토합니다.',
    action: '처리',
    statLabels: ['전체', '공개', '차단', '삭제'],
    detailTitle: '피드백 상세',
    note: '작성자 정보는 저장하지 않고 운영 로그만 남깁니다.',
    rows: [
      { name: 'IEUM', meta: '설명이 좋아요', status: '공개', tone: 'cream' },
      { name: 'Growy', meta: '문의 있어요', status: '대기', tone: 'coral' },
      { name: 'AI EXP', meta: '비속어 포함', status: '차단', tone: 'purple' }
    ]
  },
  {
    path: '/admin/contacts',
    label: '컨택',
    title: '회사 컨택 관리',
    sectionTitle: '회사 관계자 컨택',
    description: '명함 제출 기반 컨택과 OCR 결과를 확인합니다.',
    action: 'OCR',
    statLabels: ['전체', '확인', '대기', 'OCR'],
    detailTitle: '명함/OCR',
    note: '개인정보는 권한 확인 후에만 노출됩니다.',
    rows: [
      { name: 'Mirim Inc', meta: '박하나', status: '신규', tone: 'coral' },
      { name: 'Recruit Lab', meta: '최도윤', status: '완료', tone: 'cream' },
      { name: 'Expo Partner', meta: 'OCR 대기', status: 'OCR', tone: 'purple' }
    ]
  },
  {
    path: '/admin/banned-words',
    label: '금칙어',
    title: '금칙어 관리',
    sectionTitle: '금칙어 사전',
    description: 'Aho-Corasick 기반 자동 차단 단어 목록을 운영합니다.',
    action: '추가',
    statLabels: ['전체', '비활성', '적용', '버전'],
    detailTitle: '단어 상세',
    note: '검색어 변경 시 캐시를 자동으로 무효화합니다.',
    rows: [
      { name: '욕설 A', meta: 'normalized_a', status: '활성', tone: 'cream' },
      { name: '광고문구', meta: 'ad_word', status: '비활성', tone: 'purple' },
      { name: '스팸', meta: 'spam', status: '활성', tone: 'cream' }
    ]
  },
  {
    path: '/admin/users',
    label: '사용자',
    title: '사용자/권한 조회',
    sectionTitle: 'Mirim OAuth 사용자',
    description: '학생/선생님/관리자 역할과 env 등록 여부를 확인합니다.',
    action: '검색',
    statLabels: ['학생', '선생님', '관리자', '최근'],
    detailTitle: '권한 상세',
    note: '화면에서 역할 변경은 제공하지 않습니다.',
    rows: [
      { name: '김이음', meta: 'student@', status: '학생', tone: 'cream' },
      { name: '박선생', meta: 'teacher@', status: '선생님', tone: 'cream' },
      { name: '유성윤', meta: 'admin@', status: '관리자', tone: 'coral' }
    ]
  },
  {
    path: '/admin/reports',
    label: '리포트',
    title: '통계/리포트',
    sectionTitle: '행사 요약 리포트',
    description: '프로젝트별 피드백/컨택 방문자 유형 통계를 모읍니다.',
    action: '생성',
    statLabels: ['요약', '피드백', '컨택', '완료'],
    detailTitle: '리포트',
    note: '행사 종료 후 공유 가능한 형태로 정리됩니다.',
    rows: [
      { name: '전체 요약', meta: '행사 전체', status: '완료', tone: 'cream' },
      { name: '프로젝트별', meta: '오늘', status: '완료', tone: 'cream' },
      { name: '방문자 유형', meta: '오늘', status: '대기', tone: 'coral' }
    ]
  }
] as const satisfies readonly AdminRoute[];

const statValues = ['24', '1,246', '138', '321'] as const;
const barTones = ['cream', 'coral', 'purple', 'cream', 'blue', 'coral', 'green'] as const;

function findRoute(path: string): AdminRoute {
  return routes.find((route) => route.path === path) ?? routes[0]!;
}

export function AdminApp({ initialPath = '/admin/dashboard' }: AdminAppProps) {
  const [path, setPath] = useState(initialPath);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const route = findRoute(path);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return route.rows;
    }
    return route.rows.filter((row) => {
      const haystack = `${row.name} ${row.meta} ${row.status}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, route.rows]);

  const handleNavigate = (nextPath: string) => {
    setPath(nextPath);
    setQuery('');
    setMenuOpen(false);
  };

  return (
    <main className="ieum-admin" aria-label="IEUM admin app">
      <header className="admin-header">
        <a className="brand" href="/admin/dashboard" onClick={(event) => {
          event.preventDefault();
          handleNavigate('/admin/dashboard');
        }}>
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>IEUM</strong>
            <small>{route.path}</small>
          </span>
        </a>
        <h1>{route.title}</h1>
        <button className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)}>
          메뉴
        </button>
        <button className="logout-button" type="button">로그아웃</button>
      </header>

      <div className="admin-layout">
        <nav className={menuOpen ? 'admin-nav is-open' : 'admin-nav'} aria-label="관리자 메뉴">
          {routes.map((item) => (
            <a
              aria-current={item.path === route.path ? 'page' : undefined}
              className={item.path === route.path ? 'active' : undefined}
              href={item.path}
              key={item.path}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate(item.path);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <section className="admin-content" aria-labelledby="page-title">
          <div className="section-head">
            <h2 id="page-title">{route.sectionTitle}</h2>
            <p>{route.description}</p>
          </div>

          <div className="stats-grid">
            {route.statLabels.map((label, index) => (
              <div className="stat-cell" key={label}>
                <span>{label}</span>
                <strong className={`stat-tone-${index}`}>{statValues[index] ?? '0'}</strong>
              </div>
            ))}
          </div>

          <div className="filter-strip">
            {['전체', '오늘', '대기', '완료'].map((chip, index) => (
              <button className={index === 0 ? 'chip active' : 'chip'} key={chip} type="button">
                {chip}
              </button>
            ))}
            <label className="search-field">
              <span>검색</span>
              <input aria-label="검색" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button className="action-button" type="button">{route.action}</button>
          </div>

          <div className="content-grid">
            <div className="chart large" aria-label="운영 그래프">
              <ChartBars />
            </div>
            <div className="chart small" aria-label="상태 그래프">
              <ChartBars compact />
            </div>
            <div className="rows-panel">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <div className="data-row" key={`${row.name}-${row.status}`}>
                    <strong>{row.name}</strong>
                    <span>{row.meta}</span>
                    <em className={`badge ${row.tone}`}>{row.status}</em>
                  </div>
                ))
              ) : (
                <p className="empty-state">검색 결과가 없습니다</p>
              )}
            </div>
            <aside className="detail-panel">
              <h3>{route.detailTitle}</h3>
              <span />
              <span />
              <span />
              <div>
                <button type="button">처리</button>
                <button type="button">보기</button>
              </div>
            </aside>
            <p className="note-panel">{route.note}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function ChartBars({ compact = false }: { readonly compact?: boolean }) {
  return (
    <>
      <div className="chart-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={compact ? 'bars compact' : 'bars'} aria-hidden="true">
        {barTones.map((tone, index) => (
          <span className={`bar ${tone}`} key={`${tone}-${index}`} />
        ))}
      </div>
    </>
  );
}
