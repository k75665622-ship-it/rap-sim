import type { Arc } from '../types';
import { rapperArc } from './rapper';
import { producerArc, managerArc, singerArc } from './others';
export const ARCS: Arc[] = [rapperArc, producerArc, managerArc, singerArc];
