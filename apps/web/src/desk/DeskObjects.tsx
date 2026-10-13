import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DESK_OBJECTS, type DeskBrowserPage, type DeskEffect } from './desk-contract';
import type { DeskSound } from './desk-sfx';
import './DeskObjects.css';
import { objectTouchClip } from './desk-object-hit';


type DeskObjectsProps = {
  scale: number;
  mobile?: boolean;

  onOpenPage: (page: DeskBrowserPage) => void;
  onEffect: (effect: DeskEffect) => void;
  disabled?: boolean;
  layout?: 'scene' | 'list';
  onMessage?: (text: string, speaker: string, object: ObjectId) => void;
  onInteract?: (cue:DeskSound) => void;
  soundEnabled?:boolean;
  onDuck?: () => void;
  onArcade?: () => void;
};
type ObjectId = (typeof DESK_OBJECTS)[number]['id'];


const descriptions: Record<ObjectId, string> = {
  lamp: 'A pool of light. A little room for the next idea.',
  coffee: 'One sip of mate. The next bug can wait a breath.',
  duck: 'What had you expected to happen, and where did reality first disagree?',
  rocket: 'Orbit is falling sideways with excellent commitment.',
  plant: 'Roots before branches. A little water, then patience.',
  floppy: 'Source disk mounted in the monitor. No dust required.',
  controller: 'Player one: you. Secret power: taking a break before the boss bug.',
  cassette: 'An original pocket-sized tune. Click the cassette again for silence.',
  books: 'The field guide is open in the monitor. Start with the key that needs you.',
  poster: 'A pale blue speck, a very large sky, and one small desk to think at.',
  physics: 'In a sealed elevator, can you tell gravity from acceleration? Drop a pencil.',
  window: 'The night shift has company.',
  keyboard: 'Now you have a real keyboard.',
};

export function DeskObjects({ mobile=false, scale, onOpenPage, onEffect, disabled = false, layout = 'scene', onMessage, onInteract, soundEnabled=true, onDuck, onArcade }: DeskObjectsProps) {
  const [message, setMessage] = useState('');
  const [playing, setPlaying] = useState(false);
  const [dismissedHint, setDismissedHint] = useState<ObjectId | null>(null);
  const tune = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const messageRef = useRef('');
  function say(text: string, speaker = 'DESK NOTES', object:ObjectId='cassette') {
    messageRef.current = text;
    setMessage(text);
    onMessage?.(text, speaker, object);
  }

  useEffect(() => () => {
    if(tune.current) clearTimeout(tune.current);
    onInteract?.('cassette-stop');
    tune.current = null;
  }, [onInteract]);

  useEffect(() => {
    if (disabled || !soundEnabled) {
      if(tune.current) clearTimeout(tune.current);
      onInteract?.('cassette-stop');
      tune.current = null;
      setPlaying(false);
    }
  }, [disabled,soundEnabled,onInteract]);

  function toggleTune() {
    if (tune.current) {
      clearTimeout(tune.current);
      onInteract?.('cassette-stop');
      tune.current = null;
      setPlaying(false);
      say('Silence. Sometimes the best track on the tape.', 'THE MIXTAPE');
      return;
    }
    if (!soundEnabled || typeof window.AudioContext !== 'function') {
      say('This browser cannot play the tape. The desk is just as good in silence.');
      return;
    }
    onInteract?.('cassette');
    setPlaying(true);
    say(descriptions.cassette,'THE MIXTAPE');
    tune.current=setTimeout(()=>{tune.current=null;setPlaying(false);if(messageRef.current===descriptions.cassette) say('Tape finished. A tiny adventure, neatly rewound.','THE MIXTAPE');},2450);
  }

  function activate(id: ObjectId) {
    if (disabled) return;
    setDismissedHint(id);
    if(id !== 'cassette') onInteract?.(id);
    if(id === 'duck' && onDuck) { onDuck(); return; }
    if(id === 'controller' && onArcade) { onArcade(); return; }
    if (id === 'window') { onEffect('window'); return; }
    if (id === 'keyboard') { onEffect('keyboard'); return; }
    if (id === 'cassette') { void toggleTune(); return; }
    if(id==='lamp') say(descriptions.lamp,'DESK NOTES',id);
    if (id === 'lamp' || id === 'coffee' || id === 'rocket' || id === 'plant') onEffect(id);
    if (id === 'floppy') onOpenPage('source');
    if (id === 'books') onOpenPage('about');
    // Publish after app/camera callbacks so navigation cannot erase the portrait.
    if(id!=='lamp') say(descriptions[id], id === 'duck' ? 'RUBBER DUCK' : id === 'coffee' ? 'MATE BREAK' : 'DESK NOTES', id);
  }

  return (
    <div className="desk-objects" data-layout={layout} inert={disabled} style={{ '--desk-object-inverse': 1 / safeScale } as CSSProperties}>
      {DESK_OBJECTS.map((object) => {
        const width=Math.max(object.width,44/safeScale),height=Math.max(object.height,44/safeScale);
        const label = object.id === 'cassette' && playing ? 'Stop the chiptune' : object.label;
        return (
          <button key={object.id} type="button" className="desk-object" aria-label={label}
            data-hint-dismissed={dismissedHint === object.id}
            onFocus={() => setDismissedHint(null)}
            aria-pressed={object.id === 'cassette' ? playing : undefined}
            style={layout === 'scene' ? { left: object.x + object.width / 2, top: object.y + object.height / 2, width, height, clipPath:mobile ? objectTouchClip(object,width,height) : undefined } : undefined}
            onClick={() => activate(object.id)}>
            <span className="desk-object-label" aria-hidden="true">{label}</span>
          </button>
        );
      })}
      <div className="desk-objects-status" hidden={!!onMessage} role={onMessage ? undefined : 'status'} aria-live={onMessage ? undefined : 'polite'} aria-atomic="true">{message}</div>
    </div>
  );
}
