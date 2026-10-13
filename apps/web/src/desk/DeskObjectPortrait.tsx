import {DeskPropArt,type DeskObjectId} from './DeskPropArt';
const portraits:Record<DeskObjectId,{label:string;box:string}>={
  zac:{label:'Zac prototype',box:'290 744 106 112'},
  duck:{label:'Rubber duck',box:'994 880 86 72'},
  coffee:{label:'Yerba mate',box:'364 854 90 144'},
  lamp:{label:'Desk lamp',box:'64 420 212 344'},
  rocket:{label:'Little rocket',box:'1434 848 96 144'},
  plant:{label:'Desk plant',box:'84 768 144 214'},
  floppy:{label:'Source disk',box:'974 988 84 72'},
  controller:{label:'Arcade stick',box:'116 996 188 72'},
  cassette:{label:'Mixtape',box:'1052 1002 116 68'},
  books:{label:'Desk books',box:'1252 610 272 126'},
  poster:{label:'Space poster',box:'80 68 196 232'},
  physics:{label:'Physics notes',box:'90 332 190 200'},
  keyboard:{label:'Mechanical keyboard',box:'440 796 542 166'},
  window:{label:'Window neighbour',box:'1432 332 108 136'},
};
export function DeskObjectPortrait({object,lit=true,keyboardEvolved=false,zacAwake=false}:{object:DeskObjectId;lit?:boolean;keyboardEvolved?:boolean;zacAwake?:boolean}) {
  const {label,box}=portraits[object];
  return <svg className="desk-dialogue-object-art" role="img" aria-label={`${object==='window'&&!lit?'Night silhouette':label} portrait`} viewBox={box} preserveAspectRatio="xMidYMid meet" focusable="false"><DeskPropArt object={object} lit={lit} keyboardEvolved={keyboardEvolved} zacAwake={zacAwake}/></svg>;
}
