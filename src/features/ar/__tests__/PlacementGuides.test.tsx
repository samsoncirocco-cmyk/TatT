import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlacementGuides, {
  PLACEMENT_GUIDES,
  nextGuide,
  guideById,
} from '../components/PlacementGuides';

/**
 * The placement guide is a ruler, not a tracker: opt-in, cycling through
 * three silhouettes, and never intercepting a pointer — the design must be
 * draggable straight through it.
 */

describe('PlacementGuides', () => {
  it('renders nothing when off — off is the default state upstream', () => {
    const { container } = render(<PlacementGuides guide={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the requested silhouette, hidden from the accessibility tree', () => {
    render(<PlacementGuides guide="forearm" />);
    const el = screen.getByTestId('placement-guide');
    expect(el.getAttribute('data-guide')).toBe('forearm');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    // Dragging the design straight through the guide must keep working.
    expect(el.className).toContain('pointer-events-none');
    expect(el.querySelector('svg')).toBeTruthy();
  });

  it('has a silhouette for each of the three placements', () => {
    for (const g of PLACEMENT_GUIDES) {
      const { unmount } = render(<PlacementGuides guide={g.id} />);
      expect(screen.getByTestId('placement-guide').getAttribute('data-guide')).toBe(g.id);
      unmount();
    }
    expect(PLACEMENT_GUIDES.map((g) => g.id)).toEqual(['forearm', 'wrist', 'upper-arm']);
  });
});

describe('nextGuide', () => {
  it('cycles off → forearm → wrist → upper arm → off', () => {
    expect(nextGuide(null)).toBe('forearm');
    expect(nextGuide('forearm')).toBe('wrist');
    expect(nextGuide('wrist')).toBe('upper-arm');
    expect(nextGuide('upper-arm')).toBeNull();
  });
});

describe('guideById', () => {
  it('carries a label and an in-voice hint for every guide', () => {
    for (const g of PLACEMENT_GUIDES) {
      const guide = guideById(g.id);
      expect(guide.label.length).toBeGreaterThan(0);
      expect(guide.hint.length).toBeGreaterThan(0);
    }
  });
});
