import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublishMenu } from '../app/components/PublishMenu';
import { trackPublishClick } from '../app/utils/analytics';

vi.mock('../app/utils/analytics', () => ({
  trackPublishClick: vi.fn(),
}));

describe('PublishMenu', () => {
  const button = document.createElement('button');
  document.body.appendChild(button);
  const ref = { current: button } as React.RefObject<HTMLButtonElement>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (trackPublishClick as any).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <PublishMenu isOpen={false} onClose={() => {}} onPublish={async () => {}} buttonRef={ref} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('copies URL and tracks click', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    const { getByLabelText } = render(
      <PublishMenu
        isOpen={true}
        onClose={() => {}}
        onPublish={async () => {}}
        buttonRef={ref}
        publishedAppUrl="https://example.com/app"
      />
    );

    const copyBtn = getByLabelText('Copy to clipboard');
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('https://example.com/app');
    expect(trackPublishClick).toHaveBeenCalledWith({ publishedAppUrl: 'https://example.com/app' });
    // success icon shows
    expect(getByLabelText('Copied to clipboard')).toBeInTheDocument();

    vi.runAllTimers();
  });

  it('shows spinner during publishing', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const { getByText, getByLabelText } = render(
      <PublishMenu isOpen onClose={() => {}} onPublish={publish} buttonRef={ref} />
    );

    fireEvent.click(getByText('Publish App'));
    expect(publish).toHaveBeenCalled();
    expect(getByLabelText('Publishing in progress')).toBeInTheDocument();
  });
});
