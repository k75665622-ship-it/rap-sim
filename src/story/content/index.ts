import type { Arc } from '../types';
import { rapperArc } from './rapper';
import { producerArc, managerArc, singerArc } from './others';
import { directorArc, djArc } from './seats2';
import { kjArc, familyArc, whispersArc } from './personal';
export const ARCS: Arc[] = [rapperArc, producerArc, managerArc, singerArc, directorArc, djArc, kjArc, familyArc, whispersArc];
