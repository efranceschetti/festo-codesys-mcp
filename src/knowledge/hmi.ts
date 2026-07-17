/**
 * Embedded knowledge: custom Web HMI architecture, OPC-UA↔WebSocket gateway,
 * and embedded-panel deployment.
 */

import { loadKnowledge } from './loader.js';

export function getHmiWebArchitecture(): string {
  return loadKnowledge('hmi/hmi-web-architecture.md');
}

export function getOpcuaWebsocketGateway(): string {
  return loadKnowledge('hmi/opcua-websocket-gateway.md');
}

export function getHmiEmbeddedDeploy(): string {
  return loadKnowledge('hmi/hmi-embedded-deploy.md');
}
