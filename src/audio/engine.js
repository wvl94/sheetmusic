// Small Web Audio synth: enough colour to hear whether a line works.

import { freqOf, midiOf, measureCapacity, repeatPlan, splitIntoMeasures } from '../music/model.js'

let ctx = null
let master = null

function ensure() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.9
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const VOICES = {
  piano: { waves: [['triangle', 1, 0.6], ['sine', 2, 0.18], ['sine', 3.01, 0.07]], attack: 0.004, decay: 2.6, sustain: 0.0, cutoff: 4200, vibrato: 0 },
  cello: { waves: [['sawtooth', 1, 0.42], ['sine', 2, 0.12]], attack: 0.07, decay: 0.35, sustain: 0.75, cutoff: 1900, vibrato: 5 },
  strings: { waves: [['sawtooth', 1, 0.3], ['sawtooth', 1.005, 0.22]], attack: 0.12, decay: 0.3, sustain: 0.8, cutoff: 2400, vibrato: 4.5 },
  winds: { waves: [['square', 1, 0.22], ['sine', 2, 0.16]], attack: 0.05, decay: 0.25, sustain: 0.7, cutoff: 2800, vibrato: 4 },
}

export function playTone(midi, duration = 0.6, sound = 'piano', when = 0, velocity = 1) {
  const audio = ensure()
  const voice = VOICES[sound] || VOICES.piano
  const t0 = (when || audio.currentTime) + 0.001
  const freq = freqOf(midi)
  const amp = audio.createGain()
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(Math.min(voice.cutoff, freq * 14), t0)
  filter.Q.value = 0.6
  amp.connect(filter).connect(master)

  const peak = 0.26 * velocity
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(peak, t0 + voice.attack)
  if (voice.sustain > 0) {
    amp.gain.exponentialRampToValueAtTime(Math.max(peak * voice.sustain, 0.0002), t0 + voice.attack + voice.decay)
    amp.gain.setValueAtTime(Math.max(peak * voice.sustain, 0.0002), t0 + Math.max(duration, 0.12))
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(duration, 0.12) + 0.14)
  } else {
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(voice.decay, duration + 0.9))
  }

  const stopAt = t0 + Math.max(duration, 0.12) + 0.35
  const nodes = []
  voice.waves.forEach(([type, ratio, gain]) => {
    const osc = audio.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq * ratio, t0)
    const g = audio.createGain()
    g.gain.value = gain
    osc.connect(g).connect(amp)
    osc.start(t0)
    osc.stop(stopAt)
    nodes.push(osc)
  })
  if (voice.vibrato) {
    const lfo = audio.createOscillator()
    lfo.frequency.value = voice.vibrato
    const depth = audio.createGain()
    depth.gain.value = freq * 0.006
    lfo.connect(depth)
    nodes.forEach((osc) => depth.connect(osc.frequency))
    lfo.start(t0 + 0.08)
    lfo.stop(stopAt)
  }
  return stopAt
}

let playing = null

export function isPlaying() {
  return !!playing
}

/** Schedules the whole score, following repeat marks. onProgress reports the
 *  position in the played timeline, in quarter notes. */
export function playScore(score, { onProgress, onEnd, fromBeat = 0 } = {}) {
  stopPlayback()
  const audio = ensure()
  const spb = 60 / Math.max(20, score.tempo) // seconds per quarter note
  const cap = measureCapacity(score.time)
  const perPart = score.parts.map((part) => splitIntoMeasures(part.notes, cap))
  const measureCount = Math.max(1, ...perPart.map((bars) => bars.length))
  const plan = repeatPlan(score.repeats, measureCount)
  const start = audio.currentTime + 0.15
  let lastBeat = fromBeat

  plan.forEach((measureIndex, slot) => {
    score.parts.forEach((part, partIndex) => {
      const bar = perPart[partIndex][measureIndex]
      if (!bar) return
      bar.notes.forEach(({ note, startBeat, beats }) => {
        const at = slot * cap + startBeat
        if (at < fromBeat - 1e-9) return
        lastBeat = Math.max(lastBeat, at + beats)
        if (note.rest) return
        playTone(midiOf(note, score.fifths), beats * spb * 0.95, part.sound, start + (at - fromBeat) * spb)
      })
    })
  })

  const totalSeconds = (lastBeat - fromBeat) * spb
  const tick = () => {
    if (!playing) return
    const elapsed = audio.currentTime - start
    const beat = fromBeat + elapsed / spb
    if (onProgress) onProgress(beat)
    if (elapsed > totalSeconds + 0.4) {
      stopPlayback()
      if (onEnd) onEnd()
      return
    }
    playing.raf = requestAnimationFrame(tick)
  }
  playing = { raf: 0 }
  playing.raf = requestAnimationFrame(tick)
  return true
}

export function stopPlayback() {
  if (playing) {
    cancelAnimationFrame(playing.raf)
    playing = null
  }
  if (ctx && master) {
    // quick fade of anything still ringing
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0.0001, now + 0.08)
    setTimeout(() => {
      if (master) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setValueAtTime(0.9, ctx.currentTime)
      }
    }, 120)
  }
}

export function unlockAudio() {
  ensure()
}
