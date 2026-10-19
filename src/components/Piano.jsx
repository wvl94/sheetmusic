import React from 'react'
import { STEPS, STEP_SEMITONES, toDn, nameOf, midiOfDn } from '../music/model.js'

const WHITE_W = 34
const BLACK_W = 20
const HEIGHT = 108
const BLACK_AFTER = [0, 1, 3, 4, 5] // step indexes that have a black key to their right

/** Click a key: you hear it and it lands on the staff. */
export default function Piano({ fromOctave = 3, octaves = 3, fifths, onPick, highlight = [] }) {
  const whites = []
  for (let o = 0; o < octaves; o += 1) {
    for (let s = 0; s < 7; s += 1) whites.push({ dn: toDn(STEPS[s], fromOctave + o), step: s, octave: fromOctave + o })
  }
  const width = whites.length * WHITE_W
  const lit = new Set(highlight)

  return (
    <svg className="piano" viewBox={`0 0 ${width} ${HEIGHT}`} style={{ width: '100%', maxWidth: width }}>
      {whites.map((k, i) => (
        <g key={k.dn} onPointerDown={() => onPick(k.dn, 'auto')}>
          <rect
            className={`key white ${lit.has(k.dn) ? 'lit' : ''}`}
            x={i * WHITE_W}
            y={0}
            width={WHITE_W - 1.5}
            height={HEIGHT}
            rx={4}
          />
          <text className="key-label" x={i * WHITE_W + (WHITE_W - 1.5) / 2} y={HEIGHT - 9} textAnchor="middle">
            {STEPS[k.step]}
            {k.step === 0 ? <tspan className="key-octave">{k.octave}</tspan> : null}
          </text>
        </g>
      ))}
      {whites.map((k, i) =>
        BLACK_AFTER.includes(k.step) && i < whites.length - 1 ? (
          <g key={`b${k.dn}`} onPointerDown={() => onPick(k.dn, 'sharp')}>
            <rect
              className="key black"
              x={i * WHITE_W + WHITE_W - BLACK_W / 2 - 1}
              y={0}
              width={BLACK_W}
              height={HEIGHT * 0.62}
              rx={3}
            />
          </g>
        ) : null,
      )}
    </svg>
  )
}

export function pianoHighlight(score, selection) {
  return []
}
