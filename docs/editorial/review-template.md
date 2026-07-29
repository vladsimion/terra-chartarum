# Essay outline and narrative review

Complete this review after the outline is mapped and again after the full draft,
before Design QA or Publish. Copy the decision into the editorial package
manifest so `npm run editorial:validate` can enforce the gate.

## Outline review

- Thesis is one arguable sentence, not a topic label.
- Every section advances that thesis and has at least one resolved map.
- Primary and secondary rooms describe the actual argument.
- Interactive moments reveal evidence or comparison that prose alone cannot.
- The sequence alternates evidence, interpretation, and synthesis deliberately.

Decision: `approved` / `approved-with-notes` / `blocked`

## Narrative-flow review

- The opening states the problem and the essay’s promise.
- Voice begins from inspectable evidence and names accountable actors.
- Tone is exact, curious, and critical without assigning unsupported motives.
- Section transitions explain why the next body of evidence follows.
- Pacing slows at contested evidence and compresses repeated scaffolding.
- Technical terms are introduced before they carry argumentative weight.
- Catalogue detail supports the through-line without turning into an inventory.
- The conclusion changes or sharpens the opening claim.
- Cross-links are placed where the conceptual hand-off occurs.

Decision: `approved` / `approved-with-notes` / `blocked`

## Record

- Reviewer:
- Date:
- Blocking notes:
- Non-blocking revisions:
- Follow-up ticket(s):

## Release decision

Check `data/editorial/release-policy.json` after the outline and narrative
decisions are recorded.

- Decision: `release` / `hold` / `rollback`
- Policy criterion (when not `release`):
- Last known good commit or deployment:
- Owner:
- Revalidation evidence:
