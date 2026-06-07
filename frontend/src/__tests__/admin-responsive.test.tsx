import { render, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminApp } from '../AdminApp';

describe('IEUM responsive admin pages', () => {
  it('keeps mobile admin pages within viewport and renders empty search state', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    render(<AdminApp initialPath="/admin/feedback" />);

    fireEvent.click(screen.getByRole('button', { name: '메뉴' }));
    const nav = screen.getByRole('navigation', { name: '관리자 메뉴' });
    fireEvent.click(within(nav).getByRole('link', { name: '금칙어' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '검색' }), {
      target: { value: '없는단어' }
    });

    expect(screen.getByRole('heading', { name: '금칙어 관리' })).toBeInTheDocument();
    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
