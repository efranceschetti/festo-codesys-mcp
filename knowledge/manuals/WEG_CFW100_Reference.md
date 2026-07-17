# WEG CFW100 Micro Inverter Reference

> Source: WEG CFW100 Manual de Programacao V4.1X (10008008404/03)
> Application: Motor speed control via analog reference from a PLC AO channel
> Control: Analog 4-20mA from Delta AS Series PLC AO channel

---

## Table of Contents

1. [Quick Setup for PLC Analog Control](#1-quick-setup-for-plc-analog-control)
2. [Parameter Reference - Monitoring (Read-Only)](#2-parameter-reference---monitoring-read-only)
3. [Parameter Reference - Configuration](#3-parameter-reference---configuration)
4. [Commands and Reference Source Selection](#4-commands-and-reference-source-selection)
5. [Analog Inputs (AI)](#5-analog-inputs-ai)
6. [Analog Outputs (AO)](#6-analog-outputs-ao)
7. [Digital Inputs (DI)](#7-digital-inputs-di)
8. [Digital Outputs (DO)](#8-digital-outputs-do)
9. [Motor Control](#9-motor-control)
10. [Ramps](#10-ramps)
11. [Faults and Alarms](#11-faults-and-alarms)
12. [Communication](#12-communication)
13. [Terminals and Wiring](#13-terminals-and-wiring)

---

## 1. Quick Setup for PLC Analog Control

For controlling CFW100 speed via PLC analog output (4-20mA on AI1/IOR terminal):

| Step | Parameter | Value | Description |
|------|-----------|-------|-------------|
| 1 | P202 | 0 | Control type: V/f (default, for most applications) |
| 2 | P220 | 0 | Source selection: Always Local |
| 3 | **P222** | **1** | **Reference source LOCAL = AI1 (analog input)** |
| 4 | P233 | 1 | AI1 signal type: 4-20mA |
| 5 | P232 | 1.000 | AI1 gain (default = 1.000) |
| 6 | P234 | 0.0% | AI1 offset (default = 0.0%) |
| 7 | P134 | 60.0 Hz | Maximum frequency (adjust per motor) |
| 8 | P263 | 1 | DI1 function: Gira/Para (Run/Stop from PLC DO) |

> **Key insight**: P222 selects the speed reference source. P222=0 is HMI (keypad), P222=1 is AI1 (analog input IOR terminal). This is the most common parameter users miss.

### Remote Mode (if using P220=1 Always Remote)

If the PLC controls both Run/Stop and speed remotely:

| Step | Parameter | Value | Description |
|------|-----------|-------|-------------|
| 1 | P220 | 1 | Source selection: Always Remote |
| 2 | P222 | 1 | Reference source REMOTE = AI1 |
| 3 | P226 | 4 | Run command REMOTE: via DIx |
| 4 | P233 | 1 | AI1 signal type: 4-20mA |

---

## 2. Parameter Reference - Monitoring (Read-Only)

| Param | Description | Range | Notes |
|-------|-------------|-------|-------|
| P000 | Parameter access | 0-9999 | Password if active |
| P001 | Speed reference | 0-9999 | |
| P002 | Motor output speed | 0-9999 | |
| P003 | Motor current | 0.0-10.0 A | |
| P004 | DC link voltage | 0-524 V | |
| P005 | Motor output frequency | 0.0-400.0 Hz | |
| P006 | Inverter state | 0-8 | 0=Ready, 1=Run, 2=Undervolt, 3=Fault, 4=Autotune, 5=Config, 6=DC brake, 8=Fire Mode |
| P007 | Output voltage | 0-240 V | |
| P009 | Motor torque | -200.0-200.0% | VVW only |
| P011 | Power factor | 0.00-1.00 | |
| P012 | DI state (DI8..DI1) | 0-FF hex | Bit 0=DI1, Bit 1=DI2, ..., Bit 7=DI8 |
| P013 | DO state (DO3..DO1) | 0-7 hex | Bit 0=DO1, Bit 1=DO2, Bit 2=DO3 |
| P014 | AO1 value | 0.0-100.0% | |
| P018 | AI1 value | -100.0-100.0% | |
| P020 | Potentiometer value | -100.0-100.0% | |
| P022 | FI frequency | 0-3000 Hz | |
| P023 | Main SW version | 0.00-99.99 | |
| P030 | Module temperature | -200.0-200.0 C | |
| P037 | Motor overload Ixt | 0.0-100.0% | |
| P042 | Time enabled | 0.0-999.9 | |
| P047 | Config state | 0-33 | See Table 11.3 |
| P048 | Current alarm | 0-999 | |
| P049 | Current fault | 0-999 | |
| P050 | Last fault | 0-999 | |
| P051 | Current at last fault | 0.0-10.0 A | |
| P052 | DC link at last fault | 0-524 V | |
| P053 | Frequency at last fault | 0.0-400.0 Hz | |
| P054 | Temp at last fault | 0.0-200.0 C | |
| P060 | Second fault | 0-999 | |
| P070 | Third fault | 0-999 | |

---

## 3. Parameter Reference - Configuration

### 3.1 Ramps

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P100 | Acceleration time | 0.1-999.9 s | 5.0 s |
| P101 | Deceleration time | 0.1-999.9 s | 10.0 s |
| P102 | 2nd ramp acceleration | 0.1-999.9 s | 5.0 s |
| P103 | 2nd ramp deceleration | 0.1-999.9 s | 10.0 s |
| P104 | S-curve ramp | 0=Inactive, 1=Active | 0 |
| P105 | 1st/2nd ramp select | 0=1st, 1=2nd, 2=DIx, 3=Serial, 5=CO/DN, 6=SoftPLC | 0 |
| P106 | Emergency accel time | 0.1-999.9 s | 5.0 s |
| P107 | Emergency decel time | 0.1-999.9 s | 5.0 s |

### 3.2 Speed Reference

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P120 | Speed ref backup | 0=Inactive, 1=Active, 2=Backup via P121 | 1 |
| P121 | HMI reference | 0.0-400.0 Hz | 3.0 Hz |
| P122 | JOG reference | -400.0-400.0 Hz | 5.0 Hz |
| P124-P131 | Multispeed 1-8 | -400.0-400.0 Hz | Various |
| P133 | Minimum frequency | 0.0-400.0 Hz | 3.0 Hz |
| P134 | Maximum frequency | 0.0-400.0 Hz | 66.0/55.0 Hz |

### 3.3 Control Mode

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P200 | Password | 0=Inactive, 1=Active, 2-9999=New | 0 |
| P202 | Control type | 0=V/f, 1=V/f Quadratic, 5=VVW | 0 |
| P204 | Load/Save params | 5=Load 60Hz, 6=Load 50Hz, 7=Load User, 9=Save User | 0 |

### 3.4 Display

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P205 | Main display param | 0-999 | 2 |
| P207 | Bar graph param | 0-999 | 3 |
| P208 | Reference scale factor | 1-9999 | 600 |
| P209 | Reference unit | 0-1=None, 2=V, 3=Hz, 5=%, 7=rpm | 3 |
| P210 | Reference display format | 0=wxyz, 1=wxy.z, 2=wx.yz, 3=w.xyz | 1 |

### 3.5 Source Selection (CRITICAL)

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| **P220** | **LOC/REM source** | **0=Always Local, 1=Always Remote, 4=DIx, 5=Serial/USB(LOC), 6=Serial/USB(REM), 9=CO/DN(LOC), 10=CO/DN(REM), 11=SoftPLC** | **0** |
| **P221** | **Reference source LOCAL** | **0=HMI, 1=AI1, 3=Potentiometer, 4=FI, 7=E.P., 8=Multispeed, 9=Serial/USB, 11=CO/DN, 12=SoftPLC, 14=AI1>0, 16=Pot>0, 17=FI>0** | **0** |
| **P222** | **Reference source REMOTE** | **Same options as P221** | **2** |
| P223 | Direction LOC | 0=CW, 1=CCW, 4=DIx, 5=Serial(CW), 6=Serial(CCW), 9=CO/DN(CW), 10=CO/DN(CCW), 12=SoftPLC | 0 |
| P224 | Run/Stop LOC | 0=HMI keys, 1=DIx, 2=Serial/USB, 4=CO/DN, 5=SoftPLC | 0 |
| P225 | JOG LOC | 0=Inactive, 2=DIx, 3=Serial, 5=CO/DN, 6=SoftPLC | 1 |
| P226 | Direction REM | Same as P223 | 4 |
| P227 | Run/Stop REM | Same as P224 | 1 |
| P228 | JOG REM | Same as P225 | 2 |
| P229 | Stop mode | 0=By ramp, 1=By inertia | 0 |

> **P221 vs P222**: P221 controls the reference source when in LOCAL mode. P222 controls when in REMOTE mode. Which mode is active depends on P220. If P220=0 (Always Local), then P221 is used. If P220=1 (Always Remote), then P222 is used.

---

## 4. Commands and Reference Source Selection

### How Source Selection Works

```
P220 (LOC/REM select)
  |
  ├── LOCAL mode (P220=0 or selected via DIx)
  |     ├── P221 = Speed reference source (HMI, AI1, Pot, Multispeed...)
  |     ├── P223 = Direction control (keypad, DIx, serial...)
  |     ├── P224 = Run/Stop control (keypad, DIx, serial...)
  |     └── P225 = JOG source
  |
  └── REMOTE mode (P220=1 or selected via DIx)
        ├── P222 = Speed reference source (HMI, AI1, Pot, Multispeed...)
        ├── P226 = Direction control
        ├── P227 = Run/Stop control
        └── P228 = JOG source
```

### Reference Source Options (P221/P222)

| Value | Source | Description |
|-------|--------|-------------|
| 0 | HMI | Keypad (P121 value) |
| **1** | **AI1** | **Analog input 1 (IOR terminal) - most common for PLC control** |
| 3 | Potentiometer | Built-in potentiometer or external via connector |
| 4 | FI | Frequency input |
| 7 | E.P. | Electronic potentiometer (Up/Down via DI) |
| 8 | Multispeed | 2/4/8 fixed speeds via DI combinations |
| 9 | Serial/USB | Via Modbus RTU communication |
| 11 | CO/DN | Via CANopen/DeviceNet |
| 12 | SoftPLC | Internal SoftPLC application |
| 14 | AI1 > 0 | AI1 only positive direction |
| 16 | Pot > 0 | Potentiometer only positive direction |
| 17 | FI > 0 | Frequency input only positive direction |

---

## 5. Analog Inputs (AI)

### AI1 Configuration

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P231 | AI1 signal function | 0=Speed ref, 4=PTC, 7=SoftPLC, 8-15=App functions, 16=PID setpoint, 17=PID process var | 0 |
| P232 | AI1 gain | 0.000-9.999 | 1.000 |
| **P233** | **AI1 signal type** | **0=0-10V/0-20mA, 1=4-20mA, 2=10V-0/20-0mA (inverse), 3=20-4mA (inverse)** | **0** |
| P234 | AI1 offset | -100.0-100.0% | 0.0% |
| P235 | AI1 filter | 0.00-16.00 s | 0.00 s |
| P230 | Dead zone (AI and FI) | 0=Inactive, 1=Active | 0 |

> **IMPORTANT for 4-20mA**: Set P233=1. If left at P233=0 (default), the drive expects 0-10V or 0-20mA and the 4mA minimum will map to ~20% speed instead of 0%.

> **Wire break detection**: When P233=1 (4-20mA), if the signal drops below 2mA the alarm A163 is triggered (AI1 4-20mA signal loss). This provides fail-safe wire break detection.

### Potentiometer Configuration

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P241 | Potentiometer function | 0=Speed ref, 7=SoftPLC, 8-15=App functions | 0 |
| P242 | Potentiometer gain | 0.000-9.999 | 1.000 |
| P244 | Potentiometer offset | -100.0-100.0% | 0.0% |
| P245 | Pot/FI filter | 0.00-16.00 s | 0.00 s |

### Frequency Input (FI)

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P246 | FI function | 0=Inactive, 1=Active in DI1, 2=DI2, 3=DI3, 4=DI4 | 0 |
| P247 | FI gain | 0.000-9.999 | 1.000 |
| P248 | FI min frequency | 1-3000 Hz | 100 Hz |
| P249 | FI offset | -100.0-100.0% | 0.0% |
| P250 | FI max frequency | 1-3000 Hz | 1000 Hz |

---

## 6. Analog Outputs (AO)

### AO1 Configuration

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P251 | AO1 function | 0=Speed ref, 2=Actual speed, 5=Output current, 7=Active current, 11=Motor torque, 12=SoftPLC, 16=Ixt motor, 21-28=App functions, 29=PID setpoint, 30=PID process var | 2 |
| P252 | AO1 gain | 0.000-9.999 | 1.000 |
| P253 | AO1 signal type | 0=0-10V, 1=0-20mA, 2=4-20mA, 3=10-0V, 4=20-0mA, 5=20-4mA | 0 |

---

## 7. Digital Inputs (DI)

### DI Configuration Parameters

| Param | Description | Default |
|-------|-------------|---------|
| P263 | DI1 function | 1 (Gira/Para = Run/Stop) |
| P264 | DI2 function | 8 (Sentido Giro = Direction) |
| P265 | DI3 function | 0 (Sem funcao) |
| P266 | DI4 function | 0 (Sem funcao) |
| P267 | DI5 function (expansion) | 0 |
| P268 | DI6 function (expansion) | 0 |
| P269 | DI7 function (expansion) | 0 |
| P270 | DI8 function (expansion) | 0 |
| P271 | DI signal logic | 0=(DI1-8)NPN, 1=(DI1-4)PNP, 2=(DI5-8)PNP, 3=(DI1-8)PNP |

### DI Function Options

| Value | Function | Description |
|-------|----------|-------------|
| 0 | Sem Funcao | Disabled |
| 1 | Gira/Para | Run/Stop (toggle) |
| 2 | Habilita Geral | General enable (must be ON to run) |
| 3 | Parada Rapida | Quick stop |
| 4 | Avanco | Forward |
| 5 | Retorno | Reverse |
| 6 | Start | Start command |
| 7 | Stop | Stop command |
| 8 | Sentido Giro | Direction (CW/CCW) |
| 9 | LOC/REM | Local/Remote select |
| 10 | JOG | Jog command |
| 11 | Acelera E.P. | Electronic pot accelerate |
| 12 | Desacelera E.P. | Electronic pot decelerate |
| 13 | Multispeed | Multispeed bit |
| 14 | 2a Rampa | Select 2nd ramp |
| 18 | Sem Alarme Ext | External alarm (NC, normally closed) |
| 19 | Sem Falha Ext | External fault (NC, normally closed) |
| 20 | Reset | Fault reset |
| 24 | Desab. FlyStart | Disable flying start |
| 26 | Bloqueia Prog. | Lock programming |
| 32 | Multispeed 2a Rampa | Multispeed + 2nd ramp |
| 39 | Parar | Stop |
| 40 | Chave de Seg. | Safety switch |
| 49 | Habilitar Fire Mode | Enable fire mode |
| 55 | Gira/Para c/ Bloqueio | Run/Stop with power-on lock |
| 56 | Avanco c/ Bloqueio | Forward with power-on lock |
| 57 | Retorno c/ Bloqueio | Reverse with power-on lock |

---

## 8. Digital Outputs (DO)

### DO Configuration Parameters

| Param | Description | Default |
|-------|-------------|---------|
| P275 | DO1 function | 13 (Sem Falha = No Fault, NC) |
| P276 | DO2 function | 0 (Sem Funcao) |
| P277 | DO3 function | 0 (Sem Funcao) |

### DO Function Options

| Value | Function | Description |
|-------|----------|-------------|
| 0 | Sem Funcao | Disabled |
| 1 | F* >= Fx | Output freq reference >= Fx threshold |
| 2 | F >= Fx | Output freq >= Fx |
| 3 | F <= Fx | Output freq <= Fx |
| 4 | F = F* | Output freq = Reference |
| 6 | Is > Ix | Output current > Ix |
| 7 | Is < Ix | Output current < Ix |
| 8 | Torque > Tx | Motor torque > Tx |
| 9 | Torque < Tx | Motor torque < Tx |
| 10 | Remoto | Remote mode active |
| 11 | Run | Drive is running |
| 12 | Ready | Drive is ready |
| **13** | **Sem Falha** | **No fault active (NC logic - opens on fault, FAIL-SAFE)** |
| 14 | Sem F070 | No overcurrent fault |
| 16 | Sem F021/F022 | No under/overvoltage fault |
| 18 | Sem F072 | No motor overload |
| 19 | 4-20 mA OK | AI1 4-20mA signal valid |
| 21 | Sent. Horario | CW direction |
| 24 | Ride-Through | Ride-through active |
| 25 | Pre-Carga OK | Pre-charge complete |
| 26 | Com Falha | Has fault (NO logic) |
| 28 | SoftPLC | Controlled by SoftPLC |
| 35 | Sem Alarme | No alarm active |
| 36 | Sem Falha/Alarme | No fault and no alarm |
| 45 | Fire Mode ON | Fire mode active |

### DO Threshold Parameters

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P281 | Frequency Fx | 0.0-400.0 Hz | 3.0 Hz |
| P282 | Hysteresis Fx | 0.0-15.0 Hz | 0.5 Hz |
| P290 | Current Ix | 0.0-10.0 A | 1.0 x Inom |
| P293 | Torque Tx | 0-200% | 100% |

---

## 9. Motor Control

### Motor Nameplate Parameters

| Param | Description | Range | Default | Mode |
|-------|-------------|-------|---------|------|
| P295 | Inverter nominal current | 1.6-7.3 A | Per model | ro |
| P296 | Nominal line voltage | 1=110-127V, 2=200-240V | Per model | ro |
| P400 | Motor nominal voltage | 0-240 V | 220 V | cfg, VVW |
| P401 | Motor nominal current | 0.0-10.0 A | 1.0 x Inom | cfg, VVW |
| P402 | Motor nominal speed | 0-24000 rpm | 1720 rpm | cfg, VVW |
| P403 | Motor nominal frequency | 0-400 Hz | 60 Hz | cfg, VVW |
| P404 | Motor nominal power | 0-5 (0.12-0.75kW) | Per model | cfg, VVW |
| P407 | Motor power factor | 0.50-0.99 | Per model | cfg, VVW |
| P408 | Auto-tune | 0=No, 1=Yes | 0 | cfg, VVW |
| P409 | Stator resistance | 0.01-99.99 ohm | Per model | cfg, VVW |

### V/f Curve Parameters

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P135 | Maximum output current | 0.0-40.0 A | 1.5 x Inom |
| P136 | Manual torque boost | 0.0-30.0% | Per model |
| P137 | Auto torque boost | 0.0-30.0% | 0.0% |
| P138 | Slip compensation | -10.0-10.0% | 0.0% |
| P142 | Max output voltage | 0.0-100.0% | 100.0% |
| P143 | Intermediate voltage | 0.0-100.0% | 50.0% |
| P145 | Field weakening start freq | 0.0-400.0 Hz | 60.0/50.0 Hz |
| P146 | Intermediate frequency | 0.0-400.0 Hz | 30.0/25.0 Hz |
| P178 | Nominal flux (VVW) | 50.0-150.0% | 100.0% |

### Switching and Regulation

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P149 | DC link comp mode | 0=Inactive, 1=Normal, 2=Overmodulation, 3=Extended | 0 |
| P150 | Ud/LC regulation type | 0-3 (hold/accel Ud, hold/decel LC) | 0 |
| P151 | DC link regulation level | 325-460 V | 430/380 V |
| P219 | Switching freq reduction | 0.0-15.0 Hz | 5.0 Hz |
| P297 | Switching frequency | 2.5-15.0 kHz | 5.0 kHz |

### DC Braking

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P299 | DC brake at start time | 0.0-15.0 s | 0.0 s |
| P300 | DC brake at stop time | 0.0-15.0 s | 0.0 s |
| P301 | DC brake start frequency | 0.0-15.0 Hz | 3.0 Hz |
| P302 | DC brake current | 0.0-100.0% | 20.0% |

### Avoided Frequencies

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P303 | Avoided frequency 1 | 0.0-400.0 Hz | 0.0 Hz |
| P304 | Avoided frequency 2 | 0.0-400.0 Hz | 0.0 Hz |
| P306 | Avoided range | 0.0-25.0 Hz | 0.0 Hz |

### Flying Start / Ride-Through

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P320 | FS/RT mode | 0=Inactive, 1=Flying Start, 2=FS+RT, 3=Ride-Through | 0 |
| P331 | FS/RT voltage ramp | 0.2-60.0 s | 2.0 s |
| P332 | Dead time | 0.1-10.0 s | 1.0 s |

---

## 10. Ramps

### Acceleration / Deceleration

The CFW100 uses linear ramps by default, with optional S-curve (P104=1).

- **P100**: Acceleration time (0 to max freq). Default 5.0s
- **P101**: Deceleration time (max freq to 0). Default 10.0s
- **P102/P103**: 2nd ramp accel/decel (selected by P105 or DIx)
- **P106/P107**: Emergency ramp (for quick stop DI function)

### S-Curve Ramp

When P104=1, transitions are smoothed using S-curve profiles. This reduces mechanical shock but increases total transition time.

---

## 11. Faults and Alarms

### Fault History

| Param | Description |
|-------|-------------|
| P050 | Last fault code |
| P051 | Current at last fault |
| P052 | DC link voltage at last fault |
| P053 | Frequency at last fault |
| P054 | Temperature at last fault |
| P060 | Second fault code |
| P070 | Third fault code |

### Fault Control

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P340 | Auto-reset time | 0-255 s | 0 s |

### Complete Fault/Alarm Table

| Code | Name | Description | Probable Causes |
|------|------|-------------|-----------------|
| **F021** | **DC Link Undervoltage** | DC bus voltage too low | Wrong supply voltage, power loss, P296 mismatch |
| **F022** | **DC Link Overvoltage** | DC bus voltage too high | Supply too high, high inertia load with fast decel, P151 too high |
| F031 | Expansion IO Comm Fault | Main board can't communicate with IO expansion | Accessory not seated, defective |
| F033 | VVW Adjust Fault | Stator resistance auto-tune failed | Motor not connected, wrong P401 |
| **A046** | **Motor Overload** | Motor Ixt overload alarm | Excessive load, undersized motor |
| A050 | IGBT Overtemp Alarm | Power module temperature high | Ambient too hot, fan blocked, overload |
| **F051** | **IGBT Overtemp Fault** | Power module temperature too high | Same as A050 but more severe |
| **F070** | **Overcurrent/Short** | Output overcurrent or short circuit | Short in motor cables, motor insulation failure, cable too long, high inertia with fast accel |
| **F072** | **Motor Overload** | Motor Ixt protection tripped | Excessive load, undersized motor, wrong P401 |
| F078 | Motor Overtemp | Motor PTC sensor tripped | Motor overheated, check ventilation |
| F079 | Encoder Signal Fault | Missing encoder signals | Wiring, encoder defective |
| F080 | CPU Watchdog | Internal CPU failure | Electrical noise, firmware issue |
| F081 | User Memory Full | Cannot save more than 32 changed params | Reduce number of modified params |
| F084 | Self-Diagnosis Fault | Hardware identification failed | Bad connections, HW/FW incompatible |
| **A090** | **External Alarm** | External alarm via DIx (NC function 18) | DI wiring open or bad contact |
| **F091** | **External Fault** | External fault via DIx (NC function 19) | DI wiring open or bad contact |
| A128 | Serial Timeout | No valid telegrams received within P314 time | Serial cable disconnected, master stopped |
| **A163** | **AI1 4-20mA Signal** | AI1 signal below 2mA (when P233=1) | Wire break, transmitter fault, wrong P233 |
| A177 | Fan Replacement | Fan hours > 50000 | Replace cooling fan |
| F228 | Serial Comm Fault | Communication timeout causing fault | P313 set to cause fault on comm error |
| A700 | Remote HMI Comm | No communication with remote HMI | HMI cable, accessory |
| F701 | Remote HMI Fault | No HMI comm but HMI is command/ref source | HMI cable disconnected |

### Protection Parameters

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P156 | Overload current (nom speed) | 0.1-40.0 A | 1.2 x Inom |
| P157 | Overload current (50%) | 0.1-40.0 A | 1.2 x Inom |
| P158 | Overload current (20%) | 0.1-40.0 A | 1.2 x Inom |
| P352 | Fan control | 0=OFF, 1=ON, 2=CT (temp controlled) | 2 |

---

## 12. Communication

### Serial (Modbus RTU)

| Param | Description | Range | Default |
|-------|-------------|-------|---------|
| P308 | Serial address | 1-247 | 1 |
| P310 | Baud rate | 0=9600, 1=19200, 2=38400, 3=57600, 4=76800 | 1 (19200) |
| P311 | Byte config | 0=8N1, 1=8E1, 2=8O1, 3=8N2, 4=8E2, 5=8O2 | 0 (8N1) |
| P312 | Serial protocol | 2=Modbus RTU Slave, 3=BACnet, 5=Modbus RTU Master | 2 |
| P313 | Comm error action | 0=Inactive, 1=Ramp stop, 2=Disable, 3=Go to LOC, 4=LOC keep enabled, 5=Cause fault | 1 |
| P314 | Serial watchdog | 0.0-999.0 s | 0.0 s |

### Communication Control Words

| Param | Description |
|-------|-------------|
| P680 | Logic state word (read-only): Bit1=Run cmd, Bit7=Alarm, Bit8=Running, Bit9=Enabled, Bit10=CW, Bit11=JOG, Bit12=Remote, Bit13=Undervolt, Bit15=Fault |
| P681 | Speed 13-bit (read-only) |
| P682 | Serial/USB control word: Bit0=Enable ramp, Bit1=General enable, Bit2=Run CW, Bit3=JOG, Bit4=Remote, Bit5=2nd ramp, Bit7=Fault reset |
| P683 | Serial/USB speed reference |

---

## 13. Terminals and Wiring

### CFW100 Standard Terminals

| Terminal | Function | Description |
|----------|----------|-------------|
| R/L1, S/L2 | Power input | AC supply (110V or 220V models) |
| U, V, W | Motor output | 3-phase motor connection |
| +V | +10V supply | For potentiometer (10V, 10mA max) |
| IOR | AI1 input | Analog input: 0-10V or 0/4-20mA (configurable via P233) |
| GND | AI/AO ground | Reference for analog signals |
| AO1 | Analog output | 0-10V or 0/4-20mA (configurable via P253) |
| DI1 | Digital input 1 | Default: Run/Stop (P263) |
| DI2 | Digital input 2 | Default: Direction (P264) |
| DI3 | Digital input 3 | Configurable (P265) |
| DI4 | Digital input 4 | Configurable (P266) |
| COM | DI common | Common for digital inputs (NPN/PNP via P271) |
| DO1 | Digital output (relay) | NO/NC relay contact, default: No Fault (P275=13) |
| RA | DO1 relay COM | Relay common |
| RC | DO1 relay NC | Relay normally closed |

> **IOR terminal**: This is where the PLC 4-20mA signal connects. The terminal accepts both voltage (0-10V) and current (0-20mA or 4-20mA) signals. The signal type is selected by P233.

### Expansion Module Terminals (CFW100-IOA/IOD)

When expansion modules are installed:
- DI5-DI8: Additional digital inputs
- DO2, DO3: Additional digital outputs
- Additional AI/AO depending on module type

### NPN vs PNP (P271)

| P271 | DI1-DI4 | DI5-DI8 |
|------|---------|---------|
| 0 | NPN (sink) | NPN (sink) |
| 1 | PNP (source) | NPN (sink) |
| 2 | NPN (sink) | PNP (source) |
| 3 | PNP (source) | PNP (source) |

- **NPN (sink)**: DI activates when connected to GND (0V). COM connects to +24V.
- **PNP (source)**: DI activates when connected to +24V. COM connects to GND (0V).

---

## Application Notes

### Typical PLC-Controlled Setup

For a Delta AS Series PLC controlling spin motor speed via analog output:

1. **PLC AO** (4-20mA) connects to CFW100 **IOR** terminal
2. **PLC DO** connects to CFW100 **DI1** for Run/Stop
3. **PLC DI** connects to CFW100 **DO1** for fault monitoring (NC = fail-safe)

```
PLC AO1 (4-20mA) ──→ CFW100 IOR
PLC AO1 GND      ──→ CFW100 GND
PLC Y output      ──→ CFW100 DI1 (Run/Stop)
PLC COM           ──→ CFW100 COM
CFW100 DO1 (RA)   ──→ PLC X input (fault)
CFW100 DO1 (RC)   ──→ PLC COM (NC contact)
```

### Fire Mode (P580)

Fire Mode allows the drive to continue operating even during fault conditions (for emergency ventilation systems). When enabled, faults are auto-reset and the drive tries to keep running. **Not recommended for general use.**

### Factory Reset

To restore factory defaults:
- P204 = 5 (Load 60Hz defaults)
- P204 = 6 (Load 50Hz defaults)
