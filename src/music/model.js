// Core music model: pitches, durations, keys, and the score document shape.

export const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
export const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

/** Diatonic number: a pitch without accidentals. C4 -> 28. */
export const toDn = (step, octave) => octave * 7 + STEPS.indexOf(step)
export const stepIndexOf = (dn) => ((dn % 7) + 7) % 7
export const octaveOf = (dn) => Math.floor(dn / 7)
export const nameOf = (dn) => STEPS[stepIndexOf(dn)] + octaveOf(dn)

export const DURATION_BEATS = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25 }
export const DURATIONS = [
  { id: 'whole', label: 'Whole', glyph: '', key: '1' },
  { id: 'half', label: 'Half', glyph: '', key: '2' },
  { id: 'quarter', label: 'Quarter', glyph: '', key: '3' },
  { id: 'eighth', label: 'Eighth', glyph: '', key: '4' },
  { id: 'sixteenth', label: 'Sixteenth', glyph: '', key: '5' },
]
export const beatsOf = (note) => DURATION_BEATS[note.dur] * (note.dots ? 1.5 : 1)

const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6] // F C G D A E B
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3] // B E A D G C F

export const KEYS = [
  { fifths: -6, name: 'G♭ / e♭m' },
  { fifths: -5, name: 'D♭ / b♭m' },
  { fifths: -4, name: 'A♭ / fm' },
  { fifths: -3, name: 'E♭ / cm' },
  { fifths: -2, name: 'B♭ / gm' },
  { fifths: -1, name: 'F / dm' },
  { fifths: 0, name: 'C / am' },
  { fifths: 1, name: 'G / em' },
  { fifths: 2, name: 'D / bm' },
  { fifths: 3, name: 'A / f♯m' },
  { fifths: 4, name: 'E / c♯m' },
  { fifths: 5, name: 'B / g♯m' },
  { fifths: 6, name: 'F♯ / d♯m' },
]

/** Step indexes altered by the key signature, in notation order. */
export function keySignatureSteps(fifths) {
  return fifths >= 0 ? SHARP_ORDER.slice(0, fifths) : FLAT_ORDER.slice(0, -fifths)
}

export function keyAlter(fifths, stepIndex) {
  if (fifths === 0) return 0
  const inKey = keySignatureSteps(fifths).includes(stepIndex)
  if (!inKey) return 0
  return fifths > 0 ? 1 : -1
}

export const ACCIDENTALS = [
  { id: 'auto', label: 'Key', glyph: '' },
  { id: 'sharp', label: 'Sharp', glyph: '' },
  { id: 'flat', label: 'Flat', glyph: '' },
  { id: 'natural', label: 'Natural', glyph: '' },
]
export const ACCIDENTAL_GLYPHS = { sharp: '', flat: '', natural: '' }

export function alterOf(note, fifths) {
  if (note.acc === 'sharp') return 1
  if (note.acc === 'flat') return -1
  if (note.acc === 'natural') return 0
  return keyAlter(fifths, stepIndexOf(note.dn))
}

export function midiOf(note, fifths) {
  return STEP_SEMITONES[stepIndexOf(note.dn)] + alterOf(note, fifths) + 12 * (octaveOf(note.dn) + 1)
}

export function midiOfDn(dn, fifths, acc = 'auto') {
  return midiOf({ dn, acc }, fifths)
}

export const freqOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

/** Nearest diatonic pitch + accidental for a MIDI note, spelled for the key. */
export function dnFromMidi(midi, fifths) {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const natural = STEP_SEMITONES.indexOf(pc)
  if (natural >= 0) {
    const dn = octave * 7 + natural
    return { dn, acc: keyAlter(fifths, natural) === 0 ? 'auto' : 'natural' }
  }
  if (fifths < 0) {
    const above = STEP_SEMITONES.indexOf(pc + 1)
    const dn = octave * 7 + above
    return { dn, acc: keyAlter(fifths, above) === -1 ? 'auto' : 'flat' }
  }
  const below = STEP_SEMITONES.indexOf(pc - 1)
  const dn = octave * 7 + below
  return { dn, acc: keyAlter(fifths, below) === 1 ? 'auto' : 'sharp' }
}

export const CLEFS = {
  treble: { id: 'treble', label: 'Treble (sol)', glyph: '', topDn: toDn('F', 5), anchorDn: toDn('G', 4), glyphDy: 0 },
  bass: { id: 'bass', label: 'Bass (fa)', glyph: '', topDn: toDn('A', 3), anchorDn: toDn('F', 3), glyphDy: 0 },
}

export const SOUNDS = {
  piano: { id: 'piano', label: 'Piano', low: toDn('A', 0), high: toDn('C', 8) },
  cello: { id: 'cello', label: 'Cello', low: toDn('C', 2), high: toDn('A', 5) },
  strings: { id: 'strings', label: 'Strings', low: toDn('C', 2), high: toDn('C', 7) },
  winds: { id: 'winds', label: 'Winds', low: toDn('C', 3), high: toDn('C', 7) },
}

export const TIME_SIGNATURES = [
  { beats: 4, value: 4 },
  { beats: 3, value: 4 },
  { beats: 2, value: 4 },
  { beats: 6, value: 8 },
  { beats: 3, value: 8 },
  { beats: 5, value: 4 },
]

/** Length of one bar, measured in quarter notes. */
export const measureCapacity = (time) => (time.beats * 4) / time.value
/** Length of one beam group, measured in quarter notes. */
export const beamUnit = (time) => (time.value === 8 && time.beats % 3 === 0 ? 1.5 : 4 / time.value)

/** Split a part's notes into bars of `cap` quarter notes. */
export function splitIntoMeasures(notes, cap) {
  const measures = [{ notes: [] }]
  let used = 0
  notes.forEach((note, index) => {
    const beats = beatsOf(note)
    if (used > 1e-9 && used + beats > cap + 1e-9) {
      measures.push({ notes: [] })
      used = 0
    }
    measures[measures.length - 1].notes.push({ note, index, startBeat: used, beats })
    used += beats
    if (used >= cap - 1e-9) {
      measures.push({ notes: [] })
      used = 0
    }
  })
  if (measures.length > 1 && measures[measures.length - 1].notes.length === 0) measures.pop()
  return measures
}

/** Repeat marks live on barlines: barline b sits before bar b. */
export const emptyRepeats = () => ({ starts: [], ends: [] })

/** The order the bars are actually played in, once repeats are followed. */
export function repeatPlan(repeats, measureCount) {
  const starts = new Set(repeats?.starts || [])
  const ends = new Set(repeats?.ends || [])
  const plan = []
  const taken = new Set()
  let lastStart = 0
  let m = 0
  let guard = 0
  while (m < measureCount && guard < 4000) {
    guard += 1
    if (starts.has(m)) lastStart = m
    plan.push(m)
    const barline = m + 1
    if (ends.has(barline) && !taken.has(barline)) {
      taken.add(barline)
      m = lastStart
    } else {
      m += 1
    }
  }
  return plan
}

let idCounter = 0
export const uid = (prefix = 'n') => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`

export function makeNote(dn, dur = 'quarter', opts = {}) {
  return { id: uid(), dn, dur, dots: opts.dots ? 1 : 0, acc: opts.acc || 'auto', rest: !!opts.rest, tie: false }
}

export function makePart(name, clef = 'treble', sound = 'piano') {
  return { id: uid('p'), name, clef, sound, notes: [] }
}

export function newScore() {
  return {
    version: 1,
    title: 'Untitled song',
    composer: '',
    tempo: 96,
    time: { beats: 4, value: 4 },
    fifths: 0,
    repeats: emptyRepeats(),
    parts: [makePart('Piano', 'treble', 'piano'), makePart('Cello', 'bass', 'cello')],
  }
}

/** A short demo so a new file is never a blank stare. */
export function demoScore() {
  const score = newScore()
  const melody = [
    ['G4', 'quarter'], ['G4', 'quarter'], ['A4', 'quarter'], ['G4', 'quarter'],
    ['C5', 'quarter'], ['B4', 'half'], ['B4', 'quarter'],
    ['G4', 'quarter'], ['G4', 'quarter'], ['A4', 'quarter'], ['G4', 'quarter'],
    ['D5', 'quarter'], ['C5', 'half'], ['C5', 'quarter'],
  ]
  const bass = [
    ['C3', 'half'], ['C3', 'half'],
    ['F3', 'half'], ['G3', 'half'],
    ['C3', 'half'], ['C3', 'half'],
    ['G2', 'half'], ['C3', 'half'],
  ]
  const parse = (label) => toDn(label[0], Number(label.slice(1)))
  score.parts[0].notes = melody.map(([p, d]) => makeNote(parse(p), d))
  score.parts[1].notes = bass.map(([p, d]) => makeNote(parse(p), d))
  score.title = 'Band warm-up'
  score.composer = 'Traditional'
  return score
}

export function cloneScore(score) {
  return JSON.parse(JSON.stringify(score))
}
