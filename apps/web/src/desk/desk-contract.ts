export const DESK_GEOMETRY = {
  width: 1600, height: 1100,
  screen: { x: 362, y: 125, width: 846, height: 482 },
  device: { x: 1110, y: 784, width: 300, height: 210 },
} as const;
export type DeskBrowserPage = 'preview' | 'install' | 'source' | 'about';
export type DeskEffect = 'lamp' | 'rocket' | 'plant' | 'coffee' | 'window' | 'keyboard';
export const DESK_OBJECTS = [
  { id: 'lamp', label: 'Switch the desk lamp', x: 135, y: 415, width: 140, height: 350 },
  { id: 'coffee', label: 'Take a mate break', x: 365, y: 880, width: 90, height: 130 },
  { id: 'duck', label: 'Ask the rubber duck', x: 995, y: 875, width: 85, height: 80 },
  { id: 'rocket', label: 'Launch the little rocket', x: 1440, y: 850, width: 75, height: 135 },
  { id: 'plant', label: 'Water the desk plant', x: 80, y: 790, width: 150, height: 185 },
  { id: 'floppy', label: 'Inspect the source disk', x: 970, y: 990, width: 90, height: 70 },
  { id: 'controller', label: 'Inspect the old game controller', x: 120, y: 1000, width: 180, height: 65 },
  { id: 'cassette', label: 'Play a short chiptune', x: 1055, y: 1000, width: 110, height: 70 },
  { id: 'books', label: 'Read the desk books', x: 1260, y: 640, width: 260, height: 92 },
  { id: 'poster', label: 'Read the space poster', x: 80, y: 70, width: 190, height: 220 },
  { id: 'physics', label: 'Read the physics notes', x: 90, y: 340, width: 195, height: 190 },
  { id: 'window', label: 'Look through the window', x:1280, y:80, width:296, height:406 },
  { id:'keyboard', label:'Evolve the keyboard', x:445, y:805, width:530, height:145 },
] as const;
