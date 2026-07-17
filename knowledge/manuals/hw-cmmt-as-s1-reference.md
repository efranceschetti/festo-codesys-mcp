---
id: cmmt-as-s1
title: Festo CMMT-AS-...-S1 — CiA402/EtherCAT Protocol, Safety & Commissioning Reference (Manual 8249086)
priority: HIGH
use_when:
  - working with the CMMT-AS-...-S1 servo drive (EtherCAT / -EC variant)
  - need raw CiA 402 CoE objects or controlword/statusword bit-by-bit
  - configuring STO/SBC safety on the S1 variant (hardwired only — no FSoE/PROFIsafe)
  - decoding internal Festo Px. parameters (Px.300, Px.392, Px.8416, Px.11412, Px.7841...)
  - EtherCAT state machine (Init/PreOp/SafeOp/Op), Sync Managers, Distributed Clocks
  - CSP sub-modes (CSP/CSP-V/CSP-T/CSP-VT), motion monitoring status word
  - manual enable / fault-reset sequence without the Festo PtP library
  - homing methods including negative (homing to fixed / mechanical stop)
never_use_when:
  - you need the PLCopen MC_*_Festo function blocks, FAS step-by-step commissioning, or library error codes — see manual hw-cmmt-servo
  - working with the CMMT-ST stepper — see topic festo-cmmt-st (different encoder / open-loop)
  - you need the complete raw object dictionary (497 objects) — see external/festo-private/cmmt-as-mp-s1-cia402-dict
depends_on: [ethercat-cia402]
related: [hw-cmmt-servo, festo-ptp, festo-cmmt-st]
keywords: [CMMT-AS, CMMT-AS-S1, S1, STO, SBC, CiA402, CoE, EtherCAT, controlword, statusword, 0x6040, 0x6041, homing, CSP, factor group, Px parameter, Px.8416, 0x607C, 0x6098, polarity, 0x607E, ESM, distributed clocks, 8249086]
source: Festo Manual 8249086 Rev 2026-02o
language: pt-BR
---

# CMMT-AS-...-S1 — Referência Técnica para Programação
> Manual Festo 8249086, Rev. 2026-02o | Extraído para uso com Claude Code / CODESYS SoftMotion via EtherCAT

> **📚 Documentos relacionados no MCP** (consolidação 2026-06-01) — este doc é a camada de **protocolo/firmware**:
> - **`hw-cmmt-servo`** (manual) — FBs PLCopen `MC_*_Festo`, comissionamento FAS passo-a-passo, error codes da library, FAQ. Use para PROGRAMAR via library Festo PtP.
> - **`ethercat-cia402`** (topic) — perfil CiA 402 genérico multi-vendor. Aqui os bits manufacturer-specific da Festo são especializados (statusword bit 8 = "drive moving", bit 15 = "drive referenced").
> - **`external/festo-private/cmmt-as-mp-s1-cia402-dict`** — dicionário CRU completo (497 objetos CoE). A seção 16 abaixo lista só os objetos-chave; o dict é a lista autoritativa.
> - **`festo-cmmt-st`** (topic) — ⚠️ NÃO confundir: CMMT-ST é stepper (encoder/open-loop diferentes). Este é CMMT-AS servo de malha fechada.

---

## Índice Rápido
1. [Identificação do Produto](#1-identificação-do-produto)
2. [Interfaces de Comunicação](#2-interfaces-de-comunicação)
3. [EtherCAT — Comunicação e Protocolos](#3-ethercat--comunicação-e-protocolos)
4. [CiA 402 — Máquina de Estados (FSM)](#4-cia-402--máquina-de-estados-fsm)
5. [Controlword (0x6040) e Statusword (0x6041)](#5-controlword-0x6040-e-statusword-0x6041)
6. [Modos de Operação](#6-modos-de-operação)
7. [PDO Mapping — Default EtherCAT](#7-pdo-mapping--default-ethercat)
8. [Homing (Referenciamento)](#8-homing-referenciamento)
9. [Sistema de Unidades e Scaling (Factor Group)](#9-sistema-de-unidades-e-scaling-factor-group)
10. [Configuração de Drive — Parâmetros Essenciais](#10-configuração-de-drive--parâmetros-essenciais)
11. [Funções de Proteção](#11-funções-de-proteção)
12. [Sinais de Segurança — STO / SBC](#12-sinais-de-segurança--sto--sbc)
13. [Diagnóstico e Falhas](#13-diagnóstico-e-falhas)
14. [Máquina de Estados Interna do Servo](#14-máquina-de-estados-interna-do-servo)
15. [Web Server e CDSB](#15-web-server-e-cdsb)
16. [Objetos CoE — Referência Rápida](#16-objetos-coe--referência-rápida)

---

## 1. Identificação do Produto

| Campo | Valor |
|---|---|
| Família | CMMT-AS-...-S1 |
| Tipo | Servo drive monoeixo |
| Manual | 8249084 / 8249086 |
| Revisão | 2026-02o |
| Interface principal | EtherCAT (XF1/XF2), PROFINET (XF1/XF2), EtherNet/IP (XF1/XF2) |
| Interface de serviço | Ethernet [X18] — FAS Plug-in |
| Perfil de fieldbus | CiA 402 (EtherCAT/EtherNet/IP), PROFIdrive (PROFINET) |
| Ferramenta de parametrização | Festo Automation Suite (FAS) — CMMT-AS Plug-in |

### Variantes por fieldbus
| Sufixo | Fieldbus |
|---|---|
| -EC | EtherCAT |
| -PN | PROFINET |
| -EP | EtherNet/IP |
| -MP | CANopen / Modbus TCP |

> **Este documento foca na variante -EC** (EtherCAT): todo o conteúdo aborda CiA402 + EtherCAT.

### Endereçamento IP
- **Factory default:** `192.168.0.1`
- Interface [X18] suporta 2 conexões, apenas 1 pode assumir master control (FAS)
- 4 MACs: MAC1 (plaqueta), MAC2/3/4 consecutivos; MAC4 = [X18]

---

## 2. Interfaces de Comunicação

### Portas EtherCAT
| Porta | Função |
|---|---|
| XF1 IN | Entrada EtherCAT |
| XF2 OUT | Saída EtherCAT |

- Topologia suportada: **line, star, ring**
- XF2 OUT aberta → fechada automaticamente pelo ESC via **loopback**
- Protocolo: **CANopen over EtherCAT (CoE)** + **EoE** + **FoE**
- Byte order: **Little Endian** (LSB primeiro)

### Interface de serviço [X18]
- Ethernet 10/100 Mbit
- Acesso FAS plug-in (parametrização, trace, diagnóstico)
- Web server embutido → `http://<IP_do_drive>/`

---

## 3. EtherCAT — Comunicação e Protocolos

### Padrões implementados
| ETG Spec | Versão | Descrição |
|---|---|---|
| ETG.1000.6 | V1.0.3 | EtherCAT Application Layer Protocol |
| ETG.6010 | V1.1.0 | CiA402 Implementation Directive |

### Protocolos suportados
| Protocolo | Descrição |
|---|---|
| **CoE** | CANopen over EtherCAT — SDO, PDO, Emergency |
| **EoE** | Ethernet over EtherCAT — TCP/IP tunnelling |
| **FoE** | File Access over EtherCAT — firmware update, parâmetros |

### Máquina de Estados EtherCAT (ESM)
```
Power ON / Reset
     ↓
   [Init]
     ↓ IP (configura SM0/SM1 para mailbox)
[Pre-Operational]  ←────────────────────┐
     ↓ PS (configura SM2/SM3 + PDO map) │
[Safe-Operational]                       │ (qualquer estado → Init via IB)
     ↓ SO                                │
  [Operational]                          │
```

| Estado | SDO (mailbox) | PDO (processo) | Obs |
|---|---|---|---|
| Init | ✗ | ✗ | SM0/1 inicializados pelo master |
| **PreOp** | ✓ | ✗ | Configurar PDO mapping aqui |
| **SafeOp** | ✓ | ✓ (só TxPDO lido) | RxPDO ignorado — drive seguro |
| **Op** | ✓ | ✓ | Setpoints processados normalmente |
| Bootstrap | — | — | FoE para atualização de firmware |

> **⚠️ Crítico:** PDO mapping só pode ser alterado em **PreOp**. Na transição PS, master configura SM2/SM3.

### Distributed Clocks (DC)
- Sincronização baseada no **primeiro slave DC-capable** na rede como Clock Master
- SYNC interval configurável: **1 ms a 20 ms** (incremento 1 ms) → Px.1051
- Drive interpola entre setpoints via **fine interpolator** (algoritmo de 4ª ordem em CSP puro)

### Sync Manager
| SM | Canal | Direção | Tipo |
|---|---|---|---|
| SM0 | Mailbox out (Master→Slave) | Write | Acíclico |
| SM1 | Mailbox in (Slave→Master) | Read | Acíclico |
| SM2 | Outputs/RxPDO (Master→Slave) | Write | Cíclico |
| SM3 | Inputs/TxPDO (Slave→Master) | Read | Cíclico |

---

## 4. CiA 402 — Máquina de Estados (FSM)

### Estados estáveis (em negrito = controlados pelo master)
```
Power ON
  ↓ (auto)
Not ready to switch on
  ↓ (auto)
Switch on disabled      ← estado inicial após boot sem erro
  ↓ Shutdown cmd (bits 3:2:1:0 = x:1:1:0)
Ready to switch on
  ↓ Switch On cmd (bits 3:2:1:0 = 0:1:1:1)
Switched on
  ↓ Enable Operation cmd (bits 3:2:1:0 = 1:1:1:1)
Operation enabled       ← DRIVE ATIVO
  ↓ Quick Stop cmd
Quick stop active
  ↓ Disable Voltage
Switch on disabled

Em qualquer estado → FAULT (por erro interno)
FAULT → Switch on disabled (via Fault Reset: bit 7 rising edge)
```

### Comandos via Controlword 0x6040
| Comando | Bit 7 | Bit 3 | Bit 2 | Bit 1 | Bit 0 | Transições |
|---|---|---|---|---|---|---|
| **Shutdown** | 0 | x | 1 | 1 | 0 | 2, 6, 8 |
| **Switch on** | 0 | 0 | 1 | 1 | 1 | 3 |
| **Switch on + Enable op** | 0 | **1** | 1 | 1 | 1 | 3+4 (direto para Op enabled) |
| Disable voltage | 0 | x | x | 0 | x | 7,9,10,12 |
| Quick stop | 0 | x | 0 | 1 | x | 7,10,11 |
| **Enable operation** | 0 | 1 | 1 | 1 | 1 | 4, 16 |
| Disable operation | 0 | 0 | 1 | 1 | 1 | 5 |
| **Fault reset** | 0→1 | x | x | x | x | 15 |

> **Sequência mínima para habilitar drive:**
> 1. Statusword = `xxxx xxxx x1xx 0000` (Switch on disabled) → enviar **Shutdown** (0x0006)
> 2. Statusword = `xxxx xxxx x01x 0001` (Ready to switch on) → enviar **Switch on + Enable** (0x000F)
> 3. Statusword = `xxxx xxxx x01x 0111` (Operation enabled) → **PRONTO**

### Codificação do Statusword 0x6041
| Statusword (hex mask) | Estado |
|---|---|
| `xxxx xxxx x0xx 0000` | Not ready to switch on |
| `xxxx xxxx x1xx 0000` | **Switch on disabled** |
| `xxxx xxxx x01x 0001` | **Ready to switch on** |
| `xxxx xxxx x01x 0011` | **Switched on** |
| `xxxx xxxx x01x 0111` | **Operation enabled** |
| `xxxx xxxx x00x 0111` | Quick stop active |
| `xxxx xxxx x0xx 1111` | Fault reaction active |
| `xxxx xxxx x0xx 1000` | **Fault** |

> Para verificar "Operation enabled": `(statusword AND 0x006F) == 0x0027`

---

## 5. Controlword (0x6040) e Statusword (0x6041)

### Controlword 0x6040 — todos os bits
| Bit | Função | Observação por modo |
|---|---|---|
| 0 | Switch on | FSM — avaliados em conjunto |
| 1 | Enable voltage | FSM |
| 2 | Quick stop | FSM |
| 3 | Enable operation | FSM |
| 4 | Mode-specific | PP: New setpoint / HM: Homing start / PJ: Jog+ / RT: New record |
| 5 | Mode-specific | PP: Change set immediately / PJ: Jog- |
| 6 | Mode-specific | PP: abs(0)/rel(1) |
| 7 | **Fault reset** | Rising edge (0→1) reseta falha |
| 8 | Halt | CSP/CSV/CST: ignorado; outros: para com deceleração atual |
| 9 | Reserved | — |
| 10 | Reserved | — |
| 11 | Jog slow only | PJ: jogging apenas com velocidade 1 (lenta) |
| 12 | Jog fast only | PJ: jogging apenas com velocidade 2 (rápida) |
| 13–15 | Manufacturer | reservado |

### Statusword 0x6041 — todos os bits
| Bit | Função | Observação por modo |
|---|---|---|
| 0 | Ready to switch on | FSM — avaliar em conjunto bits 0-3,5,6 |
| 1 | Switched on | FSM |
| 2 | Operation enabled | FSM |
| 3 | Fault | FSM |
| 4 | Voltage enabled | Tensão DC link presente e válida |
| 5 | Quick stop | **0** = quick stop em execução |
| 6 | Switch on disabled | FSM |
| 7 | Warning | ≥1 mensagem de warning pendente |
| 8 | Drive is moving | **Fabricante:** drive em movimento |
| 9 | Remote | 1 = controlword sendo executado (master control ativo) |
| 10 | Mode-specific | PP/PV/PT/HM/PJ: Target reached / RT: Record sequence done |
| 11 | Internal limit active | Limite de velocidade, torque, SW end pos, HW end pos |
| 12 | Mode-specific | CSP/CSV/CST: Drive follows command / PP: Setpoint ack / HM: Homing attained |
| 13 | Mode-specific | CSP/PP: Following error / PV: Max slippage / HM: Homing error |
| 14 | Reserved | — |
| 15 | Drive is referenced | **Fabricante:** homing concluído |

### Bits mode-specific — resumo por modo
| Modo | Bit 4 CW | Bit 5 CW | Bit 6 CW | Bit 10 SW | Bit 12 SW | Bit 13 SW |
|---|---|---|---|---|---|---|
| PP | New setpoint (↑) | Change immediately | abs(0)/rel(1) | Target reached | Setpoint ack | Following error |
| PV | — | — | — | Speed reached | Speed | Max slippage |
| PT | — | — | — | Torque reached | — | — |
| CSP | — | — | — | — | Follows cmd | Following error |
| CSV | — | — | — | — | Follows cmd | — |
| CST | — | — | — | — | Follows cmd | — |
| HM | Start (↑) | — | — | Target reached | Homing attained | Homing error |
| PJ | Jog+ | Jog- | — | Target reached | Vel1 active | Vel2 active |

---

## 6. Modos de Operação

### Visão geral dos modos
| Código | Nome | Objeto 0x6060 value | Descrição |
|---|---|---|---|
| **PP** | Profile Position | 1 | Posicionamento com gerador de trajetória interno |
| **PV** | Profile Velocity | 3 | Velocidade com rampa interna |
| **PT** | Profile Torque | 4 | Torque/força com ou sem brake |
| **HM** | Homing | 6 | Referenciamento |
| **CSP** | Cyclic Sync Position | 8 | Setpoint de posição cíclico (fieldbus) — **PRINCIPAL MODO CODESYS** |
| **CSV** | Cyclic Sync Velocity | 9 | Setpoint de velocidade cíclico |
| **CST** | Cyclic Sync Torque | 10 | Setpoint de torque cíclico |
| PJ | Jog | — | Jog manual (via bits 4/5 do controlword) |
| RT | Record Table | — | Seleção de record via I/O ou fieldbus |

### Chaveamento dinâmico de modo
Nem todos os modos permitem chaveamento sem parar o eixo:
- **Permitido em movimento:** PP→PV, PV→PP, CSP↔CSV↔CST
- **Requer parada do movimento atual:** PP/PV→CSP, CSP→PP, HM↔outros
- Para chavear CSP→CSV: enviar novo `Mode_of_Operation` (0x6060) e aguardar `Mode_of_Operation_Display` (0x6061) confirmar

### CSP — Cyclic Synchronised Positioning (modo padrão CODESYS SoftMotion)

**Requisitos:**
- Drive em **Operation enabled**
- DC sincronizado (Distributed Clocks ativo)
- SYNC interval: 1–20 ms (Px.1051) — deve ser múltiplo inteiro do ciclo do controlador

**Sub-modos do interpolador CSP** (Px.11412):
| Sub-modo | Algoritmo | Pilot control externo |
|---|---|---|
| **CSP** | 4ª ordem | Nenhum (gerado internamente) |
| CSP-V | 3ª ordem | Velocidade (0x60B1) |
| CSP-T | 3ª ordem | Torque (0x60B2) |
| CSP-VT | 2ª ordem | Velocidade + Torque |

**Objetos essenciais CSP:**
| Objeto | Nome | Tipo | Direção |
|---|---|---|---|
| 0x6040 | Controlword | UINT | RxPDO |
| 0x6041 | Statusword | UINT | TxPDO |
| 0x6060 | Modes of operation | SINT | RxPDO |
| 0x6061 | Modes of operation display | SINT | TxPDO |
| **0x607A** | **Target position** | DINT | RxPDO |
| **0x6064** | **Position actual value** | DINT | TxPDO |
| 0x606C | Velocity actual value | DINT | TxPDO |
| 0x6077 | Torque actual value | INT | TxPDO |
| 0x60B1 | Velocity offset (pilot) | DINT | RxPDO (CSP-V/VT) |
| 0x60B2 | Torque offset (pilot) | INT | RxPDO (CSP-T/VT) |
| 0x607D.01 | Negative SW limit | DINT | SDO/param |
| 0x607D.02 | Positive SW limit | DINT | SDO/param |
| 0x6065 | Following error window | UDINT | SDO/param |
| 0x6066 | Following error timeout | UINT | SDO/param |
| 0x6080 | Max motor speed | UDINT | SDO/param |
| 0x607E | Polarity | USINT | SDO/param |

**Monitoramento de movimento em CSP (motion monitoring status word — Px. interno):**
| Bit | Código | Significado | Ativo em CSP |
|---|---|---|---|
| 3 | FEX | Following error posição | ✓ |
| 5 | FEE | Discrepância enc1 vs enc2 | ✓ |
| 9 | FEEV | Discrepância velocidade enc1 vs enc2 | ✓ |
| 10 | FEA | Following error aceleração | ✓ |
| 12 | HLP | HW limit positivo atingido | ✓ |
| 13 | HLN | HW limit negativo atingido | ✓ |
| 14 | SLP | SW end position positivo | ✓ |
| 15 | SLN | SW end position negativo | ✓ |
| 16 | STX | Standstill monitor posição/velocidade | ✓ |
| 17 | STV | Standstill monitor velocidade | ✓ |
| 18 | LS | Parada atingida (stop reached) | ✓ |
| 21 | VM | Monitoramento de velocidade | ✓ |
| 25 | REFS | Reference switch ativado | ✓ |

### PP — Profile Position
**Sequência para executar movimento PP:**
1. Drive em **Operation enabled**
2. Escrever target position (0x607A), profile velocity (0x6081), aceleração (0x6083), deceleração (0x6084)
3. Setpoint abs/rel: bit 6 do Controlword (0=absoluto, 1=relativo)
4. **Rising edge no bit 4** do Controlword → movimento inicia
5. Se bit 5=1 (Change set immediately): novo setpoint aceito imediatamente mesmo em movimento
6. Monitorar bit 10 do Statusword (Target reached) + bit 12 (Setpoint ack)

**Modo relativo — referência (0x60F2 Positioning option code):**
| Bits 1:0 | Referência |
|---|---|
| 00 | Relativo à última posição de destino |
| 01 | Relativo ao setpoint atual do gerador |
| 10 | Relativo à posição atual real |

---

## 7. PDO Mapping — Default EtherCAT

### RxPDO1 — Outputs (Master → Drive) — Objeto 0x1600

| Subindex | Objeto mapeado | Nome | Tipo | Bits |
|---|---|---|---|---|
| 0x1600.01 | 0x6040.00 | Controlword | UINT | 16 |
| 0x1600.02 | 0x6060.00 | Modes of operation | SINT | 8 |
| 0x1600.03 | 0x607A.00 | Target position | DINT | 32 |
| 0x1600.04 | 0x6081.00 | Profile velocity | UDINT | 32 |
| 0x1600.05 | 0x60FF.00 | Target velocity | DINT | 32 |
| 0x1600.06 | 0x6071.00 | Target torque | INT | 16 |
| 0x1600.07 | 0x60B1.00 | Velocity offset | DINT | 32 |
| 0x1600.08 | 0x60B2.00 | Torque offset | INT | 16 |
| 0x1600.09 | 0x0000.00 | Padding | — | 8 |

**Total RxPDO1:** 9 objetos, `0x1600.00 = 0x09`

### TxPDO1 — Inputs (Drive → Master) — Objeto 0x1A00

| Subindex | Objeto mapeado | Nome | Tipo | Bits |
|---|---|---|---|---|
| 0x1A00.01 | 0x6041.00 | Statusword | UINT | 16 |
| 0x1A00.02 | 0x6061.00 | Modes of operation display | SINT | 8 |
| 0x1A00.03 | 0x6064.00 | Position actual value | DINT | 32 |
| 0x1A00.04 | 0x606C.00 | Velocity actual value | DINT | 32 |
| 0x1A00.05 | 0x6077.00 | Torque actual value | INT | 16 |
| 0x1A00.06 | 0x0000.00 | Padding | — | 8 |

**Total TxPDO1:** 6 objetos, `0x1A00.00 = 0x06`

### TxPDO2 — Diagnostic history — Objeto 0x1AF0 (fixo)
| Subindex | Objeto | Descrição |
|---|---|---|
| 0x1AF0.01 | 0x10F3.04 | New message available (BOOL) |

### TxPDO3 — DC Timestamp — Objeto 0x1AF1 (fixo)
| Subindex | Objeto | Descrição |
|---|---|---|
| 0x1AF1.01 | 0x10F3.05 | Timestamp (DC time) |

### Como alterar PDO mapping
> Executar **somente em PreOp**:
> 1. Setar SM para PreOp no master
> 2. Escrever via SDO: `0x1600.00 = 0` (desabilita mapeamento)
> 3. Escrever subindexes 0x01…0x10 com os objetos desejados (formato: `0xIIIISLLL` onde IIII=índice, S=subindex, LLL=bits)
> 4. Escrever `0x1600.00 = N` (N = número de entradas)
> 5. Avançar para SafeOp → Op

---

## 8. Homing (Referenciamento)

### Função
O homing define o **dimension reference system** do eixo:
- **REF** = Reference point (ponto físico detectado)
- **AZ** = Axis Zero Point = REF + offset (Px.8416)
- **SLN/SLP** = Software end positions
- **TP/AP** = Target / Actual position = AZ + deslocamento

### Ativação
- Modo HM: bit 4 do Controlword com **rising edge** inicia homing
- Statusword bit 10 = 1: homing target reached
- Statusword bit 12 = 1: homing attained (referência salva)
- Statusword bit 13 = 1: homing error
- **Statusword bit 15 = 1:** drive está referenciado (após homing bem-sucedido)

### Métodos suportados (Homing Methods)

| Método | Direção | Alvo primário | Alvo secundário | Observação |
|---|---|---|---|---|
| **37** | — | Posição atual | — | **"Current position" — sem movimento** |
| 34 | + | Posição atual | Zero pulse | |
| 33 | − | Posição atual | Zero pulse | |
| 18 | + | Limit switch | — | Pára no switch, sem zero pulse |
| 17 | − | Limit switch | — | |
| 2 | + | Limit switch | Zero pulse | |
| 1 | − | Limit switch | Zero pulse | |
| 23 | + | Reference switch | — | |
| 27 | − | Reference switch | — | |
| 7 | + | Reference switch | Zero pulse | |
| 11 | − | Reference switch | Zero pulse | |
| −23 | + | Fixed stop/limit switch | Reference switch | |
| −27 | − | Fixed stop/limit switch | Reference switch | |
| **−18** | + | **Fixed stop** | — | **Homing to mechanical stop** |
| **−17** | − | **Fixed stop** | — | **Homing to mechanical stop** |
| −2 | + | Fixed stop | Zero pulse | |
| −1 | − | Fixed stop | Zero pulse | |

> **Para encoder absoluto (EnDat/BiSS/Hiperface):** usar **método 37** ("Current position") — não gera movimento, posição atual é declarada como referência. Mas atenção: o zero point offset (Px.8416) deve estar corretamente configurado.

> **⚠️ Importante:** Em encoders absolutos multivolta, o método 37 define a posição **elétrica atual** como referência. Para garantir reprodutibilidade entre power cycles, a posição zero deve ser armazenada no parâmetro de offset do encoder.

### Parâmetros de homing relevantes
| Px. | Descrição |
|---|---|
| 8416 | Axis zero point offset (distância REF → AZ) |
| — | Homing method (selecionado via 0x6098 no CiA402) |
| — | Homing speed (search): 0x6099.01 |
| — | Homing speed (creep): 0x6099.02 |
| — | Homing acceleration: 0x609A |

---

## 9. Sistema de Unidades e Scaling (Factor Group)

### Conceito
O CMMT-AS trabalha com dois níveis de unidade:
- **Unidades internas (incrementos):** resolução física do encoder
- **User units:** unidade configurável pelo usuário (mm, graus, rotações, etc.)
- **CiA 402 Factor Group:** escala as user units para o barramento fieldbus

> **Factor Group e User Unit são interdependentes** — alterar um altera o outro automaticamente.

### Unidades básicas (fixas — não alteráveis)
| Grandeza | Unidade básica |
|---|---|
| Posição | Metro [m] |
| Velocidade | Metro/segundo [m/s] |
| Aceleração | Metro/segundo² [m/s²] |
| Torque | Newton-metro [N·m] |

### Configuração de User Units (parâmetros Px.)
| Px. | Parâmetro | Update |
|---|---|---|
| 7841 | Resolução posição (expoente de 10, ex: -6 = µm) | reinit |
| 7842 | Resolução velocidade | reinit |
| 7843 | Resolução aceleração | reinit |
| 7844 | Resolução jerk | reinit |
| 7851 | User unit posição | imediato |
| 7852 | User unit velocidade | imediato |
| 7853 | User unit aceleração | imediato |
| 7854 | User unit jerk | imediato |
| 7864 | Incrementos por revolução (atual) | read-only |
| 7865 | Seleção incrementos por revolução (próximo) | reinit |

> **Conversão User Unit:** `resolução = 10^(expoente)` em unidade base. Ex: posição com metro e exp=-6 → 1 incremento = 1 µm.

### Objetos CiA402 para SI units
| Objeto | Descrição |
|---|---|
| 0x60A8 | SI unit position |
| 0x60A9 | SI unit velocity |
| 0x60AA | SI unit acceleration/deceleration |
| 0x60AB | SI unit jerk |

> **Alterar user units:** somente no estado **Pre-Operational**. Após alterar, todos os parâmetros de posição/velocidade no drive são reconvertidos automaticamente.

### CiA 402 Increments (modo alternativo)
- Permite operar em **incrementos motor-side puros** independente da user unit configurada
- Ativado via Px.7866/7867
- SI numerator para CiA 402 increments = `0xC5` (objeto 0x60A8)

---

## 10. Configuração de Drive — Parâmetros Essenciais

### Firmware
| Px. | Descrição |
|---|---|
| 9550 | Versão do firmware package |
| 9560 | Major version |
| 9570 | Minor version |
| 9580 | Patch version |
| 9590 | Build version |

> Atualização de firmware via FAS: download → update → reinit. **Não interromper!**

### Encoder configuration
| Px. | Descrição |
|---|---|
| Px.10040.[enc] | Encoder resolution (encoder 1 = inst 0, encoder 2 = inst 1) |

### Motor configuration
| Parâmetro | Objeto CiA402 | Descrição |
|---|---|---|
| Motor rated torque | 0x6076 | Torque nominal do motor (base para 0x6077 em ‰) |
| Max torque | 0x6072 | Torque máximo simétrico (em ‰ do rated) |
| Max motor speed | 0x6080 | Velocidade máxima do motor (user-defined) |

### Holding Brake
| Px. | Descrição | Valores |
|---|---|---|
| — | Holding brake active | 0: inativo / 1: ativo |
| — | Switch-on delay brake | ms — tempo para freio abrir completamente |
| — | Switch-off delay brake | ms — tempo para freio fechar completamente |

> **⚠️ Brake timing crítico:** `switch-on delay` deve cobrir o tempo mecânico total de abertura do freio. Até expirar, nenhum movimento é aceito. `switch-off delay` mantém controle de posição ativo até freio fechar completamente.

### Gear unit
- Configurável via FAS: numerator/denominator da relação de transmissão
- Fator de carga: definido para eixo rotativo ou linear

---

## 11. Funções de Proteção

### I²t — Power output stage
- Monitoramento de sobrecarga térmica do estágio de potência
- Configurável: limiar e tempo de integração

### I²t — Motor
- Parâmetros: corrente nominal do motor, tempo térmico
- Objetos relevantes: Px. (configurados via FAS)

### Temperature monitoring
- Sensor interno do drive (NTC interno)
- Sensor do motor (PTC/KTY via conector de encoder ou I/O)

### Short circuit detection
- Detecção de curto no estágio de saída de potência
- Reação: stop categoria 0 (desenergização imediata)

### Mains and DC link monitoring
- Monitoramento de subtensão/sobretensão no DC link
- Configurável: limiar de aviso e de erro

### Software end positions
| Objeto | Descrição |
|---|---|
| 0x607D.01 | Negative software position limit |
| 0x607D.02 | Positive software position limit |

> Ativas somente após homing concluído (bit 15 statusword = 1)

---

## 12. Sinais de Segurança — STO / SBC

> **Atenção — variante S1:** A variante CMMT-AS-...-**S1** suporta apenas **STO/SBC hardwired** (conexão direta via bornes de segurança). **Não suporta FSoE/PROFIsafe** (fieldbus safety).

### STO — Safe Torque Off
- Ativado por hardware: entradas #STO-A e #STO-B (dual channel)
- Feedback: saída STA (STO acknowledge)
- Efeito: power stage desabilitado imediatamente (sem deceleração controlada — stop cat. 0)

### SBC — Safe Brake Control
- Ativado por hardware: entradas #SBC-A e #SBC-B
- Feedback: saída SBA (SBC acknowledge)
- Efeito: controle do freio de retenção via canal seguro

### Parâmetros de status (read-only)
| Px. | Descrição | Bits |
|---|---|---|
| 392 | STO safety status | bit0: normal / bit2: função requisitada / bit3: estado seguro atingido / bit4: erro interno / bit7: drive pode ser ligado |
| 432 | SBC error status | idem |
| 500 | SBC error status (detalhado) | — |

### Relação STO → CiA402 FSM
- STO ativo → transição para **Switch on disabled** (transição 1 do FSM interno)
- Statusword: `xxxx xxxx x1xx 0000`
- Após remover STO → drive não retorna automaticamente para Op enabled (requer sequência de enable)

---

## 13. Diagnóstico e Falhas

### Estrutura dos diagnósticos
Mensagens de diagnóstico têm o formato: `XX | YY | ZZZZZ` (decimal longo: 32 bits)
- XX = Category
- YY = Subcategory
- ZZZZZ = Message number

### Diagnóstico status — Px.300
| Bit | Valor | Severity |
|---|---|---|
| 1 | 2 | Ignore |
| 2 | 4 | Information |
| 4 | 16 | Warning |
| 6 | 64 | Error — stop cat. 2 |
| 8 | 256 | Error — stop cat. 1 |
| 12 | 4096 | **Error — stop cat. 0** (desenergização) |

> Para verificar se há erro ativo: `Px.300 >= 64`
> Para verificar stop cat. 0: `Px.300 >= 4096`

### Parâmetros de diagnóstico
| Px. | Descrição |
|---|---|
| 300 | Diagnostic device status (bitmask) |
| 112819 | Error active (bool) |
| 392 | STO safety status |

### Reconhecimento de falhas
- Via Controlword 0x6040: **bit 7 rising edge** (Fault Reset)
- Via CDSB (operador): botão de acknowledge
- Via PROFIdrive: STW1 bit 7

### LEDs de diagnóstico
| LED | Estado | Significado |
|---|---|---|
| Status | Verde fixo | Operation enabled |
| Status | Verde piscando | Ready / Switched on |
| Status | Amarelo | Warning |
| Status | Vermelho | Fault |
| XF1/XF2 | Verde/Amarelo | Link/Activity EtherCAT |
| X18 | Verde/Amarelo | Link/Activity Ethernet service |

**EtherCAT LED states:**
| LED | Estado EtherCAT |
|---|---|
| Verde fixo | Operational (Op) |
| Verde piscando lento | Pre-Operational (PreOp) |
| Verde piscando rápido | Safe-Operational (SafeOp) |
| Vermelho fixo | Erro de comunicação |

### Trace (osciloscópio interno)
- Configurado via FAS plug-in (Trace Configuration / Trace Display)
- Permite capturar posição, velocidade, torque, statusword em tempo real
- Útil para tuning e diagnóstico de following error

### Condition Monitoring
| Função | Descrição |
|---|---|
| Mileage counter | Odômetro de distância percorrida |
| Load change counter | Contador de ciclos de carga |
| Operating hour counter | Horas de operação |

---

## 14. Máquina de Estados Interna do Servo

> Esta FSM é **interna** ao firmware do drive, diferente da CiA402 FSM (que é o perfil de aplicação). A FSM interna é mais granular.

| Estado interno | Descrição |
|---|---|
| Not ready | Pré-condição não cumprida (encoder não selecionado, DC link sem tensão) |
| Disabled | Bloqueado. Power stage off. |
| Ready | Power stage off. Freio pode ser operado manualmente. |
| Enabling | Power stage ligando. |
| **Standstill** | Operacional, controlado em posição. Aguardando comando. |
| **Profile** | Executando comando de movimento. |
| Homing | Executando homing. |
| Jog | Em modo jog. |
| Autotuning | Executando auto-tuning. |
| Torque with brake | Force/torque com freio acionado. |
| Drive Sync | Modo slave (master-slave coupling). |
| Brake test | Teste automático do freio. |
| Halt | Movimento abortado via device profile. |
| Stop | Parado por sinal de stop. |
| **Error stop** | Parado por evento de diagnóstico. |

**Transições importantes:**
- Power stage enable via `CTRL-EN` (hardware) → vai direto para **Profile** (sem passar por Standstill)
- Power stage enable via fieldbus → vai para **Standstill** primeiro
- STO ativo → transição para **Disabled**
- Erro → **Error stop**

---

## 15. Web Server e CDSB

### Web Server
- Acesso: `http://<IP_do_drive>/` via [X18]
- Disponível nos perfis CiA402 e PROFIdrive
- Permite visualização de diagnóstico, status, parâmetros básicos

### CDSB — Operator Unit (display frontal opcional)
Menu principal do CDSB:
1. **Status indicator** — estado atual do drive
2. **Current messages** — mensagens/falhas ativas
3. **Message sequence** — histórico de mensagens
4. **Device details** — S/N, firmware version, tipo
5. **Network** — IP, MAC, status fieldbus
6. **Monitoring** — processo data, I/O state
7. **Settings** — configurações básicas
8. **Service** — acknowledge de erros, resets

> Para acknowledge de todas as mensagens via CDSB: menu **Service → Acknowledge all**

---

## 16. Objetos CoE — Referência Rápida

> Lista parcial dos objetos mais usados. Para o dicionário CRU completo (497 objetos extraídos do ESI, com tipo/access/PDO-flag), ver `external/festo-private/cmmt-as-mp-s1-cia402-dict`. Nota: os clássicos `0x6091` (gear ratio) / `0x6092` (feed constant) **não existem neste servo** — o scaling é via parâmetros Px. Festo (seção 9) / UnitManager interno.

### Objetos de controle e status
| Objeto | Sub | Nome | Tipo | R/W |
|---|---|---|---|---|
| 0x6040 | 00 | Controlword | UINT | W |
| 0x6041 | 00 | Statusword | UINT | R |
| 0x6060 | 00 | Modes of operation | SINT | W |
| 0x6061 | 00 | Modes of operation display | SINT | R |

### Objetos de posição
| Objeto | Sub | Nome | Tipo | R/W |
|---|---|---|---|---|
| 0x607A | 00 | Target position | DINT | W |
| 0x6062 | 00 | Setpoint position (demand) | DINT | R |
| 0x6064 | 00 | Position actual value | DINT | R |
| 0x60E4 | 01 | Actual position encoder ch1 | DINT | R |
| 0x60F4 | 00 | Following error actual value | DINT | R |
| 0x6065 | 00 | Following error window | UDINT | R/W |
| 0x6066 | 00 | Following error timeout | UINT | R/W |
| 0x607D | 01 | Neg. software limit | DINT | R/W |
| 0x607D | 02 | Pos. software limit | DINT | R/W |
| 0x607E | 00 | Polarity | USINT | R/W |
| 0x60F2 | 00 | Positioning option code | UINT | R/W |

### Objetos de velocidade
| Objeto | Sub | Nome | Tipo | R/W |
|---|---|---|---|---|
| 0x6081 | 00 | Profile velocity | UDINT | W |
| 0x6082 | 00 | End velocity | UDINT | W |
| 0x607F | 00 | Max profile velocity | UDINT | R/W |
| 0x6080 | 00 | Max motor speed | UDINT | R/W |
| 0x60FF | 00 | Target velocity (CSV/PV) | DINT | W |
| 0x606C | 00 | Velocity actual value | DINT | R |
| 0x60B1 | 00 | Velocity offset (pilot CSP-V) | DINT | W |

### Objetos de aceleração/torque
| Objeto | Sub | Nome | Tipo | R/W |
|---|---|---|---|---|
| 0x6083 | 00 | Profile acceleration | UDINT | W |
| 0x6084 | 00 | Profile deceleration | UDINT | W |
| 0x6085 | 00 | Quick stop deceleration | UDINT | R/W |
| 0x6071 | 00 | Target torque | INT | W |
| 0x6077 | 00 | Torque actual value | INT | R |
| 0x60B2 | 00 | Torque offset (pilot CSP-T) | INT | W |
| 0x6072 | 00 | Max torque (symmetric) | UINT | R/W |
| 0x6076 | 00 | Motor rated torque | UDINT | R |

### Objetos de homing
| Objeto | Sub | Nome | Tipo | R/W |
|---|---|---|---|---|
| 0x6098 | 00 | Homing method | SINT | R/W |
| 0x6099 | 01 | Speed during homing (search) | UDINT | R/W |
| 0x6099 | 02 | Speed during homing (creep) | UDINT | R/W |
| 0x609A | 00 | Homing acceleration | UDINT | R/W |

### Objetos de PDO mapping
| Objeto | Descrição |
|---|---|
| 0x1600 | RxPDO1 mapping (outputs — Master→Drive) |
| 0x1A00 | TxPDO1 mapping (inputs — Drive→Master) |
| 0x1AF0 | TxPDO2 — diagnostic history (fixo) |
| 0x1AF1 | TxPDO3 — DC timestamp (fixo) |

### Objetos de SI units / factor group
| Objeto | Descrição |
|---|---|
| 0x60A8 | SI unit position |
| 0x60A9 | SI unit velocity |
| 0x60AA | SI unit acceleration |
| 0x60AB | SI unit jerk |

---

## Apêndice A — Sequência de Enable para CODESYS SoftMotion (EtherCAT / CSP)

```
1. EtherCAT: Init → PreOp → SafeOp → Op (automático pelo master EtherCAT)

2. Verificar STO não ativo: #STO-A e #STO-B = HIGH (24V)

3. Verificar statusword bits:
   Mask = SW AND 0x004F
   Se Mask = 0x0040 → Switch on disabled → OK para iniciar enable

4. Enviar Shutdown (0x6040 = 0x0006):
   Aguardar SW AND 0x006F = 0x0021 (Ready to switch on)

5. Enviar Switch On + Enable Operation (0x6040 = 0x000F):
   Aguardar SW AND 0x006F = 0x0027 (Operation enabled)

6. Drive habilitado! Modo de operação:
   Escrever 0x6060 = 8 (CSP) via RxPDO
   Verificar 0x6061 = 8 confirmado via TxPDO

7. Homing (se encoder incremental ou se não estiver referenciado):
   Escrever 0x6098 = método desejado (ex: 37 para "current position")
   Escrever 0x6060 = 6 (HM mode)
   Rising edge bit 4 do Controlword
   Aguardar SW bit 12 = 1 (homing attained) E SW bit 15 = 1 (referenced)
   Retornar para modo CSP: 0x6060 = 8

8. Enviar setpoints cíclicos via RxPDO (0x607A = target position)
   Monitorar 0x6064 (actual position) via TxPDO
```

---

## Apêndice B — Reset de Falha

```
1. Identificar falha:
   - Statusword AND 0x000F = 0x0008 → Fault state
   - Ler Px.300 (diagnostic status) para severity
   - Ler error log via FAS ou CDSB

2. Corrigir condição de erro (se aplicável)

3. Fault Reset:
   - Escrever 0x6040 com bit 7 = 0 primeiro
   - Escrever 0x6040 com bit 7 = 1 (rising edge)
   - Aguardar statusword sair de Fault (0x0008)
   - Drive retorna para Switch on disabled

4. Re-executar sequência de enable (Apêndice A)
```

---

## Apêndice C — Parâmetros Px. mais usados

| Px. | Nome | Acesso | Update |
|---|---|---|---|
| 300 | Diagnostic device status | R | imediato |
| 392 | STO safety status | R | imediato |
| 432 | SBC error status | R | imediato |
| 1051 | Synchronisation time (DC interval) | R/W | reinit |
| 4629 | Negative SW limit position | R/W | imediato |
| 4630 | Positive SW limit position | R/W | imediato |
| 7841 | Resolution position (10^n) | R/W | reinit |
| 7851 | User unit position | R/W | imediato |
| 7865 | Increments per revolution (next) | R/W | reinit |
| 8130 | Target position CiA402 (= 0x607A) | R/W | imediato |
| 8416 | Axis zero point offset | R/W | imediato |
| 9550 | Firmware package version | R | imediato |
| 11412 | Interpolation mode CSP | R/W | imediato |
| 112819 | Error active | R | imediato |

---

*Documento gerado de: Festo CMMT-AS-...-S1 Manual 8249086, Rev. 2026-02o*
*Referência para Claude Code / CODESYS SoftMotion*
