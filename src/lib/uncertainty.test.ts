import { describe, expect, it } from 'vitest';
import {
  DISPROOF_ENCODINGS,
  DISPROOF_STATES,
  assessPresentability,
  claimsACause,
  encodingFor,
  statusLine,
  transcriptFor,
  type DisputedRecord,
} from './uncertainty';
import { getGhostRecords } from './antarctica';

const complete: DisputedRecord = {
  id: 'test-ghost',
  displayName: 'A reported island',
  claimant: 'A named master',
  whatWasReported: 'An island with soundings around it.',
  whyPlausible: 'One report from a rarely crossed ocean, with nothing against it.',
  laterEvidence: 'Later searches over the position found open water.',
  laterStatus: 'disproved',
  currentScholarlyStatus: 'disproved',
};

describe('presentability', () => {
  it('accepts a record that answers all four questions', () => {
    expect(assessPresentability(complete)).toEqual({ presentable: true, missing: [] });
  });

  it('refuses a record that says only that someone was wrong', () => {
    const bare = { ...complete, whyPlausible: '', whatWasReported: '' };
    const result = assessPresentability(bare);
    expect(result.presentable).toBe(false);
    expect(result.missing).toEqual(['whatWasReported', 'whyPlausible']);
  });

  it('treats whitespace as absent', () => {
    expect(assessPresentability({ ...complete, claimant: '   ' }).missing).toEqual(['claimant']);
  });

  it('does not require review, only context', () => {
    // An unreviewed record is presentable. An uncontextualised one is not.
    expect(assessPresentability({ ...complete, sourceLocator: 'pending' }).presentable).toBe(true);
  });
});

describe('non-colour encoding', () => {
  it('gives every state a distinct dash pattern', () => {
    const patterns = DISPROOF_STATES.filter((s) => s !== 'not_applicable').map((s) =>
      DISPROOF_ENCODINGS[s].dash.join(','),
    );
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('gives every state a distinct label', () => {
    const labels = DISPROOF_STATES.map((s) => DISPROOF_ENCODINGS[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('falls back to unresolved rather than throwing on an unknown state', () => {
    expect(encodingFor('something-new')).toBe(DISPROOF_ENCODINGS.unresolved);
  });
});

describe('causal attribution', () => {
  it('reports no cause when none is recorded', () => {
    expect(claimsACause(complete)).toBe(false);
  });

  it('reports a cause only when one is actually present', () => {
    expect(claimsACause({ ...complete, attributedCause: '  ' })).toBe(false);
    expect(claimsACause({ ...complete, attributedCause: 'Refraction, after a named study.' })).toBe(
      true,
    );
  });
});

describe('status line', () => {
  it('names the claimant and never calls the feature wrong', () => {
    const line = statusLine(complete);
    expect(line).toContain('A named master');
    expect(line.toLowerCase()).not.toContain('wrong');
    expect(line.toLowerCase()).not.toContain('myth');
  });

  it('shows both statuses when scholarship has moved since', () => {
    const line = statusLine({ ...complete, currentScholarlyStatus: 'unresolved' });
    expect(line).toContain('Disproved at the time');
    expect(line).toContain('unresolved in current scholarship');
  });
});

describe('static transcript', () => {
  it('reads as an argument, not a form', () => {
    expect(transcriptFor(complete).map((r) => r.heading)).toEqual([
      'Who claimed it',
      'What was reported',
      'Why it was plausible',
      'What later evidence said',
      'Status',
    ]);
  });

  it('inserts an attributed cause before the status when one exists', () => {
    const rows = transcriptFor({ ...complete, attributedCause: 'Ice misread as land.' });
    expect(rows.map((r) => r.heading)).toContain('Attributed cause');
    expect(rows[rows.length - 1].heading).toBe('Status');
  });
});

describe('the Antarctic ghosts satisfy the shared contract', () => {
  it('every ghost record is presentable', () => {
    const ghosts = getGhostRecords();
    expect(ghosts.length).toBeGreaterThan(1);
    for (const ghost of ghosts) {
      const record = ghost as unknown as DisputedRecord;
      expect(assessPresentability(record), ghost.id).toEqual({ presentable: true, missing: [] });
    }
  });

  it('no ghost record attributes a cause, because none has a source for one', () => {
    for (const ghost of getGhostRecords()) {
      expect(claimsACause(ghost as unknown as DisputedRecord), ghost.id).toBe(false);
    }
  });

  it('the states in use all have an encoding', () => {
    for (const ghost of getGhostRecords()) {
      expect(DISPROOF_STATES).toContain(ghost.laterStatus);
    }
  });
});
