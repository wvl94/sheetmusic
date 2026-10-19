import React, { useRef } from 'react'
import { PAGE, SPACE, STAFF_H, STEM_LEN, dnToY, yToDn } from '../music/layout.js'
import { CLEFS, ACCIDENTAL_GLYPHS, keySignatureSteps, nameOf } from '../music/model.js'

const HEAD_W = SPACE * 1.18
const STEM_T = SPACE * 0.13
const LINE_T = SPACE * 0.1
const FONT = SPACE * 4

const NOTEHEADS = { whole: '', half: '', quarter: '', eighth: '', sixteenth: '' }
const RESTS = { whole: '', half: '', quarter: '', eighth: '', sixteenth: '' }
const FLAGS = { eighth: ['', ''], sixteenth: ['', ''] }

// Standard key-signature positions, written as diatonic numbers for treble clef.
const SHARP_DN = [38, 35, 39, 36, 33, 37, 34]
const FLAT_DN = [34, 37, 33, 36, 32, 35, 31]
const clefShift = (clef) => (clef === 'bass' ? -14 : 0)

function Glyph({ x, y, children, className, anchor = 'start', size = FONT, opacity }) {
  return (
    <text x={x} y={y} className={className} fontFamily="Bravura" fontSize={size} textAnchor={anchor} opacity={opacity}>
      {children}
    </text>
  )
}

function LedgerLines({ dn, x, staffY, clef, className }) {
  const topDn = CLEFS[clef].topDn
  const bottomDn = topDn - 8
  const lines = []
  for (let d = topDn + 2; d <= dn; d += 2) lines.push(d)
  for (let d = bottomDn - 2; d >= dn; d -= 2) lines.push(d)
  return lines.map((d) => (
    <line
      key={d}
      className={className}
      x1={x - SPACE * 0.42}
      x2={x + HEAD_W + SPACE * 0.42}
      y1={dnToY(d, staffY, clef)}
      y2={dnToY(d, staffY, clef)}
      strokeWidth={LINE_T * 1.4}
    />
  ))
}

function NoteMark({ p, state, onPointerDown }) {
  const { note, x, y, staffY, clef } = p
  const topDn = CLEFS[clef].topDn
  const onLine = (topDn - note.dn) % 2 === 0
  const cls = `note ${state}`

  if (note.rest) {
    const restY = note.dur === 'whole' ? staffY + SPACE : staffY + SPACE * 2
    return (
      <g className={cls} onPointerDown={onPointerDown}>
        <rect className="hit" x={x - SPACE} y={staffY - SPACE} width={SPACE * 3} height={STAFF_H + SPACE * 2} />
        <Glyph x={x} y={restY} className="ink">{RESTS[note.dur]}</Glyph>
        {note.dots ? <circle className="ink-fill" cx={x + SPACE * 1.6} cy={staffY + SPACE * 1.5} r={SPACE * 0.18} /> : null}
      </g>
    )
  }

  const up = note.dn < topDn - 4
  const stemX = up ? x + HEAD_W - STEM_T / 2 : x + STEM_T / 2
  const stemEnd = up ? y - STEM_LEN : y + STEM_LEN
  const showStem = note.dur !== 'whole' && !p.beamed
  const flag = !p.beamed && FLAGS[note.dur]

  return (
    <g className={cls} onPointerDown={onPointerDown}>
      <rect className="hit" x={x - SPACE} y={y - SPACE * 1.6} width={HEAD_W + SPACE * 2} height={SPACE * 3.2} />
      <LedgerLines dn={note.dn} x={x} staffY={staffY} clef={clef} className="ink-stroke" />
      {note.acc !== 'auto' ? (
        <Glyph x={x - SPACE * 0.5} y={y} anchor="end" className="ink">{ACCIDENTAL_GLYPHS[note.acc]}</Glyph>
      ) : null}
      <Glyph x={x} y={y} className="ink">{NOTEHEADS[note.dur]}</Glyph>
      {showStem ? <line className="ink-stroke" x1={stemX} x2={stemX} y1={y} y2={stemEnd} strokeWidth={STEM_T} /> : null}
      {flag ? <Glyph x={stemX + (up ? -STEM_T / 2 : STEM_T / 2)} y={stemEnd} className="ink">{up ? flag[0] : flag[1]}</Glyph> : null}
      {note.dots ? (
        <circle className="ink-fill" cx={x + HEAD_W + SPACE * 0.55} cy={onLine ? y - SPACE * 0.5 : y} r={SPACE * 0.18} />
      ) : null}
    </g>
  )
}

function Beam({ group, clef }) {
  if (group.length < 2) return null
  const topDn = CLEFS[clef].topDn
  const avg = group.reduce((s, p) => s + p.note.dn, 0) / group.length
  const up = avg < topDn - 4
  const beamY = up
    ? Math.min(...group.map((p) => p.y)) - STEM_LEN
    : Math.max(...group.map((p) => p.y)) + STEM_LEN
  const stemX = (p) => (up ? p.x + HEAD_W - STEM_T / 2 : p.x + STEM_T / 2)
  const thick = SPACE * 0.5
  const second = up ? thick + SPACE * 0.28 : -(thick + SPACE * 0.28)

  const secondaries = []
  let run = []
  const flushRun = () => {
    if (run.length > 1) secondaries.push([stemX(run[0]), stemX(run[run.length - 1])])
    else if (run.length === 1) {
      const p = run[0]
      const idx = group.indexOf(p)
      const dir = idx === group.length - 1 ? -1 : 1
      secondaries.push([stemX(p), stemX(p) + dir * SPACE * 0.9])
    }
    run = []
  }
  group.forEach((p) => {
    if (p.note.dur === 'sixteenth') run.push(p)
    else flushRun()
  })
  flushRun()

  return (
    <g className="beam">
      {group.map((p) => (
        <line key={p.id} className="ink-stroke" x1={stemX(p)} x2={stemX(p)} y1={p.y} y2={beamY} strokeWidth={STEM_T} />
      ))}
      <rect className="ink-fill" x={stemX(group[0])} y={up ? beamY : beamY - thick} width={stemX(group[group.length - 1]) - stemX(group[0]) + STEM_T} height={thick} />
      {secondaries.map(([a, b], i) => (
        <rect key={i} className="ink-fill" x={Math.min(a, b)} y={(up ? beamY : beamY - thick) + second} width={Math.abs(b - a) + STEM_T} height={thick} />
      ))}
    </g>
  )
}

function RepeatSign({ x, y, dir }) {
  const thick = SPACE * 0.44
  const thickX = dir > 0 ? x : x - thick
  const thinX = dir > 0 ? x + thick + SPACE * 0.42 : x - thick - SPACE * 0.42
  const dotX = dir > 0 ? x + thick + SPACE * 1.1 : x - thick - SPACE * 1.1
  return (
    <g className="repeat-sign">
      <rect className="ink-fill" x={thickX} y={y} width={thick} height={STAFF_H} />
      <line className="ink-stroke" x1={thinX} x2={thinX} y1={y} y2={y + STAFF_H} strokeWidth={LINE_T * 1.2} />
      <circle className="ink-fill" cx={dotX} cy={y + SPACE * 1.5} r={SPACE * 0.23} />
      <circle className="ink-fill" cx={dotX} cy={y + SPACE * 2.5} r={SPACE * 0.23} />
    </g>
  )
}

function Stave({ stave, score, selectedId, playingIds, showNames, onBarline, onNotePointerDown }) {
  const { y, x, w, clef, measures, showTime } = stave
  const lines = [0, 1, 2, 3, 4].map((i) => y + i * SPACE)
  const topDn = CLEFS[clef].topDn
  const shift = clefShift(clef)
  const keySteps = keySignatureSteps(score.fifths)
  const keyPositions = (score.fifths >= 0 ? SHARP_DN : FLAT_DN).slice(0, Math.abs(score.fifths)).map((dn) => dn + shift)
  const keyGlyph = score.fifths >= 0 ? ACCIDENTAL_GLYPHS.sharp : ACCIDENTAL_GLYPHS.flat
  const beamed = new Set(stave.beams.flat())
  const byId = new Map(measures.flatMap((m) => m.notes).map((p) => [p.id, p]))
  const starts = new Set(score.repeats?.starts || [])
  const ends = new Set(score.repeats?.ends || [])

  let cursor = x + 2.2
  const clefX = cursor
  cursor += 7.6
  const keyX = cursor
  cursor += keyPositions.length * 1.55 + (keyPositions.length ? 1.4 : 0.6)
  const timeX = cursor + 2.4

  return (
    <g>
      {lines.map((ly) => (
        <line key={ly} className="ink-stroke" x1={x} x2={x + w} y1={ly} y2={ly} strokeWidth={LINE_T} />
      ))}
      <Glyph x={clefX} y={dnToY(CLEFS[clef].anchorDn, y, clef)} className="ink">{CLEFS[clef].glyph}</Glyph>
      {keyPositions.map((dn, i) => (
        <Glyph key={i} x={keyX + i * 1.55} y={dnToY(dn, y, clef)} className="ink">{keyGlyph}</Glyph>
      ))}
      {showTime ? (
        <>
          <Glyph x={timeX} y={y + SPACE} className="ink" anchor="middle">{String.fromCharCode(0xe080 + score.time.beats)}</Glyph>
          <Glyph x={timeX} y={y + SPACE * 3} className="ink" anchor="middle">{String.fromCharCode(0xe080 + score.time.value)}</Glyph>
        </>
      ) : null}

      {measures.map((m, i) => {
        const repeatEnd = ends.has(m.index + 1)
        const repeatStart = starts.has(m.index)
        return (
          <g key={m.index}>
            {repeatStart ? <RepeatSign x={m.x} y={y} dir={1} /> : null}
            {repeatEnd ? (
              <RepeatSign x={m.x + m.w} y={y} dir={-1} />
            ) : (
              <line
                className="ink-stroke"
                x1={m.x + m.w}
                x2={m.x + m.w}
                y1={y}
                y2={y + STAFF_H}
                strokeWidth={i === measures.length - 1 ? LINE_T * 1.6 : LINE_T * 1.2}
              />
            )}
            <rect
              className="barline-hit"
              x={m.x + m.w - 1.6}
              y={y - 1}
              width={3.2}
              height={STAFF_H + 2}
              onPointerDown={(e) => { e.stopPropagation(); onBarline(m.index + 1) }}
            >
              <title>Click to repeat this section</title>
            </rect>
            {m.index === 0 ? (
              <rect
                className="barline-hit"
                x={m.x - 1.6}
                y={y - 1}
                width={3.2}
                height={STAFF_H + 2}
                onPointerDown={(e) => { e.stopPropagation(); onBarline(0) }}
              >
                <title>Click to start a repeated section here</title>
              </rect>
            ) : null}
          </g>
        )
      })}

      {stave.beams.map((ids, i) => (
        <Beam key={i} group={ids.map((id) => byId.get(id)).filter(Boolean)} clef={clef} />
      ))}

      {showNames
        ? measures.flatMap((m) => m.notes).filter((p) => !p.note.rest).map((p) => (
            <text key={`${p.id}-name`} className="note-name" x={p.x + HEAD_W / 2} y={y + STAFF_H + 4.4} textAnchor="middle">
              {nameOf(p.note.dn)[0]}
            </text>
          ))
        : null}

      {measures.flatMap((m) => m.notes).map((p) => (
        <NoteMark
          key={p.id}
          p={{ ...p, beamed: beamed.has(p.id) }}
          state={`${selectedId === p.id ? 'selected' : ''} ${playingIds.has(p.id) ? 'playing' : ''}`}
          onPointerDown={(e) => onNotePointerDown(e, p)}
        />
      ))}
    </g>
  )
}

export default function Sheet({ score, layout, zoom, selectedId, playingIds, ghost, showNames, onBarline, onPointer, onNotePointerDown, pageRefs }) {
  const refs = useRef([])
  return (
    <div className="sheet">
      {layout.pages.map((page) => (
        <svg
          key={page.index}
          className="page"
          viewBox={`0 0 ${PAGE.w} ${PAGE.h}`}
          style={{ width: `${PAGE.w * zoom}mm`, height: `${PAGE.h * zoom}mm` }}
          ref={(el) => {
            refs.current[page.index] = el
            if (pageRefs) pageRefs.current[page.index] = el
          }}
          onPointerMove={(e) => onPointer('move', e, page, refs.current[page.index])}
          onPointerDown={(e) => onPointer('down', e, page, refs.current[page.index])}
          onPointerUp={(e) => onPointer('up', e, page, refs.current[page.index])}
          onPointerLeave={(e) => onPointer('leave', e, page, refs.current[page.index])}
        >
          <rect x="0" y="0" width={PAGE.w} height={PAGE.h} fill="#fff" />
          {page.showTitle ? (
            <>
              <text className="score-title" x={PAGE.w / 2} y={page.titleY} textAnchor="middle">{score.title}</text>
              {score.composer ? (
                <text className="score-composer" x={PAGE.w - PAGE.marginX} y={page.titleY + 7} textAnchor="end">{score.composer}</text>
              ) : null}
            </>
          ) : null}

          {page.systems.map((sys) => (
            <g key={sys.index}>
              {score.parts.length > 1 ? (
                <path
                  className="ink-stroke"
                  d={`M${PAGE.marginX - 1.6} ${sys.y} L${PAGE.marginX - 2.6} ${sys.y} L${PAGE.marginX - 2.6} ${sys.y + sys.height} L${PAGE.marginX - 1.6} ${sys.y + sys.height}`}
                  fill="none"
                  strokeWidth={LINE_T * 2.4}
                />
              ) : null}
              <line className="ink-stroke" x1={PAGE.marginX} x2={PAGE.marginX} y1={sys.y} y2={sys.y + sys.height} strokeWidth={LINE_T * 1.2} />
              {sys.staves.map((stave) => (
                <g key={stave.partId}>
                  {sys.index === 0 && score.parts.length > 1 ? (
                    <text className="part-name" x={PAGE.marginX} y={stave.y - 1.6}>{stave.name}</text>
                  ) : null}
                  <Stave
                    stave={stave}
                    score={score}
                    selectedId={selectedId}
                    playingIds={playingIds}
                    showNames={showNames}
                    onBarline={onBarline}
                    onNotePointerDown={onNotePointerDown}
                  />
                </g>
              ))}
            </g>
          ))}

          {ghost && ghost.page === page.index ? (
            <g className="ghost" pointerEvents="none">
              <LedgerLines dn={ghost.dn} x={ghost.x} staffY={ghost.staffY} clef={ghost.clef} className="ghost-stroke" />
              <Glyph x={ghost.x} y={ghost.y} className="ghost-ink">{ghost.rest ? RESTS[ghost.dur] : NOTEHEADS[ghost.dur]}</Glyph>
              <text className="ghost-label" x={ghost.x + 3} y={ghost.staffY - 3}>{ghost.label}</text>
            </g>
          ) : null}

          <text className="page-number" x={PAGE.w / 2} y={PAGE.h - 8} textAnchor="middle">{page.index + 1}</text>
        </svg>
      ))}
    </div>
  )
}
