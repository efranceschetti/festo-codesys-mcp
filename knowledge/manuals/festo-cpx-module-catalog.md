# Festo CPX Module Catalog

> Comprehensive reference for all CPX and CPX-E modules available in the Festo CODESYS library.
> Source: Device descriptor files (devdesc.xml) from Festo+CPX-E-CEC v3.5.20.96.
> Total modules cataloged: 160 device descriptors covering ~95 unique module types.

---

## Table of Contents

1. [Controllers (CEC)](#1-controllers-cec)
2. [System Modules](#2-system-modules)
3. [Digital I/O Modules](#3-digital-io-modules)
4. [Analog I/O Modules](#4-analog-io-modules)
5. [Counter Modules](#5-counter-modules)
6. [IO-Link Master Modules](#6-io-link-master-modules)
7. [Fieldbus Nodes (FB)](#7-fieldbus-nodes-fb)
8. [Pneumatic Valve Modules -- MPA Series](#8-pneumatic-valve-modules----mpa-series)
9. [Pneumatic Valve Modules -- VTSA Series](#9-pneumatic-valve-modules----vtsa-series)
10. [Pneumatic Valve Modules -- VABF/VABV Series](#10-pneumatic-valve-modules----vabfvabv-series)
11. [Proportional Pressure Regulators -- VPPM](#11-proportional-pressure-regulators----vppm)
12. [Festo Motion Terminal -- VTEM](#12-festo-motion-terminal----vtem)
13. [Motion / Drive Interface Modules](#13-motion--drive-interface-modules)
14. [Smart / Specialty Modules](#14-smart--specialty-modules)
15. [Legacy / Misc Modules](#15-legacy--misc-modules)
16. [I/O Data Type Reference](#16-io-data-type-reference)
17. [PLC Code Generation Notes](#17-plc-code-generation-notes)

---

## 1. Controllers (CEC)

Controllers are the head modules of a CPX system. They run CODESYS V3 runtime and manage the I/O bus.

### CPX (Classic) Controllers

| Module | Description | Protocol | Order No. |
|--------|-------------|----------|-----------|
| CEC-C1-V3 | CODESYS V3 Embedded Controller -- CANopen | CANopen | 3473128 |
| CEC-M1-V3 | CODESYS V3 Embedded Controller -- SoftMotion | SoftMotion | 3472765 |
| CEC-S1-V3 | CODESYS V3 Embedded Controller -- Serial | RS-232 | 3472425 |

### CPX-E Controllers

| Module | Description | Protocol | Order No. |
|--------|-------------|----------|-----------|
| E-CEC-C1 | CPX-E CODESYS V3 Controller (standalone) | Standalone | 5226780 |
| E-CEC-C1-PN | CPX-E CODESYS V3 Controller -- PROFINET | PROFINET | 4252741 |
| E-CEC-C1-EP | CPX-E CODESYS V3 Controller -- EtherNet/IP | EtherNet/IP | 4252742 |
| E-CEC-C1-EC | CPX-E CODESYS V3 Controller -- EtherCAT | EtherCAT | N/A |
| E-CEC-C1-EX1E | CPX-E CODESYS V3 Controller -- EX Zone 2 | EX/NE21 | N/A |
| E-CEC-C1-PN-EX1E | CPX-E CODESYS V3 Controller -- PROFINET, EX | PROFINET+EX | N/A |
| E-CEC-C1-EP-EX1E | CPX-E CODESYS V3 Controller -- EtherNet/IP, EX | EtherNet/IP+EX | N/A |
| E-CEC-M1 | CPX-E CODESYS V3 Controller -- SoftMotion | SoftMotion | 5266781 |
| E-CEC-M1-PN | CPX-E CODESYS V3 Controller -- PROFINET, SoftMotion | PROFINET+SM | 4252743 |
| E-CEC-M1-EP | CPX-E CODESYS V3 Controller -- EtherNet/IP, SoftMotion | EtherNet/IP+SM | 4252744 |
| E-CEC-M1-EC | CPX-E CODESYS V3 Controller -- EtherCAT, SoftMotion | EtherCAT+SM | N/A |

**Key notes for code generation:**
- C1 = standard controller, M1 = SoftMotion (motion control capable)
- Protocol suffix determines fieldbus: PN=PROFINET, EP=EtherNet/IP, EC=EtherCAT
- EX1E suffix = Zone 2 Ex-rated for hazardous environments
- Controllers have 0 process I/O channels -- they manage the backplane bus only

---

## 2. System Modules

System-level device descriptors define the CPX station as a whole.

| Module | Description | Order No. |
|--------|-------------|-----------|
| CPX_System | CPX/MPA Valve terminal with diagnostics | 3472425 / 3473128 / 3472765 |
| CPX_E_System | CPX-E Control system (multiple variants) | 4252741-4252744 / 5226780-5266781 |

These are the top-level system containers in CODESYS device tree. I/O modules plug in as child devices.

---

## 3. Digital I/O Modules

### CPX (Classic) Digital Inputs

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| 4DI | 4-ch digital input, 24VDC, PNP | 4 DI | 1x USINT (4-bit packed) | 195752 |
| 8DI | 8-ch digital input, 24VDC, PNP | 8 DI | 1x USINT (8-bit packed) | 195750 |
| 8DI-D | 8-ch digital input, diagnostics, 24VDC, PNP | 8 DI | 1x USINT (8-bit packed) | 541480 |
| 8NDI | 8-ch digital input, 24VDC, NPN | 8 DI | 1x USINT (8-bit packed) | 543813 |
| 16DI | 16-ch digital input, 24VDC, PNP | 16 DI | 1x UINT (16-bit packed) | 543815 |
| 16DI-D | 16-ch digital input, diagnostics, 24VDC, PNP | 16 DI | 1x UINT (16-bit packed) | 550202 |

### CPX (Classic) Digital Outputs

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| 4DO | 4-ch digital output, 24VDC, 1.0A, PNP | 4 DO | 1x USINT (4-bit packed) | 195754 |
| 8DO | 8-ch digital output, 24VDC, 0.5A, PNP | 8 DO | 1x USINT (8-bit packed) | 541482 |
| 8DO-H | 8-ch digital output, 24VDC, 2.1A, PNP (high power) | 8 DO | 1x USINT (8-bit packed) | 550204 |

### CPX (Classic) Digital Mixed I/O

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| 8DI/8DO | 8 DI + 8 DO, 0.5A, 24VDC, PNP | 8 DI + 8 DO | 1x USINT in + 1x USINT out | 526257 |

### CPX-E Digital Inputs

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| E-16DI | 16-ch digital input, 24VDC, PNP | 16 DI | 1x UINT (16-bit packed) | 4080492 |
| E-16DI-P | 16-ch digital input, 24VDC, PNP (P-variant) | 16 DI | 1x UINT (16-bit packed) | 4842617 |
| E-16DI-NPN | 16-ch digital input, 24VDC, NPN | 16 DI | 1x UINT (16-bit packed) | N/A |
| E-16DI-EX1E | 16-ch digital input, 24VDC, PNP, EX Zone 2 | 16 DI | 1x UINT (16-bit packed) | N/A |

### CPX-E Digital Outputs

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| E-8DO | 8-ch digital output, 24VDC, 0.5A, PNP | 8 DO | 1x USINT (8-bit packed) | 4080491 |
| E-8DO-P | 8-ch digital output, 24VDC, 0.5A, PNP (P-variant) | 8 DO | 1x USINT (8-bit packed) | 4842616 |
| E-8DO-NPN | 8-ch digital output, 24VDC, 0.5A, NPN | 8 DO | 1x USINT (8-bit packed) | N/A |
| E-8DO-EX1E | 8-ch digital output, 24VDC, 0.5A, PNP, EX Zone 2 | 8 DO | 1x USINT (8-bit packed) | N/A |

### CPX-L Digital Modules (IP20 Terminals)

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| L-16DI-KL | 16-ch digital input, 24VDC, PNP, IP20 | 16 DI | 1x UINT (16-bit packed) | 572606 |
| L-8DI8DO-KL | 8 DI + 8 DO, 0.25A, 24VDC, PNP, IP20 | 8+8 | 1x USINT in + 1x USINT out | 572607 |

### CPX-P NAMUR Modules (Process Automation)

| Module | Description | Channels | Data Type | Order No. |
|--------|-------------|----------|-----------|-----------|
| P-8DI-N | 8-ch NAMUR input for sensors or dry contacts | 8 DI | 1x USINT in + 1x USINT out | 565933 |
| P-8DI-N-IS | 8-ch NAMUR input, intrinsically safe | 8 DI | 1x USINT in + 1x USINT out | 565934 |
| P-8DI-N-X | 8-ch NAMUR input (extended, 10 in + 1 out) | 8 DI + diag | 10x USINT in + 1x USINT out | 565933 |
| P-8DI-N-IS-X | 8-ch NAMUR input, IS (extended, 10 in + 1 out) | 8 DI + diag | 10x USINT in + 1x USINT out | 565934 |

**PLC code notes for Digital I/O:**
- Digital channels are bit-packed into USINT (8-bit) or UINT (16-bit) words
- Access individual channels via bit indexing: `myModule.Input_0.Bit3`
- The `-D` suffix modules add channel-level diagnostics (wire-break, short-circuit)
- NPN variants sink current; PNP variants source current

---

## 4. Analog I/O Modules

### CPX (Classic) Analog Inputs

| Module | Description | Channels | Resolution | Signal Type | Order No. |
|--------|-------------|----------|------------|-------------|-----------|
| 2AI | 2-ch analog input | 2 AI | 12-bit | 0-10V, 0-20mA, 4-20mA | 526168 |
| 4AI-I | 4-ch analog input (current only) | 4 AI | 12-bit | 0-20mA, 4-20mA | 541484 |
| 4AI-U-I | 4-ch analog input (voltage + current) | 4 AI | 16-bit | 0-10V, 0-20mA, 4-20mA | 573710 |
| 4AI-T | 4-ch temperature (RTD) | 2-4 AI | 16-bit | PT100-PT1000, NI100-NI1000 | 541486 |
| 4AI-TC | 4-ch temperature (thermocouple) | 4 AI | 16-bit | Type E,J,T,K,N,S,B,R | 553594 |
| 4AI-P-B2 | 4-ch pressure sensor (2 bar) | 4 AI | 16-bit | Integrated pressure | 560361 |
| 4AI-P-D10 | 4-ch pressure sensor (10 bar) | 4 AI | 16-bit | Integrated pressure | 560362 |

### CPX (Classic) Analog Outputs

| Module | Description | Channels | Resolution | Signal Type | Order No. |
|--------|-------------|----------|------------|-------------|-----------|
| 2AO | 2-ch analog output | 2 AO | 12-bit | 0-10V, 0-20mA, 4-20mA | 526170 |

### CPX (Classic) Analog Mixed I/O (HART)

| Module | Description | Channels | Protocol | Order No. |
|--------|-------------|----------|----------|-----------|
| 4AI-H | 4 analog inputs with HART | 4 AI | HART | 8059847 |
| 4AI-H 4HV | 4 AI HART with HART variables in PI | 4+8 AI | HART+HV | 8059847 |
| 4AO-H | 4 analog outputs with HART | 4 AO | HART | 8059847 |
| 4AO-H 4HV | 4 AO HART with HART variables in PI | 8 AI + 4 AO | HART+HV | 8059847 |
| 1AI3AO-H | 1 AI + 3 AO with HART | 1 AI + 3 AO | HART | 8059847 |
| 2AI2AO-H | 2 AI + 2 AO with HART | 2 AI + 2 AO | HART | 8059847 |
| 3AI1AO-H | 3 AI + 1 AO with HART | 3 AI + 1 AO | HART | 8059847 |
| 4AI4AO-H | 4 AI + 4 AO with HART | 4 AI + 4 AO | HART | 8043727 |

*4HV variants include 4 HART variables per channel in the process image (additional UINT inputs per channel).*

### CPX-E Analog Inputs

| Module | Description | Channels | Resolution | Data Type | Order No. |
|--------|-------------|----------|------------|-----------|-----------|
| E-4AI-U-I | 4-ch analog input, voltage + current | 4 AI | 16-bit | 4x UINT (input) | 4080493 |
| E-4AI-U-I-EX1E | 4-ch analog input, V+I, EX Zone 2 | 4 AI | 16-bit | 4x UINT (input) | N/A |

### CPX-E Analog Outputs

| Module | Description | Channels | Resolution | Data Type | Order No. |
|--------|-------------|----------|------------|-----------|-----------|
| E-4AO-U-I | 4-ch analog output, voltage + current | 4 AO | 16-bit | 4x UINT (output) | 4080494 |
| E-4AO-U-I-EX1E | 4-ch analog output, V+I, EX Zone 2 | 4 AO | 16-bit | 4x UINT (output) | N/A |

**PLC code notes for Analog I/O:**
- Each analog channel is a UINT (16-bit, 0-27648 normalized for Festo standard range)
- Scaling: 0-27648 = 0-10V or 0/4-20mA depending on config
- HART modules add additional UINT values per channel for HART secondary variables
- Temperature modules: value in 0.1 degree units

---

## 5. Counter Modules

| Module | Description | Inputs | Outputs | Data Types | Order No. |
|--------|-------------|--------|---------|------------|-----------|
| E-1CI | Counter with latch + speed measurement | 3 (UDINT) | 1 (UINT) | Counter=UDINT, Speed=UDINT, Status=UDINT, Ctrl=UINT | 4827505 |
| E-1CI-EX1E | Counter with latch + speed, EX Zone 2 | 3 (UDINT) | 1 (UINT) | Same as E-1CI | N/A |
| 2CI2DO | Multifunctional counter, 2 independent counter/pulse/incremental/SSI inputs + 2 outputs | 3 | 3 | Counter values + control word | 576046 |

**PLC code notes for Counter:**
- E-1CI: Input 0 = counter value (UDINT), Input 1 = latch value (UDINT), Input 2 = speed (UDINT)
- E-1CI: Output 0 = control word (UINT) for reset, latch trigger, etc.
- 2CI2DO: Two independent counter channels with SSI/incremental encoder support

---

## 6. IO-Link Master Modules

| Module | Description | Ports | Order No. |
|--------|-------------|-------|-----------|
| E-1IOL | IO-Link master, 1 port | 1 | 4080495 |
| E-1IOL-P | IO-Link master, 1 port (P-variant) | 1 | 4842618 |
| E-1IOL-EX1E | IO-Link master, 1 port, EX Zone 2 | 1 | N/A |
| E-2IOL | IO-Link master, 2 ports | 2 | 4080495 |
| E-2IOL-P | IO-Link master, 2 ports (P-variant) | 2 | 4842618 |
| E-2IOL-EX1E | IO-Link master, 2 ports, EX Zone 2 | 2 | N/A |
| E-4IOL | IO-Link master, 4 ports | 4 | 4080495 |
| E-4IOL-P | IO-Link master, 4 ports (P-variant) | 4 | 4842618 |
| E-4IOL-EX1E | IO-Link master, 4 ports, EX Zone 2 | 4 | N/A |
| CTEL | Quadruple I-Port master, 0-256 DI + 0-256 DO | 4 I-Port | 1577012 |
| CTEL-2-LK | I-Port LK master, 2 channels | 2 I-Port LK | 2900543 |

**PLC code notes for IO-Link:**
- IO-Link channels are configured via the CODESYS IO-Link configuration editor
- Data is mapped as raw byte arrays; size depends on connected IO-Link device IODD
- No fixed channel count in process image -- depends on device profile

---

## 7. Fieldbus Nodes (FB)

Fieldbus nodes (FB-RC = Remote Controller) are used when the CPX system is a remote I/O slave connected to an external PLC. Each has 8 USINT input + 8 USINT output process data words.

| Module | Protocol | Connector | Order No. |
|--------|----------|-----------|-----------|
| FB05-RC | ABB CS31 | -- | 540752 |
| FB06-RC | Interbus | -- | 195748 |
| FB11-RC | DeviceNet | -- | 526172 |
| FB13-RC | PROFIBUS DP | -- | 195740 |
| FB14-RC | CANopen | -- | 526174 |
| FB20/21-RC | Interbus fiber optic | FO | 572334/572221 |
| FB23-RC | CC-Link | -- | 526176 |
| FB32-RC | EtherNet/IP | RJ45 | 541302 |
| FB33-RC | PROFINET IO | 2x M12, metal | 548755 |
| FB34-RC | PROFINET IO | 2x AIDA PP RJ45, metal | 548751 |
| FB35-RC | PROFINET IO | 2x AIDA PP SCRJ, metal | 548749 |
| FB36-RC | EtherNet/IP 2-Port | RJ45 | 1912451 |
| FB36-RC (ModbusTCP) | Modbus TCP | RJ45 | 1912451 |
| FB37-RC | EtherCAT (MDP) | -- | 2735960 |
| FB38-RC | EtherCAT | -- | 552046 |
| FB39-RC | SERCOS III | -- | 2093101 |
| FB40-RC | POWERLINK V2 | -- | 2474896 |
| FB41-RC | PROFINET IO | 1x AIDA PP SCRJ, metal | 3228960 |
| FB43-RC | PROFINET IO | 2x M12, metal (new) | 8110369 |
| FB44-RC | PROFINET IO | 2x AIDA PP RJ45, metal (new) | 8110370 |
| FB45-RC | PROFINET IO | 2x AIDA PP SCRJ, metal (new) | 8110371 |

**PLC code notes for Fieldbus Nodes:**
- All FB modules expose 8x USINT input + 8x USINT output (64 bytes each direction)
- Exception: FB05-RC has 2x USINT in + 2x USINT out (smaller data)
- These are used as slave/device nodes, NOT as controllers
- Process data mapping depends on the master PLC's configuration

---

## 8. Pneumatic Valve Modules -- MPA Series

MPA modules control solenoid valve coils on Festo MPA valve terminals. Each coil = 1 output bit.

### MPA1 Series (10mm valve width)

| Module | Description | Coils | Diag | Isolated | Pressure Switch | Order No. |
|--------|-------------|-------|------|----------|-----------------|-----------|
| MPA1S | MPA1 valves, 8 coils | 8 | No | No | No | 533360 |
| MPA1S-D | MPA1 valves, 8 coils, extended diagnostics | 8 | Yes | No | No | 543331 |
| MPA1G | MPA1 valves, 8 coils, isolated power | 8 | No | Yes | No | 533361 |
| MPA1G-D | MPA1 valves, 8 coils, isolated power, diag | 8 | Yes | Yes | No | 543333 |
| MPA1G-S | MPA1 pilot + valves, 7 coils + 1 pressure switch | 7 | No | Yes | Yes (1) | 8108543 |
| MPA1G-D-S | MPA1 pilot + valves, 7 coils, diag + pressure | 7 | Yes | Yes | Yes (1) | 8108545 |

### MPA2 Series (18mm valve width)

| Module | Description | Coils | Diag | Isolated | Order No. |
|--------|-------------|-------|------|----------|-----------|
| MPA2S | MPA2 valves, 4 coils | 4 | No | No | 537983 |
| MPA2S-D | MPA2 valves, 4 coils, extended diagnostics | 4 | Yes | No | 543332 |
| MPA2G | MPA2 valves, 4 coils, isolated power | 4 | No | Yes | 537984 |
| MPA2G-D | MPA2 valves, 4 coils, isolated power, diag | 4 | Yes | Yes | 543334 |

### MPA14 Series (14mm valve width)

| Module | Description | Coils | Diag | Isolated | Pressure Switch | Order No. |
|--------|-------------|-------|------|----------|-----------------|-----------|
| MPA14S | MPA14 valves, 8 coils | 8 | No | No | No | 8066764 |
| MPA14S-D | MPA14 valves, 8 coils, extended diagnostics | 8 | Yes | No | No | 8066766 |
| MPA14G | MPA14 valves, 8 coils, isolated power | 8 | No | Yes | No | 8066765 |
| MPA14G-D | MPA14 valves, 8 coils, isolated power, diag | 8 | Yes | Yes | No | 8066767 |
| MPA14G-S | MPA14 pilot + valves, 7 coils + 1 pressure switch | 7 | No | Yes | Yes (1) | 8108547 |
| MPA14G-D-S | MPA14 pilot + valves, 7 coils, diag + pressure | 7 | Yes | Yes | Yes (1) | 8108549 |

### MPA Special Modules

| Module | Description | I/O | Order No. |
|--------|-------------|-----|-----------|
| MPA(S/F)-P | MPA pressure sensor module | 1 AI (pressure) | 541085-545354 |
| MPAF-EPL-P | MPAF pneumatic interface with pressure sensor | 1 AI (pressure) | 547491 |
| MPA-P1-S | Soft-start valve + 1 pressure switch + 1 coil | 1 DI + 1 DO | 8111882 |
| MPAL | MPAL pneumatic interface, 1-32 coils | 1 DO (packed) | 570783 |

**PLC code notes for MPA valve modules:**
- Valve coils are packed into a single output byte (USINT): each bit = one coil
- Suffix coding: S = shared power, G = galvanically isolated (getrennt), D = diagnostics, S = pressure switch
- `-S` with pressure switch: 1 input byte for pressure status, 7 coils (not 8)
- For 5/2-way double-solenoid valves: 2 adjacent bits control one valve (bit N = side A, bit N+1 = side B)
- For 5/3-way center-closed: set both bits to 0 for center position
- Diagnostics modules (-D): provide wire-break and short-circuit per coil via diagnostic channel

---

## 9. Pneumatic Valve Modules -- VTSA Series

VTSA modules control ISO plug-in valves (VSVA series). Support up to 32 coils.

| Module | Description | Coils | Features | Order No. |
|--------|-------------|-------|----------|-----------|
| VTSA | ISO plug-in valves, plastic/metal, 1-32 coils | 1-32 | Standard | 543416/550663 |
| VTSA-D | ISO plug-in valves, diagnostics, 1-32 coils | 1-32 | Extended diagnostics | 573613 |
| VTSA-CB | VSVA plug-in valves, plastic/metal, 1-24 coils | 1-24 | No voltage zones | 8082877/8082876 |
| VTSA-CB-Z | VSVA plug-in valves, 1-24 coils, 3 voltage zones | 1-24 | External voltage zones | 8082879/8082878 |
| VTSA-CB-IS | VSVA plug-in valves, metal, 1-24 coils, PROFIsafe | 1-24 | 3 safe zones (PROFIsafe) | 8068240 |
| VTSA-CB-IS-O | VSVA plug-in valves, 1-24 coils, PROFIsafe + safe output | 1-24 | 2 safe zones + 1 safe output | 8068241 |

**PLC code notes for VTSA:**
- Standard VTSA: 1x output byte (USINT packed), expandable via valve count config
- VTSA-CB variants: 1x input + 1x output for status/control
- VTSA-D: adds diagnostics input for coil monitoring
- IS variants support PROFIsafe for SIL-rated safety shutoff
- Coil numbering follows physical valve position on the manifold

---

## 10. Pneumatic Valve Modules -- VABF/VABV Series

Pneumatic extensions and manifold sub-bases for advanced valve configurations.

### VABF Series (Pneumatic Extensions)

| Module | Description | I/O | Order No. |
|--------|-------------|-----|-----------|
| VABF-CB | Extension for VSVA on VTSA-F-CB, 1-24 coils, Uval power | 1 in + 1 out (USINT) | 8104041/8104042 |
| VABF-CB1 | Extension for VSVA on VTSA-F-CB, 1-24 coils, separate zone power | 1 in + 1 out (USINT) | 8104043/8104044 |
| VABF-V2B1-CB | Vacuum generator with integrated pressure sensor | 6 in + 6 out (USINT) | 8067140-8088781 |

### VABV Series (Manifold Sub-bases)

| Module | Description | I/O | Order No. |
|--------|-------------|-----|-----------|
| VABV-1Q-CB | Soft-start valve sub-base with pressure switch | 1 in + 1 out (USINT) | 8068610 |
| VABV-1Q-CB1 | Soft-start valve sub-base, separate voltage zone | 1 in + 1 out (USINT) | 8068609 |
| VABV-2HS-T5 | 18mm pilot valve + pressure switch + 18mm solenoid valve | 1 in + 1 out (USINT) | 8068913 |
| VABV-12HS-T5 | 18mm pilot valve + pressure switch + 26mm solenoid valve | 1 in + 1 out (USINT) | 8068912 |

**PLC code notes for VABF/VABV:**
- VABF-V2B1-CB (vacuum generator): 6 input + 6 output USINT channels -- complex process data includes vacuum level, blow-off control, sensor data
- VABV soft-start modules: input reads pressure switch state, output controls soft-start/shut-off valve
- These modules appear as child devices on the valve terminal manifold

---

## 11. Proportional Pressure Regulators -- VPPM

VPPM modules are proportional pressure regulators integrated into the CPX/MPA valve terminal.

| Module | Description | Pressure Range | I/O | Order No. |
|--------|-------------|---------------|-----|-----------|
| VPPM (2 bar) | Proportional valve, 0-2 bar | 0-2 bar | 1 AI (UINT) + 1 AO (UINT) | 542217/542220 |
| VPPM (6 bar) | Proportional valve, 0-6 bar | 0-6 bar | 1 AI (UINT) + 1 AO (UINT) | 542218/542221 |
| VPPM (10 bar) | Proportional valve, 0-10 bar | 0-10 bar | 1 AI (UINT) + 1 AO (UINT) | 542219/542222 |
| VPPM Display (2 bar) | Proportional valve with display, 0-2 bar | 0-2 bar | 1 AI (UINT) + 1 AO (UINT) | 572407/572410 |
| VPPM Display (6 bar) | Proportional valve with display, 0-6 bar | 0-6 bar | 1 AI (UINT) + 1 AO (UINT) | 572408/572411 |
| VPPM Display (10 bar) | Proportional valve with display, 0-10 bar | 0-10 bar | 1 AI (UINT) + 1 AO (UINT) | 572409/572412 |
| VPPM empty | VPPM slot placeholder (not loaded) | -- | 1 AI (UINT) + 1 AO (UINT) | 559638 |

**PLC code notes for VPPM:**
- Output (setpoint): UINT 0-27648 maps to 0-max pressure (e.g., 0-6 bar)
- Input (actual value): UINT 0-27648 = measured pressure feedback
- Scaling formula: `pressure_bar = (raw_value / 27648.0) * max_pressure`
- Write setpoint to the output channel, read actual pressure from input channel
- "Display" variants have a local LCD but identical process data interface
- "empty" variant is used as a placeholder when no VPPM is physically installed

---

## 12. Festo Motion Terminal -- VTEM

The VTEM (Festo Motion Terminal) is a digitally controlled pneumatic valve terminal supporting up to 8 valves and 2 input modules. It is the most complex pneumatic module in the CPX family.

| Module | Description | I/O | Order No. |
|--------|-------------|-----|-----------|
| VTEM | Motion Terminal, up to 8 valves + 2 input modules | 48 inputs + 48 outputs (USINT) | 8047502 |

**Process data structure (48x USINT input + 48x USINT output):**

Each valve occupies 6 bytes of input and 6 bytes of output data:
- **Per-valve input (6 bytes):** Status word, actual pressure A, actual pressure B, diagnostics
- **Per-valve output (6 bytes):** Control word, setpoint pressure A, setpoint pressure B, mode

Total for 8 valves: 48 bytes input + 48 bytes output.

**PLC code notes for VTEM:**
- VTEM supports multiple motion apps per valve (proportional pressure, soft stop, model-based, etc.)
- Each valve position can be individually configured for different pneumatic functions
- Control via raw byte arrays -- interpret based on the configured Motion App
- This is the most data-intensive CPX module; careful process image offset management required
- Motion Apps are configured via the Festo Motion Terminal web interface, not CODESYS

---

## 13. Motion / Drive Interface Modules

These modules provide interfaces to Festo electric drives and axes.

| Module | Description | Protocol | I/O Channels | Data Type | Order No. |
|--------|-------------|----------|-------------|-----------|-----------|
| CMXX | Multi-axis interface for electric axes | CAN bus | 8 in + 8 out | USINT (per axis) | 555667 |
| CMAX-C1-1 | Single-axis controller | Direct | 8 in + 8 out | USINT (per param) | 548932 |
| CMPX-C-1 | Soft-stop module | Direct | 6 in + 6 out | USINT | 548931 |
| CM-HPP | FHPP gateway for electric drives | FHPP protocol | 32 in + 32 out | USINT (per axis byte) | 562214 |
| CMIX | Measured value evaluation module | Analog | 3 in (UINT) + 3 out (UINT) | UINT | 567417 |

**PLC code notes for Motion modules:**

### CMXX (Multi-Axis Interface)
- Controls up to 4 electric axes via CAN bus
- 8 USINT input bytes: axis status, position feedback, diagnostics
- 8 USINT output bytes: axis commands, target position, velocity setpoints
- Used with DNCI, CMMS, CMMP servo controllers

### CMAX-C1-1 (Axis Controller)
- Single integrated axis controller for Festo linear actuators
- 8 input + 8 output USINT bytes for position/force control
- Supports CODESYS SoftMotion via CEC-M1 controller

### CM-HPP (FHPP Gateway)
- Festo Handling and Positioning Profile gateway
- 32 input + 32 output bytes = massive data capacity for multi-axis coordination
- Each axis consumes a configurable number of bytes from the 32-byte pool
- Typical: 4 bytes per axis = up to 8 axes

### CMPX-C-1 (Soft-Stop Module)
- Provides controlled deceleration for pneumatic cylinders
- 6 input + 6 output channels for position monitoring and brake control

### CMIX (Measured Value Evaluation)
- Evaluates analog signals (force, pressure, displacement sensors)
- 3x UINT input = measured values, 3x UINT output = thresholds/config
- Used for quality monitoring in press-fit or crimping applications

---

## 14. Smart / Specialty Modules

| Module | Description | I/O | Order No. |
|--------|-------------|-----|-----------|
| CPI | CP-Interface for extended CP system | Config only | 526705 |
| CPA10/14 | Pneumatic interface for CPA10/CPA14 valves, 1-22 coils | 1 out (packed) | 195710/195712 |
| Type 03 | Pneumatic interface for Typ 03 Midi/Maxi valves, 1-26 coils | 1 out (packed) | 195738 |

---

## 15. Legacy / Misc Modules

| Module | Description | Notes |
|--------|-------------|-------|
| CPX_System variants | CPX/MPA terminal system definitions | 3 variants for different controller types |
| CPX_E_System variants | CPX-E system definitions | 11 variants for different protocol/EX combinations |

---

## 16. I/O Data Type Reference

Understanding data types is critical for correct PLC code generation.

| Data Type in XML | PLC Type | Size | Usage |
|-----------------|----------|------|-------|
| TBitFieldUSINT1 | USINT | 1 byte (1 bit used) | Single digital channel |
| TBitFieldUSINT4 | USINT | 1 byte (4 bits used) | 4 digital channels packed |
| TBitFieldUSINT8 | USINT | 1 byte (8 bits used) | 8 digital channels packed, or 1 axis byte |
| TBitFieldUINT16 | UINT | 2 bytes (16 bits used) | 16 digital channels packed, or 1 analog channel |
| TBitFieldUDINT24 | UDINT | 4 bytes (24 bits used) | Extended diagnostics |
| TBitFieldUDINT32 | UDINT | 4 bytes (32 bits used) | Counter value, extended data |
| std:USINT | USINT | 1 byte | Valve coil byte, status byte |
| std:UINT | UINT | 2 bytes | Analog value (0-27648) |
| std:UDINT | UDINT | 4 bytes | Counter value (32-bit) |

**Channel parameter ID convention:**
- ParameterId 1000-1099: Input channels (channel="input")
- ParameterId 1500-1599: Output channels (channel="output")

---

## 17. PLC Code Generation Notes

### Naming Convention in CODESYS Device Tree

The module name in CODESYS follows the devdesc `DeviceName` field prefixed with `CPX-` or `CPX-E-`:
- File `CPX_E-8DO.devdesc.xml` -> device name `CPX-E-8DO` in CODESYS
- File `CPX_MPA1G.devdesc.xml` -> device name `CPX-MPA1G` in CODESYS

### I/O Mapping Pattern

```
// Digital output example (8DO)
CPX_E_8DO.Output_0 : USINT;  // Bits 0-7 = channels 0-7
CPX_E_8DO.Output_0.Bit3 := TRUE;  // Activate channel 3

// Analog input example (4AI-U-I)
CPX_E_4AI_U_I.Input_0 : UINT;  // Channel 0, 0-27648
CPX_E_4AI_U_I.Input_1 : UINT;  // Channel 1, 0-27648

// Valve example (MPA1G - 8 coils)
CPX_MPA1G.Output_0 : USINT;  // Bits 0-7 = coils 0-7
CPX_MPA1G.Output_0.Bit0 := TRUE;  // Energize coil 0

// VPPM proportional valve example
CPX_VPPM_6bar.Output_0 := 13824;  // Set to 3.0 bar (50% of 6 bar range)
actualPressure := CPX_VPPM_6bar.Input_0;  // Read actual pressure
```

### Valve Coil Addressing for Double-Solenoid Valves

For MPA/VTSA 5/2-way double-solenoid valves, each valve uses 2 adjacent coil bits:

| Bit Pattern | Valve State |
|-------------|-------------|
| 00 | De-energized (spring return / center position) |
| 01 | Side A energized (position A) |
| 10 | Side B energized (position B) |
| 11 | Invalid (both solenoids -- avoid!) |

For single-solenoid 5/2-way valves: 1 bit per valve (0=spring return, 1=energized).

### Module Type ID

All modules share `DeviceType=33202` and connect via `interface="Festo.CPX"` with `role="child"`. The unique device ID is in the `<Id>` field (format: `103D XXXXXXX`).

### Maximum Module Count

- CPX (classic): Up to 16 I/O modules per station + valve terminals
- CPX-E: Up to 14 I/O modules per station on the backplane bus

---

*Generated from 160 device descriptor XML files in Festo+CPX-E-CEC library v3.5.20.96.*
