const degrees = [{ number: 1, name: 'Do', zh: '哆' }, { number: 2, name: 'Re', zh: '来' }, { number: 3, name: 'Mi', zh: '咪' }, { number: 4, name: 'Fa', zh: '发' }, { number: 5, name: 'Sol', zh: '梭' }, { number: 6, name: 'La', zh: '拉' }, { number: 7, name: 'Si', zh: '西' }];
const keys = [{ name: 'C', midi: 60 }, { name: 'Db', midi: 61 }, { name: 'D', midi: 62 }, { name: 'Eb', midi: 63 }, { name: 'E', midi: 64 }, { name: 'F', midi: 65 }, { name: 'Gb', midi: 66 }, { name: 'G', midi: 67 }, { name: 'Ab', midi: 68 }, { name: 'A', midi: 69 }, { name: 'Bb', midi: 70 }, { name: 'B', midi: 71 }];
const semitones = [0, 2, 4, 5, 7, 9, 11];
let audioContext, playing = false, muted = false, currentIndex = 0, timer, startedAt, elapsedTimer, direction = 'up', mode = 'ordered', selectedKey = 0, instrument = 'piano', randomOrder = [], challengeAnswer = null, challengeTotal = 0, challengeCorrect = 0;
const $ = (id) => document.getElementById(id);
const scaleRow = $('scaleRow');
const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

keys.forEach((key, index) => { const option = document.createElement('option'); option.value = index; option.textContent = `${key.name} 大调`; $('keySelect').appendChild(option); });
degrees.forEach((degree, index) => { const button = document.createElement('button'); button.className = 'scale-key'; button.innerHTML = `<span class="key-number">${degree.number}</span><span class="key-name">${degree.name} · ${degree.zh}</span><span class="key-note"></span>`; button.addEventListener('click', () => playNote(index)); scaleRow.appendChild(button); });
function noteAt(index) { const midi = keys[selectedKey].midi + semitones[index]; const hz = 440 * Math.pow(2, (midi - 69) / 12); return { ...degrees[index], note: `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`, hz }; }
function setupAudio() { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function playTone(index) {
  if (muted) return;
  setupAudio();
  const now = audioContext.currentTime;
  const frequency = noteAt(index).hz;
  if (instrument === 'piano') {
    playPiano(frequency, now);
    return;
  }
  if (instrument === 'harmonica') {
    playHarmonica(frequency, now);
    return;
  }
  const voice = instrument === 'flute' ? 'sine' : instrument === 'guitar' ? 'triangle' : instrument === 'melodica' ? 'square' : 'sine';
  const duration = instrument === 'xylophone' ? .6 : instrument === 'guitar' ? 1.15 : instrument === 'flute' ? 1.05 : instrument === 'melodica' ? .95 : .8;
  const peak = instrument === 'flute' ? .16 : instrument === 'xylophone' ? .22 : instrument === 'melodica' ? .13 : .25;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = voice;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + (instrument === 'guitar' ? .008 : instrument === 'melodica' ? .08 : .025));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + .02);

  if (instrument === 'xylophone' || instrument === 'melodica') {
    const overtone = audioContext.createOscillator();
    const overtoneGain = audioContext.createGain();
    overtone.type = 'sine';
    overtone.frequency.value = frequency * (instrument === 'xylophone' ? 3.01 : 2);
    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(instrument === 'xylophone' ? .09 : .035, now + .01);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * .65);
    overtone.connect(overtoneGain).connect(audioContext.destination);
    overtone.start(now);
    overtone.stop(now + duration * .7);
  }
}
function playPiano(frequency, now) {
  const output = audioContext.createGain();
  const body = audioContext.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.setValueAtTime(Math.min(6500, frequency * 14), now);
  body.Q.value = .7;
  output.gain.setValueAtTime(.0001, now);
  output.gain.exponentialRampToValueAtTime(.24, now + .006);
  output.gain.exponentialRampToValueAtTime(.085, now + .18);
  output.gain.exponentialRampToValueAtTime(.0001, now + 2.05);
  output.connect(body).connect(audioContext.destination);

  // Several short-lived partials make the attack and decay closer to an acoustic piano.
  [[1, .72, 2.05], [2, .2, 1.35], [3, .12, .92], [4.18, .07, .62], [6.2, .035, .38]].forEach(([partial, volume, decay]) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = partial === 1 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency * partial, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, now + decay);
    oscillator.connect(gain).connect(output);
    oscillator.start(now);
    oscillator.stop(now + decay + .03);
  });
}
function playHarmonica(frequency, now) {
  const output = audioContext.createGain();
  output.gain.setValueAtTime(.0001, now);
  output.gain.exponentialRampToValueAtTime(.13, now + .045);
  output.gain.exponentialRampToValueAtTime(.0001, now + 1.05);
  output.connect(audioContext.destination);
  [[1, 'square', .72], [2, 'triangle', .14], [3, 'sine', .09], [4, 'sine', .045]].forEach(([partial, type, volume]) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const vibrato = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * partial;
    vibrato.frequency.value = 5.2;
    vibratoGain.gain.value = frequency * .012;
    vibrato.connect(vibratoGain).connect(oscillator.detune);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 1.0);
    oscillator.connect(gain).connect(output);
    vibrato.start(now);
    oscillator.start(now);
    vibrato.stop(now + 1.08);
    oscillator.stop(now + 1.08);
  });
}
function render(index) { const note = noteAt(index); $('noteNumber').textContent = note.number; $('noteName').textContent = `${note.name} · ${note.zh}`; $('noteHz').textContent = `${note.note} · ${Math.round(note.hz)} Hz`; $('sequenceIndex').textContent = String(index + 1).padStart(2, '0'); document.querySelectorAll('.scale-key').forEach((key, i) => { key.classList.toggle('active', i === index); key.querySelector('.key-note').textContent = noteAt(i).note; }); $('keySummary').textContent = `${keys[selectedKey].name} 大调`; $('progressFill').style.width = `${((index + 1) / 7) * 100}%`; $('progressText').textContent = playing ? `正在聆听 · ${keys[selectedKey].name} 大调` : '准备开始'; }
function playNote(index) { render(index); playTone(index); if (!playing) showToast(`${noteAt(index).name} · ${noteAt(index).note}`); }
function sequence() { if (mode === 'random') { if (!randomOrder.length || currentIndex >= randomOrder.length - 1) randomOrder = [...Array(7).keys()].sort(() => Math.random() - .5); return randomOrder; } if (direction === 'up') return [0,1,2,3,4,5,6]; if (direction === 'down') return [6,5,4,3,2,1,0]; return [0,1,2,3,4,5,6,5,4,3,2,1]; }
function next() { const order = sequence(); currentIndex = (currentIndex + 1) % order.length; playNote(order[currentIndex]); timer = setTimeout(next, Number($('tempoSlider').value)); }
function togglePlay() { if (playing) { playing = false; clearTimeout(timer); clearInterval(elapsedTimer); $('playText').textContent = '继续练习'; $('playButton').querySelector('.play-icon').textContent = '▶'; render(sequence()[currentIndex]); return; } setupAudio(); playing = true; startedAt = Date.now(); currentIndex = -1; $('playText').textContent = '暂停练习'; $('playButton').querySelector('.play-icon').textContent = 'Ⅱ'; elapsedTimer = setInterval(() => { const sec = Math.floor((Date.now() - startedAt) / 1000); $('elapsedText').textContent = `00:${String(sec % 60).padStart(2, '0')}`; }, 500); next(); }
function reset() { playing = false; clearTimeout(timer); clearInterval(elapsedTimer); currentIndex = 0; randomOrder = []; $('elapsedText').textContent = '00:00'; $('playText').textContent = '开始练习'; $('playButton').querySelector('.play-icon').textContent = '▶'; render(0); }
function showToast(text) { const toast = $('toast'); toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1300); }
$('playButton').addEventListener('click', togglePlay); $('restartButton').addEventListener('click', reset); $('muteButton').addEventListener('click', () => { muted = !muted; $('muteButton').textContent = muted ? '◌' : '◖'; showToast(muted ? '已静音' : '声音已开启'); });
$('tempoSlider').addEventListener('input', (event) => { const value = Number(event.target.value); $('tempoValue').textContent = value < 800 ? '快速' : value > 1300 ? '慢速' : '中速'; });
document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => { direction = button.dataset.direction; document.querySelectorAll('[data-direction]').forEach((item) => item.classList.toggle('active', item === button)); reset(); }));
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode; document.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button)); $('modeTitle').textContent = mode === 'random' ? '随机听辨' : '跟唱音阶'; reset(); }));
$('keySelect').addEventListener('change', (event) => { selectedKey = Number(event.target.value); reset(); });
$('instrumentSelect').addEventListener('change', (event) => { instrument = event.target.value; playTone(0); showToast(`${event.target.options[event.target.selectedIndex].text} 音色`); });
document.addEventListener('keydown', (event) => { const index = Number(event.key) - 1; if (index >= 0 && index < 7) playNote(index); });
function createChallengeAnswers() { $('answerGrid').innerHTML = ''; degrees.forEach((degree, index) => { const button = document.createElement('button'); button.className = 'answer-button'; button.textContent = `${degree.number} · ${degree.name}`; button.disabled = true; button.addEventListener('click', () => answerChallenge(index)); $('answerGrid').appendChild(button); }); }
function startChallenge() { setupAudio(); if (challengeAnswer === null) { challengeAnswer = Math.floor(Math.random() * 7); $('challengeFeedback').textContent = '请听音，然后选择答案'; $('challengeButton').textContent = '重新播放挑战音  →'; document.querySelectorAll('.answer-button').forEach((button) => { button.disabled = false; button.classList.remove('correct', 'wrong'); }); } playTone(challengeAnswer); }
function answerChallenge(index) { if (challengeAnswer === null) return; challengeTotal += 1; const correct = index === challengeAnswer; if (correct) { challengeCorrect += 1; showToast('回答正确，继续保持！'); } else { showToast(`答案是 ${noteAt(challengeAnswer).number} · ${noteAt(challengeAnswer).name}`); } document.querySelectorAll('.answer-button').forEach((button, buttonIndex) => { button.disabled = true; if (buttonIndex === challengeAnswer) button.classList.add('correct'); if (buttonIndex === index && !correct) button.classList.add('wrong'); }); $('challengeFeedback').textContent = correct ? '正确！准备下一题。' : `再听一遍，答案是 ${noteAt(challengeAnswer).name}`; $('scoreText').textContent = `${Math.round((challengeCorrect / challengeTotal) * 100)}%`; challengeAnswer = null; }
$('challengeButton').addEventListener('click', startChallenge);
createChallengeAnswers();
render(0);
