import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminApp } from '../AdminApp';

describe('IEUM admin dashboard', () => {
  it('renders dashboard shell with Figma-matched admin navigation', () => {
    render(<AdminApp initialPath="/admin/dashboard" />);

    expect(screen.getByRole('heading', { name: '관리자 대시보드' })).toBeInTheDocument();
    expect(screen.getByText('IEUM')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: '관리자 메뉴' });
    expect(within(nav).getAllByRole('link')).toHaveLength(7);
    expect(within(nav).getByRole('link', { name: '프로젝트' })).toHaveAttribute('href', '/admin/projects');

    expect(screen.getByText('행사 운영 요약')).toBeInTheDocument();
    expect(screen.getByText('새 피드백/컨택 이벤트가 실시간으로 반영됩니다.')).toBeInTheDocument();
  });
});
