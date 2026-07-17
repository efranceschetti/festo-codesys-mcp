/**
 * Embedded knowledge: PLCopen XML rules, CODESYS Ground Truth,
 * IEC 61131-10 Schema & Extensions.
 */

import { loadKnowledge } from './loader.js';

export function getXmlProtocol(): string {
  return loadKnowledge('plcopen/xml-protocol.md');
}

export function getPlcopenSchema(): string {
  return loadKnowledge('plcopen/IEC61131_10.xsd');
}

export function getPlcopenExample(): string {
  return loadKnowledge('plcopen/IEC61131_10_Example.xml');
}

export function getPlcopenExtensions(): string {
  return loadKnowledge('plcopen/plcopen-extensions.md');
}

export function getGroundTruth(): string {
  return loadKnowledge('codesys/ground-truth.md');
}
