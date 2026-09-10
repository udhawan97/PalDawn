// Human Atlas type and display contracts, © 2026 ashemag, MIT. See LICENSE.
export type SystemId = 'skeletal'|'muscular'|'arterial'|'venous'|'nervous'|'digestive'|'respiratory'|'urinary'|'reproductive'|'lymphatic'|'endocrine'|'integumentary'|'connective'|'sensory'|'cardiac'|'pregnancy';
export const SYSTEMS: {id:SystemId;name:string;color:string}[] = [
 {id:'skeletal',name:'Skeleton',color:'#e2d9ba'},
 {id:'muscular',name:'Muscles',color:'#a85b50'},
 {id:'cardiac',name:'Heart',color:'#b96760'},
 {id:'sensory',name:'Sensory organs',color:'#b0c8ce'},
 {id:'arterial',name:'Arteries',color:'#c05245'},
 {id:'venous',name:'Veins',color:'#527c9f'},
 {id:'nervous',name:'Nervous system',color:'#d8b565'},
 {id:'respiratory',name:'Respiratory',color:'#b98991'},
 {id:'digestive',name:'Digestive',color:'#b8916b'},
 {id:'urinary',name:'Urinary',color:'#b47961'},
 {id:'lymphatic',name:'Lymphatic',color:'#879f7c'},
 {id:'endocrine',name:'Endocrine',color:'#c5a09a'},
 {id:'reproductive',name:'Reproductive',color:'#bda098'},
 {id:'integumentary',name:'Body surface',color:'#ba9b7d'},
 {id:'pregnancy',name:'Pregnancy reference',color:'#b88380'},
 {id:'connective',name:'Connective tissue',color:'#aec3bb'},
];
export interface Part {id:string;name:string;conceptId:string;system:SystemId;chunk:number;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface Concept {id:string;name:string;elements:string[]}
export interface Atlas {version:string;sex?:'male'|'female';source?:string;scope?:string;parts:Part[];concepts:Concept[];chunks:{url:string;bytes:number;gzip?:string;gzipBytes?:number}[];triangles:number}
export type View = 'three-quarter'|'front'|'back'|'side';
export interface SceneState {inspectorOpen?:boolean;explode:number;visible:SystemId[];selected:string[];isolate:boolean;view:View;rotate:boolean;reset:number;reducedMotion?:boolean;concealNames?:boolean;quality?:'standard'|'high';cutaway?:number;surfaceOpacity?:number;presentation?:boolean}
export const DEFAULT_VISIBLE:SystemId[] = ['cardiac','sensory','skeletal','muscular','arterial','venous','nervous','respiratory','digestive','urinary','lymphatic','endocrine','reproductive','connective'];
