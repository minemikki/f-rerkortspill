import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../../learning/bank'
import { DiagramSvg, SceneVisual } from './Diagram'

const ANSWER_WORDS = ['KJØRER FØRST', 'VIKER', 'VIK FOR ALLE']

describe('question diagrams never give the answer away', () => {
  it('hint=false hides answer labels; hint=true (rule cards) keeps them', () => {
    expect(renderToStaticMarkup(<DiagramSvg id="kryss-hoyre" />)).toContain('KJØRER FØRST')
    expect(renderToStaticMarkup(<DiagramSvg id="kryss-hoyre" hint={false} />)).not.toContain('KJØRER FØRST')
  })
  it('no question shows an answer label before it is checked', () => {
    for (const q of QUESTIONS) {
      if (!q.imageOrSceneReference) continue
      const html = renderToStaticMarkup(<SceneVisual scene={q.imageOrSceneReference} hint={false} />)
      for (const w of ANSWER_WORDS) expect(html, `${q.id}: ${w}`).not.toContain(w)
    }
  })
})
