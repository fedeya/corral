import { deskMusicSamples } from './desk-music-score';

self.onmessage = (event: MessageEvent<number>) => {
  const score = deskMusicSamples(event.data);
  let step = score.next();
  while (!step.done) step = score.next();
  self.postMessage(step.value, { transfer: [step.value.buffer] });
};
