/**
 * Embedded knowledge: Festo CPX, Festo PtP, Festo CDPX HMI.
 */

import { loadKnowledge } from './loader.js';

export function getFestoCpxReference(): string {
  return loadKnowledge('festo/festo-cpx-reference.md');
}

export function getFestoPtpReference(): string {
  return loadKnowledge('festo/festo-ptp-reference.md');
}

export function getMotionPatterns(): string {
  return loadKnowledge('festo/motion-patterns.md');
}

export function getCdpxHmi(): string {
  return loadKnowledge('festo/festo-cdpx-hmi.md');
}

export function getVtuxTerminal(): string {
  return loadKnowledge('festo/festo-vtux-terminal.md');
}

export function getCmmtSt(): string {
  return loadKnowledge('festo/festo-cmmt-st.md');
}

export function getMqttIiot(): string {
  return loadKnowledge('festo/festo-mqtt-iiot.md');
}
