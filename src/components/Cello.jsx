import React from 'react'
import { toDn, nameOf, dnFromMidi, midiOfDn, STEP_SEMITONES, stepIndexOf, octaveOf } from '../music/model.js'

// Open strings, low to high: C2 G2 D3 A3.
const STRINGS = [
  { label: 'A', midi: 57 },
  { label: 'D', midi: 50 },
  { label: 'G', midi: 43 },
  { label: 'C', midi: 36 },
]
const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7]

/** First position on a cello: open string plus seven semitones up the fingerboard. */
export default function Cello({ fifths, onPick }) {
  return (
    <div className="fingerboard">
      {STRINGS.map((str) => (
        <div className="string-row" key={str.label}>
          <span className="string-name">{str.label}</span>
          <div className="string-line">
            {POSITIONS.map((semi) => {
              const midi = str.midi + semi
              const spelled = dnFromMidi(midi, fifths)
              return (
                <button
                  key={semi}
                  type="button"
                  className={`fret ${semi === 0 ? 'open' : ''}`}
                  onPointerDown={() => onPick(spelled.dn, spelled.acc)}
                  title={semi === 0 ? 'Open string' : `Finger ${semi}`}
                >
                  {nameOf(spelled.dn)[0]}
                  {spelled.acc === 'sharp' ? '♯' : spelled.acc === 'flat' ? '♭' : ''}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
