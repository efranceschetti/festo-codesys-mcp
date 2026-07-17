# Festo CPX-E-EC CoE Object Dictionary Reference

Source: EtherCAT Slave Information (ESI) file `Festo-CPX-E-EC-20181211.xml`
Vendor: Festo AG & Co. KG (Vendor ID `0x001D`)
ESI Version: 1.4 | Date: 2018-12-11

---

## 1. Device Overview

The CPX-E-EC is a modular EtherCAT fieldbus coupler supporting up to 48 I/O modules. It uses the EtherCAT modular device profile (MDP) with slot-based module addressing.

| Property | Value |
|---|---|
| Product Code | `4080498` (`0x003E3F52`) |
| Vendor ID | `0x001D` |
| Revision 1 | `0x00000001` |
| Revision 2 | `0x00000002` |
| Max Modules | 48 |
| Module Index Distance | 1 (slot-based: `0x80nn`, `0x90nn`) |
| Supported DC Modes | Free Run (`0x0000`), DC Sync (`0x0300`) |
| Min Cycle Time | 500 us (`0x0007A120` ns) |

### Revision Differences

| Feature | Rev 1 | Rev 2 |
|---|---|---|
| Timestamp Object `0x10F8` | No | Yes (ULINT, 64-bit) |
| Timestamp TxPDO `0x1A42` | No | Yes |

---

## 2. Module Catalog

All modules plug into the 48 available slots. Each module occupies one slot and gets CoE objects at slot-relative offsets (`0x2000+slot`, `0x6000+slot`, `0x7000+slot`, `0x9000+slot`).

### 2.1 Bus Node Modules (CPX-E-EC Variants)

| Type String | ModuleIdent | Description |
|---|---|---|
| `E-EC` | `0xDE250000` | EtherCAT Module (no I/O) |
| `E-EC [Status]` | `0xDE250002` | EtherCAT Module with 8 status bits (TxPDO) |
| `E-EC [STI]` | `0xDE250202` | EtherCAT Module with 16-bit system diagnostics (TxPDO + RxPDO) |

### 2.2 Digital I/O Modules

| Type String | ModuleIdent | Description | I/O Size |
|---|---|---|---|
| `E-8DO [8DO]` | `0x1F000800` | 8-ch digital output, 24VDC, 0.5A, PNP | 8-bit out |
| `E-8DO-P [8DO]` | `0x22000800` | 8-ch digital output, 24VDC, 0.5A, PNP (P variant) | 8-bit out |
| `E-16DI [16DI]` | `0x1D000010` | 16-ch digital input, 24VDC, PNP | 16-bit in |
| `E-16DI-P [16DI]` | `0x21000010` | 16-ch digital input, 24VDC, PNP (P variant) | 16-bit in |

### 2.3 Analog Modules

| Type String | ModuleIdent | Description | I/O Size |
|---|---|---|---|
| `E-4AI-U-I [4AI]` | `0x8E010008` | 4-ch analog input, 16-bit, current/voltage | 4x INT16 in (8 bytes) |
| `E-4AO-U-I [4AO]` | `0x8E020800` | 4-ch analog output, 16-bit, current/voltage | 4x INT16 out (8 bytes) |

### 2.4 IO-Link Master Modules

| Type String | ModuleIdent | Channels | I/O Size per Module |
|---|---|---|---|
| `E-1IOL - 32B I/32B O` | `0xAE012020` | 1 port | 32 bytes in / 32 bytes out |
| `E-2IOL - 32B I/32B O` | `0xAE022020` | 2 ports | 32 bytes in / 32 bytes out |
| `E-4IOL - 8B I/8B O` | `0xAE040808` | 4 ports | 8 bytes in / 8 bytes out |
| `E-4IOL - 16B I/16B O` | `0xAE041010` | 4 ports | 16 bytes in / 16 bytes out |
| `E-4IOL - 32B I/32B O` | `0xAE042020` | 4 ports | 32 bytes in / 32 bytes out |
| `E-1IOL-P - 32B I/32B O` | `0xAE652020` | 1 port (P variant) | 32 bytes in / 32 bytes out |
| `E-2IOL-P - 32B I/32B O` | `0xAE662020` | 2 ports (P variant) | 32 bytes in / 32 bytes out |
| `E-4IOL-P - 8B I/8B O` | `0xAE680808` | 4 ports (P variant) | 8 bytes in / 8 bytes out |
| `E-4IOL-P - 16B I/16B O` | `0xAE681010` | 4 ports (P variant) | 16 bytes in / 16 bytes out |
| `E-4IOL-P - 32B I/32B O` | `0xAE682020` | 4 ports (P variant) | 32 bytes in / 32 bytes out |

### 2.5 Technology Modules

| Type String | ModuleIdent | Description | I/O Size |
|---|---|---|---|
| `E-1CI` | `0xAE0A020C` | Counter module with latch and speed measurement | 12 bytes in / 2 bytes out |

---

## 3. Head Station (CPX-E-EC) SDO Objects

These objects exist once in the head station, independent of plugged modules.

### 3.1 Standard EtherCAT Objects

| Index | Name | Type | Size | Access | Default |
|---|---|---|---|---|---|
| `0x1000` | Device Type | UDINT | 32-bit | ro | `0x04561389` |
| `0x1001` | Error Register | USINT | 8-bit | ro | `0x00` |
| `0x1008` | Device Name | STRING(9) | 72-bit | ro | `CPX-E-EC` |
| `0x1009` | Hardware Version | STRING(6) | 48-bit | ro | `V0516` |
| `0x100A` | Software Version | STRING(4) | 32-bit | ro | `R1` |
| `0x10F8` | Timestamp Object | ULINT | 64-bit | rw | -- (Rev 2 only) |

### 3.2 Identity Object `0x1018`

| SubIdx | Name | Type | Access | Default |
|---|---|---|---|---|
| 0 | Number of elements | USINT | ro | 4 |
| 1 | Vendor Id | UDINT | ro | `0x0000001D` |
| 2 | Product Code | UDINT | ro | `0x0029BF59` |
| 3 | Revision Number | UDINT | ro | `0x00000001` |
| 4 | Serial Number | UDINT | ro | `0x00000000` |

### 3.3 Diagnosis History `0x10F3`

| SubIdx | Name | Type | Access | PDO | Default |
|---|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | ro | -- | 5 |
| 1 | Maximum Messages | USINT | ro | -- | 20 (`0x14`) |
| 2 | Newest Message | USINT | ro | -- | 0 |
| 3 | Newest Acknowledged Message | USINT | rw | -- | 0 |
| 4 | New Messages Available | BOOL | ro | TxPDO | 0 |
| 5 | Flags | UINT | rw | -- | `0x0001` |

### 3.4 Sync Manager Type `0x1C00`

| SubIdx | Name | Type | Value |
|---|---|---|---|
| 0 | Number of entries | USINT | 4 |
| 1 | SM0 Type | USINT | 1 (Mailbox Out) |
| 2 | SM1 Type | USINT | 2 (Mailbox In) |
| 3 | SM2 Type | USINT | 3 (Process Data Out) |
| 4 | SM3 Type | USINT | 4 (Process Data In) |

### 3.5 SM Output Parameter `0x1C32`

| SubIdx | Name | Type | Access | Default |
|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | ro | 32 (`0x20`) |
| 1 | Sync mode | UINT | rw (PreOP) | `0x0001` |
| 2 | Cycle time | UDINT | ro | 1000000 ns (1 ms) |
| 4 | Sync modes supported | UINT | ro | `0x1F40` |
| 5 | Minimum cycle time | UDINT | ro | 500000 ns (500 us) |
| 6 | Calc and copy time | UDINT | ro | 0 |
| 8 | Get Cycle Time | UINT | rw | 0 |
| 9 | Delay time | UDINT | ro | 0 |
| 10 | Sync0 Cycle Time | UDINT | rw | 0 |
| 11 | SM event missed counter | UINT | ro | 0 |
| 12 | Cycle Time Too Small | UINT | ro | 0 |
| 32 | Sync error | BOOL | ro | 0 |

### 3.6 SM Input Parameter `0x1C33`

Same structure as `0x1C32` (uses same data type `DT1C32`).

### 3.7 Global CPX Parameter `0x2400`

| SubIdx | Name | Type | Access | Default | Description |
|---|---|---|---|---|---|
| 0 | Number of elements | USINT | ro | 8 | -- |
| 1 | Filter Alarm Vout/Vven | BOOL | rw | 0 | Filter voltage alarms |
| 2 | Monitor SCS | BOOL | rw | 1 | Monitor sensor supply short circuit |
| 3 | Monitor SCO | BOOL | rw | 1 | Monitor output short circuit |
| 4 | Monitor Vout | BOOL | rw | 1 | Monitor output voltage |
| 5 | Monitor Vven | BOOL | rw | 1 | Monitor valve voltage |
| 6 | Monitor SCV | BOOL | rw | 1 | Monitor valve short circuit |
| 7 | Fail safe | ENUM (USINT) | rw | 0 | See Failsafe Enum |
| 8 | System start | ENUM (USINT) | rw | 0 | See System Start Enum |

**Failsafe Enum (`0x2400:07`):**

| Value | Meaning |
|---|---|
| 0 | Reset all outputs |
| 1 | Hold last state |
| 2 | Assume fault mode |

**System Start Enum (`0x2400:08`):**

| Value | Meaning |
|---|---|
| 0 | Default parameters |
| 1 | Saved parameters |

### 3.8 CPX Diagnosis Parameter `0x2401`

| SubIdx | Name | Type | Access | Default | Description |
|---|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | ro | 6 | -- |
| 1 | Fault End Filter | BOOL | rw | 0 | Filter fault-end messages |
| 2 | Fault Number Filter | ENUM (USINT) | rw | 2 | See Fault Number Filter Enum |
| 3 | Module/Channel Filter | ENUM (USINT) | rw | 0 | See Module/Channel Filter Enum |
| 4 | Module number | USINT | rw | 0 | Module number for filter (0-48) |
| 5 | Channel number | USINT | rw | 0 | Channel number for filter |
| 6 | Fault number | USINT | rw | 5 | Fault number for filter |

**Fault Number Filter Enum (`0x2401:02`):**

| Value | Meaning |
|---|---|
| 0 | Inactive |
| 1 | Record only the defined fault number |
| 2 | Do not record the defined fault number |

**Module/Channel Filter Enum (`0x2401:03`):**

| Value | Meaning |
|---|---|
| 0 | Inactive |
| 1 | Record only the fault number of a module |
| 2 | Record only the fault number of a channel |

### 3.9 Modular Device Profile `0xF000`

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 0 | SubIndex 000 | USINT | ro |
| 1 | Module index distance | UINT | ro |
| 2 | Maximum number of modules | UINT | ro |
| 3 | Standard entries in object 0x80xx | UDINT | ro |
| 4 | Standard entries in object 0x90xx | UDINT | ro |

### 3.10 Module List Objects

| Index | Name | Access | Description |
|---|---|---|---|
| `0xF030` | Configured Module List | rw | Array of 48x UDINT ModuleIdent values |
| `0xF050` | Detected Module List | ro | Array of 48x UDINT ModuleIdent values |

### 3.11 Head Station TxPDO Mappings

**Diag History TxPDO `0x1A40` (Rev 1 & 2)**

| SubIdx | Mapping Entry | Mapped Object |
|---|---|---|
| 1 | `0x10F30401` | `0x10F3:04` New Messages Available (BOOL, 1 bit) |
| 2 | `0x0000000F` | Padding (15 bits) |

**Timestamp TxPDO `0x1A42` (Rev 2 only)**

| SubIdx | Mapping Entry | Mapped Object |
|---|---|---|
| 1 | `0x10F80040` | `0x10F8:00` Timestamp (ULINT, 64 bits) |

---

## 4. Module-Level SDO Objects (Per-Slot)

Each plugged module gets its own set of objects at slot-relative indices. For slot `n`:
- `0x1600+n` = RxPDO mapping (output modules)
- `0x1A00+n` = TxPDO mapping (input modules)
- `0x2000+n` = Module parameters
- `0x2100+n` = Failsafe values
- `0x2200+n` = ISDU Access (IO-Link modules only)
- `0x2300+n` = IO-Link Settings (IO-Link modules only)
- `0x6000+n` = Process inputs
- `0x7000+n` = Process outputs
- `0x9000+n` = Module identification

### 4.1 Common Module Identification Object `0x9000+n`

Present on every module type.

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 0 | Number of Entries | USINT | ro |
| 1 | Address of the module | UINT | ro |
| 3 | Name string | STRING(12) | ro |
| 5 | Vendor ID | UDINT | ro |
| 7 | Revision | UDINT | ro |
| 8 | Serial number | UDINT | ro |
| 9 | Module PDO Group | UINT | ro |
| 10 | Module Ident | UDINT | ro |
| 11 | Slot | UINT | ro |

---

## 5. CPX-E-EC Bus Node Module Variants

### 5.1 E-EC (Plain, ModuleIdent `0xDE250000`)

No process data. Only `0x2000` (Module Parameter) and `0x9000` (Module Identification).

**Module Parameter `0x2000+n`:**

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- |
| 1 | Explicit Device ID | UINT | ro |
| 2 | Configured Station Alias | UINT | ro |
| 3 | EtherCAT Address | UINT | ro |
| 4 | Current IP Address | UDINT | ro |
| 5 | Current IP Mask | UDINT | ro |
| 6 | Current IP Address Gateway | UDINT | ro |

### 5.2 E-EC [Status] (ModuleIdent `0xDE250002`)

Provides 8 status bits as TxPDO.

**Input Object `0x6000+n`:**

| SubIdx | Name | Type | PDO |
|---|---|---|---|
| 1 | Input 0 (status word) | UINT | TxPDO |

**TxPDO `0x1A00+n` Entries:**

| Bit | Object | Name |
|---|---|---|
| 0 | `0x6000:1` bit 0 | Error valve/pneumatic |
| 1 | `0x6000:1` bit 1 | Error output module |
| 2 | `0x6000:1` bit 2 | Error input module |
| 3 | `0x6000:1` bit 3 | Error analog/technology module |
| 4 | `0x6000:1` bit 4 | Undervoltage |
| 5 | `0x6000:1` bit 5 | Short circuit/overload |
| 6 | `0x6000:1` bit 6 | Wire break |
| 7 | `0x6000:1` bit 7 | Other error |
| 8-15 | -- | Padding (8 bits) |

### 5.3 E-EC [STI] (ModuleIdent `0xDE250202`)

16-bit status interface with read/write capability.

**Failsafe Values `0x2100+n`:**

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 1 | Channel 0 | UINT | rw |

**TxPDO:** `0x6000:1` Input 0 (UINT, 16-bit)
**RxPDO:** `0x7000:1` Output 0 (UINT, 16-bit)

---

## 6. CPX-E-8DO Digital Output Module

**Applies to:** `E-8DO` (`0x1F000800`) and `E-8DO-P` (`0x22000800`)

### 6.1 Module Parameters `0x2000+n`

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- |
| 1 | Monitor SCO | BOOL | rw |
| 2 | Monitor Vout/Vval | BOOL | rw |
| 3 | Behaviour after SCO | ENUM (1-bit) | rw |

**Behaviour after SCO Enum:**

| Value | Meaning |
|---|---|
| 0 | Leave switched off |
| 1 | Resume |

### 6.2 Failsafe Values `0x2100+n`

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 1-8 | Channel 0-7 | BOOL | rw |

### 6.3 RxPDO `0x1600+n` -- Outputs

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1 | `0x7000:1` | Output 0 | BIT | 1 bit |
| 2 | `0x7000:2` | Output 1 | BIT | 1 bit |
| 3 | `0x7000:3` | Output 2 | BIT | 1 bit |
| 4 | `0x7000:4` | Output 3 | BIT | 1 bit |
| 5 | `0x7000:5` | Output 4 | BIT | 1 bit |
| 6 | `0x7000:6` | Output 5 | BIT | 1 bit |
| 7 | `0x7000:7` | Output 6 | BIT | 1 bit |
| 8 | `0x7000:8` | Output 7 | BIT | 1 bit |

Total RxPDO size: 8 bits (1 byte).

---

## 7. CPX-E-16DI Digital Input Module

**Applies to:** `E-16DI` (`0x1D000010`) and `E-16DI-P` (`0x21000010`)

### 7.1 Module Parameters `0x2000+n`

| SubIdx | Name | Type | Access | Description |
|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- | -- |
| 1 | Monitor SCS | BOOL | rw | Monitor sensor supply short circuit |
| 2 | Behaviour after SCS | ENUM (1-bit) | rw | See enum below |
| 3 | Debounce time | ENUM (2-bit) | rw | See enum below |
| 4 | Signal extension | ENUM (2-bit) | rw | See enum below |
| 5-20 | Signal extension CH 0-15 | BOOL | rw | Per-channel signal extension enable |

**Behaviour after SCS Enum:**

| Value | Meaning |
|---|---|
| 0 | Leave switched off |
| 1 | Switch on again |

**Debounce Time Enum:**

| Value | Time |
|---|---|
| 0 | 0.1 ms |
| 1 | 3 ms |
| 2 | 10 ms |
| 3 | 20 ms |

**Signal Extension Enum:**

| Value | Time |
|---|---|
| 0 | 0.5 ms |
| 1 | 15 ms |
| 2 | 50 ms |
| 3 | 100 ms |

### 7.2 TxPDO `0x1A00+n` -- Inputs

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1-16 | `0x6000:1` - `0x6000:16` | Input 0-15 | BIT | 1 bit each |

Total TxPDO size: 16 bits (2 bytes).

---

## 8. CPX-E-4AI-U-I Analog Input Module

**ModuleIdent:** `0x8E010008`

### 8.1 Module Parameters `0x2000+n`

| SubIdx | Name | Type | Access | Description |
|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- | -- |
| 1 | Monitor SCS | BOOL | rw | Monitor sensor supply |
| 2 | Monitor parameters | BOOL | rw | Monitor parameter errors |
| 3 | Behaviour after SCS | ENUM (1-bit) | rw | Leave switched off (0) / Resume (1) |
| 4 | Monitor input overload | BOOL | rw | -- |
| 5 | Behaviour after input overload | ENUM (1-bit) | rw | Leave switched off (0) / Switch on again (1) |
| 6 | Sensor supply module | BOOL | rw | Enable sensor supply |
| 7 | Input format | ENUM (1-bit) | rw | See Input Format Enum |
| 8 | Hysteresis | UINT | rw | Hysteresis value for limits |
| 9-12 | Diagnostic functions CH 0-3 | USINT | rw | Bitmask (default `0x80`) |
| 13-16 | Signal range CH 0-3 | ENUM (4-bit) | rw | See Signal Range Enum |
| 17-20 | Filter measured value CH 0-3 | ENUM (4-bit) | rw | See Filter Enum |
| 21-24 | Lower limit CH 0-3 | INT | rw | Default: `0x9400` (-27648) |
| 25-28 | Upper limit CH 0-3 | INT | rw | Default: `0x6C00` (27648) |

**Input Format Enum:**

| Value | Meaning |
|---|---|
| 0 | Signed 15 Bit |
| 1 | Linear scaled |

**Signal Range Enum (AI):**

| Value | Range |
|---|---|
| 0 | No sensor connected |
| 1 | 0..10V |
| 2 | +/- 10V |
| 3 | +/- 5V |
| 4 | 1..5V |
| 5 | 0..20mA |
| 6 | 4..20mA |
| 7 | +/- 20mA |
| 8 | 0..10V neg. values suppressed |
| 9 | 0..20mA neg. values suppressed |
| 10 | 4..20mA neg. values suppressed |

**Filter Measured Value Enum:**

| Value | Averaging |
|---|---|
| 0 | No filter |
| 1 | 2 values |
| 2 | 4 values |
| 3 | 8 values |
| 4 | 16 values |
| 5 | 32 values |
| 6 | 64 values |
| 7 | 128 values |
| 8 | 256 values |
| 9 | 512 values |
| 10 | 1024 values |
| 11 | 2048 values |
| 12 | 4096 values |
| 13 | 8192 values |
| 14 | 16384 values |
| 15 | 32768 values |

### 8.2 TxPDO `0x1A00+n` -- Inputs

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1 | `0x6000:1` | Input 0 (CH 0) | INT | 16 bit |
| 2 | `0x6000:2` | Input 1 (CH 1) | INT | 16 bit |
| 3 | `0x6000:3` | Input 2 (CH 2) | INT | 16 bit |
| 4 | `0x6000:4` | Input 3 (CH 3) | INT | 16 bit |

Total TxPDO size: 64 bits (8 bytes). Data type is signed INT16.

---

## 9. CPX-E-4AO-U-I Analog Output Module

**ModuleIdent:** `0x8E020800`

### 9.1 Module Parameters `0x2000+n`

| SubIdx | Name | Type | Access | Description |
|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- | -- |
| 1 | Monitor SCO | BOOL | rw | Monitor output short circuit |
| 2 | Monitor Vout/Vval | BOOL | rw | Monitor output/valve voltage |
| 3 | Monitor parameters | BOOL | rw | Monitor parameter errors |
| 4 | Behaviour after SCO | ENUM (1-bit) | rw | Leave switched off (0) / Resume (1) |
| 5 | Behaviour after SCA | ENUM (1-bit) | rw | Leave switched off (0) / Resume (1) |
| 6 | Scaling | ENUM (1-bit) | rw | Signed 15 Bit (0) / Linear scaled (1) |
| 7 | Actor supply | BOOL | rw | Enable actuator supply |
| 8-11 | Output CH 0-3: Diagnostic functions | USINT | rw | Bitmask (default `0x90`) |
| 12-15 | Output CH 0-3: Signal range | ENUM (4-bit) | rw | See Signal Range Enum |

**Signal Range Enum (AO):**

| Value | Range |
|---|---|
| 1 | 0..10V |
| 2 | +/- 10V |
| 3 | +/- 5V |
| 4 | 1..5V |
| 5 | 0..20mA |
| 6 | 4..20mA |
| 7 | +/- 20mA |

### 9.2 Failsafe Values `0x2100+n`

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 1-4 | Channel 0-3 | INT | rw |

### 9.3 RxPDO `0x1600+n` -- Outputs

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1 | `0x7000:1` | Output 0 (CH 0) | INT | 16 bit |
| 2 | `0x7000:2` | Output 1 (CH 1) | INT | 16 bit |
| 3 | `0x7000:3` | Output 2 (CH 2) | INT | 16 bit |
| 4 | `0x7000:4` | Output 3 (CH 3) | INT | 16 bit |

Total RxPDO size: 64 bits (8 bytes). Data type is signed INT16.

---

## 10. CPX-E IO-Link Master Modules

**Applies to:** E-1IOL, E-2IOL, E-4IOL (and their -P variants).

The IO-Link modules share the same object structure; the differences are the number of ports and the I/O data size.

### 10.1 Module Parameters `0x2000+n`

**Common parameters (all IOL modules):**

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- |
| 1 | Monitor Vout/Vval | BOOL | rw |
| 2 | Behaviour after SCS | ENUM (1-bit) | rw |
| 3 | Behaviour after SCO | ENUM (1-bit) | rw |
| 4 | PS Power | ENUM (1-bit) | rw |

**Per-port parameters (repeated per port):**

| SubIdx (Port N) | Name | Type | Access |
|---|---|---|---|
| 5 + (N-1)*3 | Configuration Port N - Cycle Time | UINT | rw |
| 6 + (N-1)*3 | Configuration Port N - PL Power | ENUM (1-bit) | rw |
| 7 + (N-1)*3 | Configuration Port N - Operating Mode | ENUM (2-bit) | rw |

**Per-port status (read-only, after config params):**

| SubIdx | Name | Type | Access |
|---|---|---|---|
| varies | Status Port N - Line State | ENUM (8-bit) | ro |
| varies | Status Port N - ErrorCode | UINT | ro |

**Operating Mode Enum:**

| Value | Mode |
|---|---|
| 0 | Inactive |
| 1 | DI (Digital Input) |
| 2 | DO (Digital Output) |
| 3 | IO-Link |

**PS Power / PL Power Enum:**

| Value | Meaning |
|---|---|
| 0 | Off |
| 1 | On |

**Line State Enum (Status):**

| Value | State |
|---|---|
| 0 | Inactive |
| 1 | DI |
| 2 | DO |
| 3 | CheckFault |
| 4 | Preoperate |
| 5 | Operate |
| 6 | Scanning |
| 7 | DeviceLost |

### 10.2 ISDU Access Object `0x2200+n`

Used for IO-Link ISDU (Indexed Service Data Unit) parameter read/write.

| SubIdx | Name | Type | Access | Description |
|---|---|---|---|---|
| 0 | Number of Elements | USINT | ro | 7 |
| 1 | Direction | ENUM (USINT) | rw | 0=Read, 1=Write |
| 2 | Channel | USINT | rw | Port number (0-based) |
| 3 | Index | UINT | rw | IO-Link parameter index |
| 4 | Subindex | USINT | rw | IO-Link parameter subindex |
| 5 | ISDU Error | UINT | rw | Error code from device |
| 6 | Length of data | USINT | rw | Data length in bytes |
| 7 | Data | ARRAY [0..237] OF BYTE | rw | Parameter data (max 238 bytes) |

### 10.3 IO-Link Settings `0x2300+n`

Per-channel device inspection settings. Repeated per channel.

| SubIdx (per Ch) | Name | Type | Access |
|---|---|---|---|
| 1 + (ch*4) | Ch{N} - Inspection Level | ENUM (USINT) | rw |
| 2 + (ch*4) | Ch{N} - Vendor ID | UINT | rw |
| 3 + (ch*4) | Ch{N} - Device ID | UDINT | rw |
| 4 + (ch*4) | Ch{N} - Serial | STRING(16) | rw |

**Inspection Level Enum:**

| Value | Meaning |
|---|---|
| 0 | No check |
| 1 | Type compatible |
| 2 | Identical |

### 10.4 Failsafe Values `0x2100+n`

Array of USINT failsafe bytes. Size depends on I/O configuration:
- 8 Bytes variant: 8 channels (USINT each)
- 16 Bytes variant: 16 channels (USINT each)
- 32 Bytes variant: 32 channels (USINT each)

### 10.5 IO-Link PDO Mappings

The PDO data size depends on the module variant:

| Variant | TxPDO Size | RxPDO Size | Entries |
|---|---|---|---|
| 8 Bytes I/O | 8 bytes | 8 bytes | 8x USINT |
| 16 Bytes I/O | 16 bytes | 16 bytes | 16x USINT |
| 32 Bytes I/O | 32 bytes | 32 bytes | 32x USINT |

**TxPDO `0x1A00+n`:** `0x6000:1` through `0x6000:N` (Input 0..N-1, USINT, 8-bit each)
**RxPDO `0x1600+n`:** `0x7000:1` through `0x7000:N` (Output 0..N-1, USINT, 8-bit each)

---

## 11. CPX-E-1CI Counter Module

**ModuleIdent:** `0xAE0A020C`

### 11.1 Module Parameters `0x2000+n`

| SubIdx | Name | Type | Access | Default | Description |
|---|---|---|---|---|---|
| 0 | SubIndex 000 | USINT | -- | -- | -- |
| 1 | Signal/encoder type | ENUM (2-bit) | rw | 0 | See Signal Type Enum |
| 2 | Signal evaluation | ENUM (2-bit) | rw | 0 | See Signal Evaluation Enum |
| 3 | Monitor wire break | BOOL | rw | 0 | -- |
| 4 | Monitor signal misalignment | BOOL | rw | 0 | -- |
| 5 | Monitor zero pulse | BOOL | rw | 0 | -- |
| 6 | Pulses per zero pulse | UINT | rw | 0 | Encoder pulses between zero marks |
| 7 | Latch signal | ENUM (1-bit) | rw | 0 | See Latch Signal Enum |
| 8 | Latch event | ENUM (2-bit) | rw | 1 | See Latch Event Enum |
| 9 | Latch behavior | ENUM (1-bit) | rw | 0 | See Latch Behavior Enum |
| 10 | Upper counter limit | UDINT | rw | `0xFFFFFFFF` | Max counter value |
| 11 | Lower counter limit | UDINT | rw | `0x00000000` | Min counter value |
| 12 | Load value | UDINT | rw | `0x00000000` | Counter preset value |
| 13 | Debounce time digital inputs | ENUM (2-bit) | rw | 0 | See Debounce Enum |
| 14 | Integration time speed measure | ENUM (2-bit) | rw | 0 | See Integration Time Enum |
| 15 | Internal revision ID | UDINT | ro | `0xBE4D070E` | Firmware revision |

**Signal/Encoder Type Enum:**

| Value | Type |
|---|---|
| 0 | 5V differential |
| 1 | 5V single ended |
| 2 | 24V single ended |

**Signal Evaluation Enum:**

| Value | Mode |
|---|---|
| 0 | Single |
| 1 | Double |
| 2 | Quad |
| 3 | Pulse and direction |

**Latch Signal Enum:**

| Value | Source |
|---|---|
| 0 | Digital input I0 |
| 1 | Zero pulse |

**Latch Event Enum:**

| Value | Edge |
|---|---|
| 1 | Rising edge |
| 2 | Falling edge |
| 3 | Rising and falling edge |

**Latch Behavior Enum:**

| Value | Mode |
|---|---|
| 0 | Continuous |
| 1 | Load value |

**Debounce Time Enum (Digital Inputs):**

| Value | Time |
|---|---|
| 0 | 20 us |
| 1 | 100 us |
| 2 | 3 ms |

**Integration Time Speed Measure Enum:**

| Value | Time |
|---|---|
| 0 | 1 ms |
| 1 | 10 ms |
| 2 | 100 ms |

### 11.2 Failsafe Values `0x2100+n`

| SubIdx | Name | Type | Access |
|---|---|---|---|
| 1 | Channel 0 | USINT | rw |

### 11.3 TxPDO `0x1A00+n` -- Inputs (12 bytes total)

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1 | `0x6000:1` | Counter value / speed | UDINT | 32 bit |
| 2 | `0x6000:2` | Latch value | UDINT | 32 bit |
| 3 | `0x6000:3` | Status DI0 | BOOL | 1 bit |
| 4 | `0x6000:4` | Status DI1 | BOOL | 1 bit |
| 5 | `0x6000:5` | Status DI2 | BOOL | 1 bit |
| 6 | `0x6000:6` | Status DI3 | BOOL | 1 bit |
| 7 | `0x6000:7` | Reserved | BOOL | 1 bit |
| 8 | `0x6000:8` | Latch missed | BOOL | 1 bit |
| 9 | `0x6000:9` | Latch set | BOOL | 1 bit |
| 10 | `0x6000:10` | Latch locked | BOOL | 1 bit |
| 11 | `0x6000:11` | Lower counting limit | BOOL | 1 bit |
| 12 | `0x6000:12` | Upper counting limit | BOOL | 1 bit |
| 13 | `0x6000:13` | Counting direction | BOOL | 1 bit |
| 14 | `0x6000:14` | Counter locked | BOOL | 1 bit |
| 15 | `0x6000:15` | Counter set | BOOL | 1 bit |
| 16 | `0x6000:16` | Release DI2 | BOOL | 1 bit |
| 17 | `0x6000:17` | Release null impulse | BOOL | 1 bit |
| 18 | `0x6000:18` | Speed measurement | BOOL | 1 bit |
| -- | -- | Padding | -- | 16 bit |

Total TxPDO: 96 bits = 12 bytes (including 16-bit padding for word alignment).

### 11.4 RxPDO `0x1600+n` -- Outputs (2 bytes total)

| Entry | Object | Name | Type | Size |
|---|---|---|---|---|
| 1 | `0x7000:1` | Set DI2 | BOOL | 1 bit |
| 2 | `0x7000:2` | Set Null | BOOL | 1 bit |
| 3 | `0x7000:3` | Set Counter | BOOL | 1 bit |
| 4 | `0x7000:4` | Lock Counter | BOOL | 1 bit |
| 5 | `0x7000:5` | Overflow lower counting limit | BOOL | 1 bit |
| 6 | `0x7000:6` | Speed measure | BOOL | 1 bit |
| 7 | `0x7000:7` | Acknowledge Latch | BOOL | 1 bit |
| 8 | `0x7000:8` | Lock Latch | BOOL | 1 bit |
| -- | -- | Padding | -- | 8 bit |

Total RxPDO: 16 bits = 2 bytes (including 8-bit padding).

---

## 12. Data Type Reference

### 12.1 Basic Types (from ESI)

| Type Name | Size | Description |
|---|---|---|
| BOOL | 1 bit | Boolean |
| BIT | 1 bit | Single bit (PDO mapping) |
| BITARR8 | 8 bit | 8-bit array |
| USINT | 8 bit | Unsigned 8-bit integer |
| UINT | 16 bit | Unsigned 16-bit integer |
| INT | 16 bit | Signed 16-bit integer |
| UDINT | 32 bit | Unsigned 32-bit integer |
| DINT | 32 bit | Signed 32-bit integer |
| ULINT | 64 bit | Unsigned 64-bit integer |
| STRING(N) | N*8 bit | ASCII string of N characters |

### 12.2 Enum Data Types

| Type ID | Size | Used In | Values |
|---|---|---|---|
| `DT0810EN08` | 8-bit | Failsafe mode (`0x2400:07`) | 0=Reset outputs, 1=Hold last, 2=Fault mode |
| `DT0811EN08` | 8-bit | System start (`0x2400:08`) | 0=Default params, 1=Saved params |
| `DT080EEN08` | 8-bit | Fault number filter (`0x2401:02`) | 0=Inactive, 1=Record only, 2=Do not record |
| `DT080FEN08` | 8-bit | Module/channel filter (`0x2401:03`) | 0=Inactive, 1=By module, 2=By channel |
| `DT081FEN01` | 1-bit | Behaviour after SCO | 0=Leave off, 1=Resume |
| `DT0802EN01` | 1-bit | Behaviour after SCS | 0=Leave off, 1=Switch on again |
| `DT0800EN02` | 2-bit | DI debounce time | 0=0.1ms, 1=3ms, 2=10ms, 3=20ms |
| `DT0801EN02` | 2-bit | DI signal extension | 0=0.5ms, 1=15ms, 2=50ms, 3=100ms |
| `DT0815EN01` | 1-bit | AI/AO format | 0=Signed 15 Bit, 1=Linear scaled |
| `DT0816EN04` | 4-bit | AI signal range | 0=None, 1=0-10V, 2=+/-10V, 3=+/-5V, 4=1-5V, 5=0-20mA, 6=4-20mA, 7=+/-20mA, 8-10=neg. suppressed variants |
| `DT0817EN04` | 4-bit | AI filter | 0=None, 1-15=2^(value) averaging samples |
| `DT0844EN04` | 4-bit | AO signal range | 1=0-10V, 2=+/-10V, 3=+/-5V, 4=1-5V, 5=0-20mA, 6=4-20mA, 7=+/-20mA |
| `DT0832EN01` | 1-bit | IOL PS/PL Power | 0=Off, 1=On |
| `DT0846EN02` | 2-bit | IOL operating mode | 0=Inactive, 1=DI, 2=DO, 3=IO-Link |
| `DT0847EN08` | 8-bit | IOL line state | 0=Inactive, 1=DI, 2=DO, 3=CheckFault, 4=Preoperate, 5=Operate, 6=Scanning, 7=DeviceLost |
| `DT0848EN08` | 8-bit | ISDU direction | 0=Read, 1=Write |
| `DT084EEN08` | 8-bit | IOL inspection level | 0=No check, 1=Type compatible, 2=Identical |
| `DT084FEN02` | 2-bit | 1CI signal type | 0=5V differential, 1=5V single ended, 2=24V single ended |
| `DT0850EN02` | 2-bit | 1CI signal evaluation | 0=Single, 1=Double, 2=Quad, 3=Pulse+direction |
| `DT0851EN01` | 1-bit | 1CI latch signal | 0=DI0, 1=Zero pulse |
| `DT0852EN02` | 2-bit | 1CI latch event | 1=Rising, 2=Falling, 3=Both edges |
| `DT0853EN01` | 1-bit | 1CI latch behavior | 0=Continuous, 1=Load value |
| `DT0854EN02` | 2-bit | 1CI DI debounce | 0=20us, 1=100us, 2=3ms |
| `DT0855EN02` | 2-bit | 1CI speed integration | 0=1ms, 1=10ms, 2=100ms |

---

## 13. Diagnosis Messages

The CPX-E-EC supports 142 diagnostic messages via object `0x10F3`. Messages contain Module and Channel placeholders.

### 13.1 I/O Faults

| TextId | Message |
|---|---|
| `0x3700` | No error |
| `0x3701` | General diagnosis |
| `0x3702` | Short circuit |
| `0x3703` | Wire fracture/idling current I/O |
| `0x3704` | Short circuit in actuator supply |
| `0x3705` | Undervoltage in power supply |
| `0x3709` | Lower limit exceeded |
| `0x370A` | Upper limit exceeded |
| `0x370B` | Short circuit valve |
| `0x370C` | Pilot valve function warning |
| `0x370D` | Wire fracture (open load) |
| `0x370E` | Condition counter exceeded |
| `0x370F` | Module/channel failure |

### 13.2 Configuration Faults

| TextId | Message |
|---|---|
| `0x3710` | Module code incorrect |
| `0x3711` | I/O length incorrect |
| `0x3712` | Address range exceeded |
| `0x3713` | Life cycle exceeded |
| `0x3714` | Fault in parametrizing signal range |
| `0x3715` | Fault in parametrizing data format |
| `0x3716` | Fault in parametrizing linear scaling |
| `0x3717` | Fault in filter measured value |
| `0x3718` | Fault in parametrizing lower limit |
| `0x3719` | Fault in parametrizing upper limit |
| `0x371A` | Fault in actuator supply |
| `0x371B` | Wrong device type mounted |
| `0x371C` | Alarm value reached |
| `0x371D` | Fault in parametrizing |

### 13.3 Communication Faults

| TextId | Message |
|---|---|
| `0x371E` | No new output data (slave) |
| `0x371F` | No bus connection (slave) |
| `0x3720` | No STI read access (slave) |
| `0x3721` | No parameter access (slave) |
| `0x3722` | CP module lost / fault |
| `0x3723` | CP configuration failure |
| `0x3724` | Short circuit CP-line |
| `0x3725` | Fault in controlling |
| `0x3726` | Missing valve |
| `0x3727` | Maintenance required |
| `0x3728` | Life Guard |
| `0x3729` | Heart Beat |
| `0x372A` | Com Cycle Period (Sync) |
| `0x372B` | CAN Overrun (Objects lost) |
| `0x372C` | Invalid PDO received |
| `0x372D` | CAN WarnLimit reached |
| `0x372E` | CAN recovered from Bus Off |
| `0x372F` | Bus Power lost |

### 13.4 Sensor / Signal Faults

| TextId | Message |
|---|---|
| `0x3730` | Fault in Calibration |
| `0x3731` | Lower drop out signal |
| `0x3732` | Upper drop out signal |
| `0x3733` | Sensor limit exceeded |
| `0x3734` | Short circuit cold junction comp. |
| `0x3735` | Open load cold junction comp. |
| `0x3736` | Calibration data incorrect |
| `0x3737` | Invalid process value |
| `0x3738` | Short circuit I-Port |
| `0x3739` | Device missing / failure |
| `0x373A` | I-Port configuration error |
| `0x373B` | Input overload |
| `0x373C` | Signal underflow/overflow |
| `0x373D` | Overvoltage in power supply |
| `0x373E` | Overflow in time measurement |
| `0x373F` | Object failure |

### 13.5 System Faults

| TextId | Message |
|---|---|
| `0x3740` | Number of Modules incorrect |
| `0x3741` | F_Dest_Add mismatch |
| `0x3742` | F-Communication fault |
| `0x3743` | F-Communication timeout |
| `0x3744` | Leakage current |
| `0x3745` | F-Parameter fault |
| `0x3746` | Station equip. status incorrect |
| `0x3747` | Bus connection lost |
| `0x3748` | SSI-parity error |
| `0x3749` | Limit monitoring |
| `0x374A` | Limit exceeded in measure duty cycle |
| `0x374E` | Value out of range |
| `0x3750` | Function failure |
| `0x3764` | Configuration error |
| `0x3765` | Execution error |
| `0x3766` | Record error |
| `0x3767` | Control error |
| `0x3768` | System error A |
| `0x3769` | System error B |
| `0x376A` | Error in valve |
| `0x376B` | Controller error |
| `0x376C` | Encoder error |
| `0x376D` | Error motor or power stage |
| `0x3773` | Subsystem module/channel failure |

### 13.6 Hardware / Internal Faults

| TextId | Message |
|---|---|
| `0x3780` | Switch unit defective |
| `0x3781` | CBUS ASIC not ready |
| `0x3782` | CPU Hardware Trap |
| `0x3783` | CBUS C-manager not ready |
| `0x3784` | Watchdog overflow |
| `0x3785` | Remanent memory defective |
| `0x3786` | Flash system memory defective |
| `0x3787` | Number of mod.params. more than 64 |
| `0x3788` | Slave not ready |
| `0x3789` | CBUS diagnostic telegram |
| `0x378A` | CBUS init fault (module gap) |
| `0x378B` | Order queue full |
| `0x378C` | CBUS-EEPROM error |
| `0x378D` | CBUS C-timeout error |
| `0x378E` | CBUS telegram fault |
| `0x378F` | BIU access error |
| `0x3790` | Licence error |
| `0x3791` | Built-in self test failed |
| `0x3796` | NETOS fatal error |

### 13.7 Parameter Transfer / Setup Faults

| TextId | Message |
|---|---|
| `0x37C8` | Fault param. transfer module n |
| `0x37C9` | Invalid field bus address |
| `0x37CA` | Protocol ASIC not ready |
| `0x37CB` | MMI serves CPX module |
| `0x37CC` | Invalid setting switch unit |
| `0x37CD` | Module set to default values |
| `0x37CE` | Fault in param. operating mode |
| `0x37CF` | Fault in param. max pos cont. output curr. |
| `0x37D0` | Fault in param. max neg cont. output curr. |
| `0x37D1` | Fault in param. CNT-function input DI |
| `0x37D2` | Fault in param. POS-function input DI |
| `0x37D3` | Fault in param. encoder type |
| `0x37D4` | Fault in param. reference mode |
| `0x37D5` | Fault in param. SSI-parity |
| `0x37D6` | Fault in param. SSI-telegram cycle |
| `0x37D7` | Fault in param. time base pulse output |
| `0x37D8` | Fault in object limit |
| `0x37D9` | Fault in object count limit |
| `0x37DA` | Fault in object comp value |
| `0x37DB` | Fault in reference mode |
| `0x37DC` | Invalid object address |
| `0x37DD` | Fault in pulse output settings |
| `0x37DE` | Pulse output debounce time out of range |
| `0x37DF` | Fault in speed factor |
| `0x37E0` | Fault in phys. characteristic input |
| `0x37E1` | Fault in function DIR |
| `0x37E2` | Fault in pulse per rotation |
| `0x37E3` | Fault in pulse per rotation between AB&0 |

### 13.8 Module Detection

| TextId | Message |
|---|---|
| `0x3800` | Ident check failed for configured module at slot N |
| `0x3801` | Ident check skipped - PLC has not written to Object 0xF030 |

### 13.9 EtherCAT State Machine / DC

| TextId | Message |
|---|---|
| `0x0001` | State change Request From: N To: M |
| `0x0002` | (Numeric status) |
| `0x000F` | Calculate bus cycle time failed (Local timer too slow) |
| `0x0011` | Sync Manager N invalid address |
| `0x0012` | Sync Manager N invalid size |
| `0x0013` | Sync Manager N invalid settings |
| `0x0020` | DC activation register is invalid |
| `0x0021` | Configured SyncType not supported |

---

## 14. PDO Mapping Summary (Quick Reference)

### TxPDO (Inputs, SM3, `0x1A00+n`)

| Module | PDO Index | Content | Total Size |
|---|---|---|---|
| E-EC | -- | No TxPDO | 0 |
| E-EC [Status] | `0x1A00` | 8 status bits + 8-bit pad | 16 bits |
| E-EC [STI] | `0x1A00` | 16-bit status word | 16 bits |
| E-16DI / E-16DI-P | `0x1A00` | 16x BIT inputs | 16 bits |
| E-4AI-U-I | `0x1A00` | 4x INT16 analog values | 64 bits |
| E-1IOL (32B) | `0x1A00` | 32x USINT | 256 bits |
| E-2IOL (32B) | `0x1A00` | 32x USINT | 256 bits |
| E-4IOL (8B) | `0x1A00` | 8x USINT | 64 bits |
| E-4IOL (16B) | `0x1A00` | 16x USINT | 128 bits |
| E-4IOL (32B) | `0x1A00` | 32x USINT | 256 bits |
| E-1CI | `0x1A00` | Counter+Latch+Status | 96 bits |
| Head Station | `0x1A40` | Diag History (1 bit + pad) | 16 bits |
| Head Station (Rev 2) | `0x1A42` | Timestamp (64-bit) | 64 bits |

### RxPDO (Outputs, SM2, `0x1600+n`)

| Module | PDO Index | Content | Total Size |
|---|---|---|---|
| E-EC | -- | No RxPDO | 0 |
| E-EC [Status] | -- | No RxPDO | 0 |
| E-EC [STI] | `0x1600` | 16-bit control word | 16 bits |
| E-8DO / E-8DO-P | `0x1600` | 8x BIT outputs | 8 bits |
| E-4AO-U-I | `0x1600` | 4x INT16 analog values | 64 bits |
| E-1IOL (32B) | `0x1600` | 32x USINT | 256 bits |
| E-2IOL (32B) | `0x1600` | 32x USINT | 256 bits |
| E-4IOL (8B) | `0x1600` | 8x USINT | 64 bits |
| E-4IOL (16B) | `0x1600` | 16x USINT | 128 bits |
| E-4IOL (32B) | `0x1600` | 32x USINT | 256 bits |
| E-1CI | `0x1600` | Control bits + pad | 16 bits |

---

## 15. CoE Object Address Map

Complete index map showing all possible object ranges:

```
Head Station Objects:
  0x1000      Device Type
  0x1001      Error Register
  0x1008      Device Name
  0x1009      Hardware Version
  0x100A      Software Version
  0x1018      Identity Object
  0x10F3      Diagnosis History
  0x10F8      Timestamp (Rev 2 only)
  0x1A40      Diag History TxPDO Mapping
  0x1A42      Timestamp TxPDO Mapping (Rev 2 only)
  0x1C00      Sync Manager Type
  0x1C32      SM Output Parameter
  0x1C33      SM Input Parameter
  0x2400      Global CPX Parameter
  0x2401      CPX Diagnosis Parameter
  0xF000      Modular Device Profile
  0xF030      Configured Module List
  0xF050      Detected Module List

Per-Slot Objects (slot n = 0..47):
  0x1600+n    RxPDO Mapping (output modules)
  0x1A00+n    TxPDO Mapping (input modules)
  0x2000+n    Module Parameters
  0x2100+n    Failsafe Values
  0x2200+n    ISDU Access (IO-Link only)
  0x2300+n    IO-Link Settings (IO-Link only)
  0x6000+n    Process Data Inputs
  0x7000+n    Process Data Outputs
  0x9000+n    Module Identification
```
