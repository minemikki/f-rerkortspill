# Learning systems

The flow is **SEE → UNDERSTAND → DECIDE → ACT → REVIEW → REMEMBER**. Theory is never the
entire product. It is attached to situations the learner has just experienced.

## 1. Theory engine (`src/learning/types.ts`, `bank.ts`)

Each question is a data-driven `TheoryQuestion` with these fields:

`id`, `version`, `category`, `topic`, `subtopic`, `difficulty` (1–3), `questionType`, `prompt`,
`imageOrSceneReference` (sign, diagram or linked 3D scenario), `answerOptions`, `correctAnswer`
(an option id, or an ordered list for ordering questions), `explanation`, `misconception` (per wrong
option), `linkedScenarioIds`, `learningObjectiveIds`, `skills` (evidence weights),
`sourceMetadata` (publisher, section, url, `confidence: checked | uncertain`),
`professionalReviewStatus` (`draft | review_requested | approved | needs_revision`), `reviewHistory`.

* **Question types supported by the schema and UI:** multiple choice, image choice, situational,
  hazard recognition, ordering (tap in order), sign recognition, what-happens-next, scene-linked.
  Signs and diagrams are inline SVG (`ui/learn/Diagram.tsx`). A scene reference currently falls
  back to the matching diagram. Capturing frames from the 3D scenario is a next step.
* **Bank v0:** 21 items, 3 per scenario plus a recall variant plus a few general items, and
  9 learning objectives. **All items are drafts.** Rule citations marked `checked` were compared
  by the developer with the text of Trafikkreglene on Lovdata (§ 3 nr. 1, § 7 nr. 1–4, § 9 nr. 2,
  § 13 nr. 1–2). That is not a professional review. Items citing Statens vegvesen or Skiltforskriften
  are marked `uncertain` and must be verified.
* **Versioning rule:** any content change bumps `version` and resets the status to `draft`.
  `approved` requires a named reviewer in `reviewHistory`, and a test enforces this
  (`learning.test.ts`).

## 2. Mastery (`src/learning/mastery.ts`)

* There are ten skills: trafficRules, observation, hazardAwareness, riskUnderstanding,
  speedAdaptation, positioning, cyclists, pedestrians, intersections and roundabouts. There are
  also per-topic theory scores.
* Each skill has **two independent evidence tracks**:
  * **Theory**: answers to theory questions. Weighted by the question's skill weights and
    difficulty (a hard question answered correctly counts more; an easy one answered wrongly counts more).
  * **Applied**: what the learner did in scenarios and practice drives. Step category scores map
    to skills (rules → trafficRules, observation → observation, risk → riskUnderstanding,
    reaction → hazardAwareness), plus the scenario's own topic skills. **Retries count half**:
    they show learning, but are weaker evidence of what you would do on the road.
* Evidence is a recency-weighted mean with a capped weight, so recent behaviour keeps mattering.
  Levels are *Ikke testet → Øver → På vei → Sikker*.
* **Gap detection:** «Du kan regelen – nå gjelder det å bruke den i trafikken» (theory ≫ applied), and the reverse.
* **Spaced repetition:** a Leitner box per question (intervals 0/1/3/7/16 days). A wrong answer is due again today.
* All scores are labelled as game/learning points. **They are never a prediction** of the
  theory test or the driving test.

## 3. Recommendations: «DIN TRENING I DAG» (`src/learning/recommend.ts`)

This is deterministic: the same state always gives the same plan, and every item carries a
reason. A plan is about 12–14 minutes:

1. **One scenario:** the next new one, or the scenario that trains the weakest skill.
2. **Targeted theory:** 4–12 questions ranked by relevance to the two weakest skills and by novelty.
3. **Repetition:** questions that are due.
4. **A challenge:** 3 stars on a weak-skill scenario. If no challenge exists, a practice drive;
   for a brand-new learner, a second new scenario.

The weakest skills are chosen by `weakness()`. Unknown skills count as 0.35, so new skills get introduced.

## 4. The S1 learning loop

During the decision, **«Lær regelen»** opens the rule card (one rule, one diagram, one source) in
the decision panel. Time freezes while it is open (`runner.setHold`). The step is then marked as
hinted: a correct first attempt scores ×0.8 and gives 60 % XP.

After the scenario: **rule card → 3 contextual questions (with immediate explanation and
misconception feedback) → 1 recall variant (same rule, mirrored situation) → mastery update
(theory vs «i trafikken», with deltas) → result screen** (stars, XP, level). The loop can be
skipped, but skipping gives no theory evidence. The 3D canvas pauses underneath to save battery.

## 5. Control modes: learn, practice, exam (`CONTROL_MODES` in `types.ts`)

| | learn (scenarios) | practice | exam (simulated) |
|---|---|---|---|
| hints / «Lær regelen» | yes (costs points) | no | no |
| answer buttons | yes | no – you drive | no |
| instructor | coach | route + short coaching | route only |
| pause | yes | yes | no |
| action log + report | – | yes | yes |
| feedback | immediate | after the drive | after the drive |

All three modes use the same world (`ResidentialKryss`), the same rendering pipeline and the
same scenario/sim conventions. **Exam** is an architecture flag on the practice slice
(`/#/provekjoring`): no coaching, route instructions only. It is clearly labelled as a training
simulation, not an official test.

## 6. Practice vertical slice (`src/practice/`, `/#/ovelse`)

* **Vehicle:** a kinematic bicycle model at a fixed 60 Hz step. Steering lock reduces with speed.
  There is no drifting, no race physics and no randomness, so a drive is fully deterministic.
* **Route** (instructor): «Kjør rett fram. Fartsgrensen er 30.» → «I krysset tar du til venstre.» →
  «Kjør inn til høyre og stans ved postkassestativet.» In practice mode a coaching nudge comes if
  you approach the blind junction without looking right.
* **Hazards:** the car from the right is released so that it reaches the junction just after you
  would at your current speed. This is the left-turn rule in Trafikkreglene § 7 nr. 2. A pedestrian
  crosses the road you turn into (§ 7 nr. 3).
* **Inputs:** desktop uses W/S, A/D, Q/E (head check left/right) and Z/X (indicators). Mobile uses a
  drag steering pad, large gas/brake pedals, indicator buttons and hold-to-look buttons. All are
  thumb-sized and no tiny taps are required.
* **Evaluator:** produces events across four areas (OBSERVASJON, FARTSTILPASNING, PLASSERING,
  TRAFIKKREGLER) with concrete Norwegian feedback, for example «Du kom inn mot krysset i 30 km/t.
  Hekken skjuler trafikk fra høyre – farten må ned til du har oversikt.» A serious traffic-rule
  fault caps the total. The verdict is *God kjøring / Noe å øve på / Alvorlig feil*. The result
  feeds applied mastery. All criteria are listed on the review page.
* **Tests:** a scripted careful driver completes the route with no faults; a careless driver gets
  speed, observation and yield faults; drives are deterministic; exam mode never coaches.

## 7. Theory test demonstrator (`/#/teori`)

10 or 21 questions, timed (90 s per question) or untimed, a question navigator, submit with
confirmation, score, per-category breakdown, mistake review with explanation and source, and a
**«Tren dette»** button that opens the linked 3D scenario. It is labelled as practice, not the
official Statens vegvesen test, and its count, timing and pass mark differ from the official test.

## 8. Professional review (`/#/faglig`)

This is a printable page for a trafikklærer. It contains:
* every scenario step, option, outcome, explanation and rule source;
* the full question bank, with correct answers, misconceptions, sources (checked or uncertain),
  links, skills, status and a review box;
* the rule cards;
* the practice-drive assessment criteria and thresholds;
* the product boundaries.

It can also export everything as JSON. Nothing is approved automatically.

## 9. Accessibility and usability

* Readable type, with large decision buttons (≥ 54–60 px) and pedal and steering targets of 86 px or more.
* High contrast (near-black, white, yellow).
* Keyboard play everywhere: 1–3 for choices, Space to brake, W/A/S/D/Q/E/Z/X when driving.
* ARIA roles: radio groups, lists, live regions for instructor messages and the theory timer.
* `prefers-reduced-motion`: CSS animations, motion transitions (`MotionConfig reducedMotion="user"`)
  and camera shake/speed effects are all reduced.
* No perfect reflexes are required. The rule panel pauses time, and retry is always free.
  Instructor speech is shown as text: audio has a text equivalent everywhere.

## 10. Audio architecture (`src/audio/sfx.ts`)

The WebAudio engine synthesises engine sound (from speed and acceleration), indicator ticks, and
cues for brake/impact, success/warning, UI, found/miss and ambience. The volume of road users'
cues depends on their distance. Everything is procedural placeholder audio.

**Needs professional audio:** engine loops for a compact petrol car and an EV
(idle/low/mid/high), tyre/road noise on dry asphalt, an indicator relay, brake squeal, a soft
impact, a Nordic suburban ambience (birds, distant traffic, wind in birch), footsteps, a bike bell
and freewheel, a child's voice/ball bounce cue, a UI set (select/correct/miss/xp/level-up), and
**instructor voice-over in Norwegian** (about 40 route and coaching lines, bokmål; nynorsk optional).

### Phase 3 audio additions

* **Engine:** 4 harmonic partials (triangle/sine) with LFO amplitude modulation, a 3-gear model
  with load and engine braking. **Tyres:** speed-dependent band-passed noise and brake scrub.
  **Ambience bus:** traffic rumble, air and wind layers plus occasional birds; stopped with the scene.
* **Replay transition:** a short «rewind» sweep when the replay starts. No arcade stingers, no
  coin sounds.

## 11. Instructor voice (`src/audio/voice.ts`)

Every spoken line has an id and a text (`VOICE_LINES`: start, turn, stop, look-around coaching,
next right/left, straight on, pull over, roundabout exits, done). Each line plays in this order:
1. a recorded file `public/assets/voice/<id>.mp3` if the id is in `RECORDED` (empty today);
2. otherwise a Norwegian browser voice (nb/no/nn) through `speechSynthesis`, if one exists;
3. otherwise text only. The text is always shown, so audio is never required.

The «Stemme på/av» toggle is saved in localStorage (`kjor-voice`). Recording the ~40 lines means
dropping files in and listing their ids. No code changes are needed.

## 12. Replay signature: FREEZE → REPLAY → HIGHLIGHT → WHAT YOU MISSED → RULE → TRY AGAIN

1. **Freeze** (1.1 s hold on the moment of the mistake).
2. **Replay in two stages:** first from the driver's own chase view («Replay · din utsikt»), then a
   crane up to the overhead teaching view («ovenfra»). Highlight rings show the hazard.
3. **Two-line caption:** line 1 is what you did see, line 2 (yellow, after the reveal) is what you
   missed. Example from S2: «Ballen var varselet.» / «Barnet kom etter.» Captions are scenario
   content (`OutcomeContent.replay`).
4. **Mistake card** with the rule (diagram + rule-card title + source), then «Prøv igjen».

## 13. Observation groundwork (practice mode)

Every head check (Q/E or the «Se» buttons) is logged with time, side and the context it came before
(`Observation { t, side, before }`). The assessment shows the sequence as chips («se høyre → se
venstre → kryss»). The data model is ready for mirror and blind-spot checks; the UI has left/right
today. Assessment events now carry **WHAT HAPPENED + WHY IT MATTERED + WHAT TO PRACTISE** (`COACH`
table in `src/practice/session.ts`). The indicator cancels itself after a turn (>1.1 rad heading
change with the wheel straightened).
