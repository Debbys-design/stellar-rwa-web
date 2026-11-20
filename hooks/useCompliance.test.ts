import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCompliance } from './useCompliance';

const mockGetCompliance = vi.fn();

vi.mock('@/lib/contracts', () => ({
  getCompliance: (...args: unknown[]) => mockGetCompliance(...args),
}));

describe('useCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces a rejected compliance lookup as readable error state', async () => {
    mockGetCompliance.mockRejectedValueOnce(new Error('RPC unavailable'));

    const { result } = renderHook(() => useCompliance('GABC123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('RPC unavailable');
    expect(result.current.compliance).toBeNull();
  });

  it('re-runs the lookup when the address changes (no stale closure)', async () => {
    mockGetCompliance.mockResolvedValue({ compliant: true });

    const { result, rerender } = renderHook(
      ({ address }: { address: string }) => useCompliance(address),
      { initialProps: { address: 'GABC123' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockGetCompliance).toHaveBeenCalledTimes(1);
    expect(mockGetCompliance).toHaveBeenLastCalledWith('GABC123');

    rerender({ address: 'GDEF456' });

    await waitFor(() => {
      expect(mockGetCompliance).toHaveBeenCalledTimes(2);
    });
    expect(mockGetCompliance).toHaveBeenLastCalledWith('GDEF456');
  });

  it('does not set state after unmount', async () => {
    let resolveLookup: (value: unknown) => void = () => {};
    mockGetCompliance.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );

    const { unmount } = renderHook(() => useCompliance('GABC123'));

    unmount();
    resolveLookup({ compliant: true });

    await waitFor(() => {
      expect(mockGetCompliance).toHaveBeenCalledTimes(1);
    });
  });
});
