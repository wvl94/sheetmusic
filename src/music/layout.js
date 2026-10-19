// Page layout engine. Everything is computed in millimetres so the SVG can be
// printed 1:1 on A4 without any scaling maths at print time.

import { CLEFS, beatsOf, measureCapacity, beamUnit } from './model.js'

export const PAGE = { w: 210, h: 297, marginX: 16, marginTop: 16, marginBottom: 16 }
export const SPACE = 1.75 // one staff space
export const STAFF_H = SPACE * 4
export const CONTENT_W = PAGE.w - PAGE.marginX * 2

const STAFF_PITCH = STAFF_H + 10 // distance between staff tops inside one system
const SYSTEM_GAP = 11 // breathing room under a system
const TITLE_BLOCK = 24 // reserved on page 1
const CLEF_W = 7.6
const TIME_W = 5.6
const KEY_ACC_W = 1.55
const NOTE_PAD_L = 3.4
const NOTE_PAD_R = 2.6
export const STEM_LEN = SPACE * 3.4

export const dnToY = (dn, staffY, clef) => staffY + (CLEFS[clef].topDn - dn) * (SPACE / 2)
export const yToDn = (y, staffY, clef) => CLEFS[clef].topDn - Math.round((y - staffY) / (SPACE / 2))

function splitMeasures(notes, cap) {
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

function beamGroups(placed, time) {
  const unit = beamUnit(time)
  const groups = []
  let current = []
  const flush = () => {
    if (current.length > 1) groups.push(current)
    current = []
  }
  placed.forEach((p) => {
    const beamable = !p.note.rest && (p.note.dur === 'eighth' || p.note.dur === 'sixteenth')
    if (!beamable) {
      flush()
      return
    }
    const slot = Math.floor(p.startBeat / unit + 1e-9)
    if (current.length && current[0].slot !== slot) flush()
    current.push({ ...p, slot })
    if (p.startBeat + p.beats >= (slot + 1) * unit - 1e-9) flush()
  })
  flush()
  return groups.map((g) => g.map((p) => p.id))
}

export function layoutScore(score, opts = {}) {
  const measuresPerSystem = opts.measuresPerSystem || 4
  const minMeasures = opts.minMeasures ?? measuresPerSystem * 2
  const cap = measureCapacity(score.time)
  const parts = score.parts
  const perPart = parts.map((part) => splitMeasures(part.notes, cap))
  const filled = Math.max(1, ...perPart.map((m) => m.length))
  const measureCount = Math.ceil(Math.max(filled, minMeasures) / measuresPerSystem) * measuresPerSystem
  const systemCount = measureCount / measuresPerSystem

  const systemHeight = (parts.length - 1) * STAFF_PITCH + STAFF_H + SYSTEM_GAP
  const keyW = Math.abs(score.fifths) * KEY_ACC_W
  const placements = []
  const pages = []

  let sys = 0
  while (sys < systemCount) {
    const pageIndex = pages.length
    const top = PAGE.marginTop + (pageIndex === 0 ? TITLE_BLOCK : 0)
    const avail = PAGE.h - PAGE.marginBottom - top
    const fit = Math.max(1, Math.floor(avail / systemHeight))
    const systems = []
    for (let k = 0; k < fit && sys < systemCount; k += 1, sys += 1) {
      systems.push(buildSystem({ score, perPart, sys, cap, keyW, measuresPerSystem, pageIndex, placements, y: top + k * systemHeight }))
    }
    pages.push({ index: pageIndex, systems, showTitle: pageIndex === 0, titleY: PAGE.marginTop + 9 })
  }

  const totalBeats = measureCount * cap
  return { pages, placements, measureCount, systemHeight, totalBeats, cap }
}

function buildSystem({ score, perPart, sys, cap, keyW, measuresPerSystem, pageIndex, placements, y }) {
  const showTime = sys === 0
  const headerW = 2 + CLEF_W + (keyW ? keyW + 1.4 : 0.6) + (showTime ? TIME_W : 0) + 2.4
  const measureW = (CONTENT_W - headerW) / measuresPerSystem
  const x0 = PAGE.marginX + headerW

  const staves = score.parts.map((part, partIndex) => {
    const staffY = y + partIndex * STAFF_PITCH
    const measures = []
    for (let k = 0; k < measuresPerSystem; k += 1) {
      const measureIndex = sys * measuresPerSystem + k
      const mx = x0 + k * measureW
      const source = perPart[partIndex][measureIndex]
      const notes = (source ? source.notes : []).map((entry) => {
        const place = {
          id: `${part.id}:${entry.index}`,
          partIndex,
          partId: part.id,
          noteIndex: entry.index,
          note: entry.note,
          startBeat: entry.startBeat,
          beats: entry.beats,
          globalBeat: measureIndex * cap + entry.startBeat,
          measureIndex,
          page: pageIndex,
          system: sys,
          clef: part.clef,
          staffY,
          x: mx + NOTE_PAD_L + (entry.startBeat / cap) * (measureW - NOTE_PAD_L - NOTE_PAD_R),
          y: dnToY(entry.note.dn, staffY, part.clef),
        }
        placements.push(place)
        return place
      })
      measures.push({ index: measureIndex, x: mx, w: measureW, notes })
    }
    return {
      partIndex,
      partId: part.id,
      name: part.name,
      clef: part.clef,
      y: staffY,
      x: PAGE.marginX,
      w: CONTENT_W,
      showTime,
      headerW,
      measures,
      beams: measures.flatMap((m) => beamGroups(m.notes, score.time)),
    }
  })

  return { index: sys, y, height: STAFF_H + (score.parts.length - 1) * STAFF_PITCH, staves, x: PAGE.marginX, w: CONTENT_W, showTime }
}

/** Where should a new note land if the user clicks at this x on this part? */
export function insertIndexAt(layout, partIndex, page, system, x) {
  const own = layout.placements.filter((p) => p.partIndex === partIndex)
  const key = (p) => p.page * 1e6 + p.system * 1e3 + p.x
  const clicked = page * 1e6 + system * 1e3 + x
  let i = 0
  while (i < own.length && key(own[i]) < clicked) i += 1
  return i < own.length ? own[i].noteIndex : (own.length ? own[own.length - 1].noteIndex + 1 : 0)
}
