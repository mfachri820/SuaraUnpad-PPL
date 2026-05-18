/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    get: vi.fn(() => undefined),
    remove: vi.fn(),
  },
}));

import Navbar from '../components/ui/Navbar';

describe('Navigation usability', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('renders the mobile menu controls on a small viewport', () => {
    act(() => {
      createRoot(container!).render(<Navbar />);
    });

    const reportLink = Array.from(container!.querySelectorAll('a')).find(
      (anchor) => anchor.textContent?.trim() === 'LAPOR'
    );
    const menuButton = container!.querySelector('button');

    expect(reportLink).toBeTruthy();
    expect(menuButton).toBeTruthy();
  });

  it('calls router.push exactly once with /login when logout is triggered', () => {
    act(() => {
      createRoot(container!).render(<Navbar />);
    });

    const logoutButton = Array.from(container!.querySelectorAll('button')).find(
      (button) => button.title === 'Keluar dari akun'
    );

    expect(logoutButton).toBeTruthy();

    act(() => {
      logoutButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
