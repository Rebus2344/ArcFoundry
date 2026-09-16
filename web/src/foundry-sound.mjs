let audio;
let voices = [];
export function soundEnabled() {
  try {
    return localStorage.getItem('arcfoundry:discovery-sound') !== 'off';
  } catch {
    return true;
  }
}
export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem('arcfoundry:discovery-sound', enabled ? 'on' : 'off');
  } catch {}
  if (!enabled) stopDiscoverySound();
}
export function prepareDiscoverySound() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ??= new Audio();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  } catch {}
}
export function stopDiscoverySound() {
  for (const node of voices) {
    try {
      node.stop();
    } catch {}
  }
  voices = [];
}
export function playDiscoverySound() {
  if (!soundEnabled() || audio?.state !== 'running') return;
  stopDiscoverySound();
  const start = audio.currentTime;
  for (const [offset, frequency, duration] of [[0, 130.81, 1.8], [0, 261.63, .35], [.22, 329.63, .35], [.44, 392, .35], [.68, 523.25, 1.15], [.68, 659.25, 1.15], [.68, 783.99, 1.15]]) {
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start + offset);
    gain.gain.linearRampToValueAtTime(.045, start + offset + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, start + offset + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration);
    voices.push(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices = voices.filter(v => v !== oscillator);
    };
  }
}
