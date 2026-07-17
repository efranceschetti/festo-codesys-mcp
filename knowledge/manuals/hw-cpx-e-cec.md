---
id: cpx-e-cec
title: CPX-E-CEC Controller — CODESYS Runtime and Configuration
priority: HIGH
token_estimate: 1500
use_when:
  - user asks about CPX-E controller hardware specs
  - user needs CODESYS runtime configuration on CPX-E
  - user asks about network setup, IP addresses, or communication ports
  - user needs reset/recovery procedures
  - first-time CPX-E project setup
never_use_when:
  - user asks about I/O modules (see cpx-e-io)
  - user asks about EtherCAT bus configuration (see cpx-e-ethercat)
  - user asks about motion control
depends_on: [cpx-e-system]
related: [cpx-e-ethercat, cpx-e-io, festo-cpx]
keywords: [CPX-E-CEC, controller, CODESYS runtime, PLC, CPU, Ethernet, IP, SD card, firmware, reset, LED, task configuration]
---

# CPX-E-CEC Controller Reference

## Controller Overview

The CPX-E-CEC is a CODESYS V3.5-based PLC controller for the CPX-E automation system.

**Available Variants:**
- **CPX-E-CEC-C1-EP**: Standard controller with CODESYS V3
- **CPX-E-CEC-M1-EP**: Controller with CODESYS V3 + SoftMotion

**Key Capabilities:**
- IEC 61131-3 compliant programming via CODESYS
- EtherNet/IP network with real-time protocol (RT)
- EtherCAT Master for distributed I/O and servo drives
- Integrated 2-port Ethernet switch (star/line topology)
- Standard Ethernet (TCP/IP) and Modbus TCP support
- Crossover detection (auto MDI/MDI-X) for flexible cabling
- FTP and web server for diagnostics/file transfer
- Real-time clock with battery backup
- Internal temperature sensor
- Optional CDSB operator unit (HMI display/keypad)

**Address Space:**
- Maximum 10 modules per CPX-E system (including controller)
- 64 bytes input, 64 bytes output maximum

## CPU and Memory

**Processor:**
- Industrial-grade embedded processor (details proprietary)
- Real-time CODESYS V3.5 runtime environment

**Memory:**
- Retentive data support via CODESYS retain variables
- Battery-backed real-time clock
- Internal memory for CODESYS boot application

**Storage:**
- SD card slot: CAMC-M-MS-G2 (max 32 GB, FAT32)
  - Directory: `/mnt/sdcard`
  - Access via SysFile/CAA.File libraries
  - User-monitored operation only (no continuous logging)
  - Cannot execute CODESYS boot projects
- USB interface (USB 2.0 Type A socket): max 32 GB, FAT32
  - Directory: `/mnt/usb`
  - Max current: 0.5 A
  - User-monitored operation only
  - Cannot execute CODESYS boot projects

**Temperature Monitoring:**
- Internal temperature sensor readable via:
  - CODESYS function block `GetTemperature` (Festo_General_3 library)
  - Web server: [System] → [Information]

## CODESYS Runtime Configuration

**Programming Environment:**
- CODESYS V3.5 SP17 or later (IEC 61131-3)
- Supported languages: ST, FBD, LD, SFC, IL

**Task Configuration:**
- Main task cycle synchronization with CPX-E system bus
- Configure via CODESYS task settings
- Mains buffering time: 20 ms (power outage tolerance)

**Boot Application:**
- Stored in internal controller memory
- Requires run/stop switch in "Run" position
- Auto-start on power-up if configured

**Run/Stop Switch:**
Located under front cover (DIL switch).

| Switch Position | Function |
|----------------|----------|
| **Run** (default) | CODESYS project can start, boot application enabled |
| **Stop** | CODESYS project cannot start, running project stops |
| Run → Stop | Running project stops immediately |
| Stop → Run | Stopped project resumes |

**Real-Time Clock:**
- Set/read via CODESYS function blocks:
  - SysTimeRtc library (for application use)
  - PLC shell in online mode

**System Bus Parameters:**
- Synchronization: Sync with CODESYS MainTask cycle time
- Configure via CODESYS device tree
- Filter settings for undervoltage, short circuit, overload monitoring

## Network Interfaces

**Ethernet Ports (ETH1/ETH2):**
- 2× RJ45 ports, 10/100 Mbps (full/half duplex)
- Auto-MDI/MDI-X (patch or crossover cables)
- Integrated switch (star/line topology)
- Use: Programming, HMI, TCP/IP, Modbus TCP

**EtherNet/IP Ports (XF1/XF2):**
- 2× RJ45 ports for EtherNet/IP scanner/adapter
- Real-time protocol (RT) support
- Default IP: 192.168.1.XXX (set via rotary switch)

**EtherCAT Master Port (EC):**
- 1× RJ45 port (EtherCAT master)
- 10/100 Mbps
- Connect EtherCAT slaves (I/O modules, servo drives)

**Cable Specifications:**
- Type: Shielded twisted pair Ethernet cable
- Category: Cat 5 / Cat 5e
- Max segment length: 100 m (at 100 Mbps)
- Wire gauge: 22 AWG (0.14–0.75 mm²)
- Diameter: 6–8 mm

**Port Pinout (RJ45):**
| Pin | Signal |
|-----|--------|
| 1 | TD+ (Transmit Data +) |
| 2 | TD– (Transmit Data –) |
| 3 | RD+ (Receive Data +) |
| 4 | Not connected |
| 5 | Not connected |
| 6 | RD– (Receive Data –) |
| 7 | Not connected |
| 8 | Not connected |
| Shield | Functional earth (housing) |

## IP Configuration

**Factory Defaults:**
- **Ethernet (ETH1/ETH2)**: 192.168.0.1
- **EtherNet/IP (XF1/XF2)**: 192.168.1.1 (DHCP active)

**Setting IP Address via Rotary Switch (EtherNet/IP only):**
- Three rotary switches set 4th octet: 192.168.1.XXX
- Positions:
  - **0**: Use internal configuration (factory default)
  - **1–254**: Valid IP address range
  - **999**: Reset to factory settings
- Changes require module restart

**Setting IP via CDSB Operator Unit:**
- Menu: [Settings] → [Network]
- Set IP, subnet mask, gateway
- Restart required

**Setting IP via CODESYS:**
- Device tree → Communication Settings → Ethernet
- Configure static IP or DHCP

**Reading IP Address:**
- CODESYS: Scan Festo devices
- Festo Field Device Tool (FFT)
- Web server (if IP known)
- CDSB operator unit: [Diagnosis] → [Network]

## Communication Protocols and Ports

**Festo Service Tools:**
| Function | Port | Can Run During Operation? |
|----------|------|--------------------------|
| Search (device discovery) | 990 (UDP), 10002 (UDP/MULTICAST) | Yes |
| Network config | 990 (UDP), 10002 (UDP/MULTICAST) | No (requires restart) |
| Firmware update | 10002 (UDP/MULTICAST) | No |
| Backup/restore | 10002 (UDP/MULTICAST) | No (requires restart) |
| Web homepage | 80 (TCP) | Yes |
| Festo Automation Suite (FAS) | 991 (UDP) | Yes |
| Festo Maintenance Tool (FMT) | 991 (UDP) | Yes |
| LED identification (blink) | 10002 (UDP/MULTICAST) | Yes |
| FTP file transfer | 21 (TCP), 10002 (UDP/MULTICAST) | Yes |
| Reboot | 10002 (UDP/MULTICAST) | No |
| Festo CI (command interpreter) | 991 (UDP) | No |

**CODESYS Development Environment:**
| Function | Port | Configurable? |
|----------|------|---------------|
| CODESYS communication (start/stop/reset/upload/download) | 1740–1743 (UDP), 11740–11743 (TCP) | No (always active) |
| Gateway (scan, wink) | 1217 (TCP) | No (always active) |
| Web visualisation (HTTP) | 8080 (TCP) | Yes (if enabled in project) |
| Web visualisation (HTTPS) | 443 (TCP) | Yes (if enabled in project) |
| Network variables (UDP) | 1202 (UDP) | Yes (default, reconfigurable) |
| Modbus TCP server | 502 (TCP) | Yes (default, reconfigurable) |
| Festo_EasyIP | 995 (UDP) | Yes (if enabled in project) |
| OPC UA server | 4840 (TCP) | Yes (if enabled in project) |

**FTP Server:**
- Protocol: FTP (port 21)
- Directory: `/mnt/ftp` (read/write access)
- Use: File transfer, data logging retrieval

**Web Server:**
- Protocol: HTTP (port 80)
- Access: `http://<controller-IP>`
- Features:
  - CPX module configuration/addressing
  - Diagnostics information
  - Controller/manufacturer info
  - CODESYS license info
  - Execute CI commands

## SD Card and Storage

**SD Card (Memory Card Slot [Card]):**
- Compatible: Festo CAMC-M-MS-G32-G2 only (max 32 GB)
- Format: FAT32 (single partition)
- Mount point: `/mnt/sdcard`
- Access: SysFile, CAA.File CODESYS libraries
- **Limitations:**
  - User-monitored operation only
  - Do NOT use for continuous data recording
  - Cannot execute CODESYS boot projects

**USB Interface [USB]:**
- Type: USB 2.0 Type A socket
- Max storage size: 32 GB
- Format: FAT32 (single partition)
- Mount point: `/mnt/usb`
- Max current draw: 0.5 A
- **Limitations:**
  - User-monitored operation only
  - Do NOT use for continuous data recording
  - Cannot execute CODESYS boot projects

**Firmware Update:**
- Via Festo service tools (FFT, FMT, FAS)
- Via CODESYS online mode
- Port: 10002 (UDP/MULTICAST)
- Requires controller restart

**Backup/Restore:**
- Via Festo tools: port 10002 (UDP/MULTICAST)
- Firmware update with automatic backup/restore supported
- Requires controller restart

## LED Status Indicators

**Module-Specific LEDs:**

**[Run] (Green):**
| State | Meaning |
|-------|---------|
| **Lit** | CODESYS application is running |
| **Off** | CODESYS application not available or stopped |

**[LA ETH1], [LA ETH2] (Green):**
| State | Meaning | Action |
|-------|---------|--------|
| **Lit** | Ethernet connection established (Link) | — |
| **Flashing** | Ethernet data traffic (Activity) | — |
| **Off** | No Ethernet connection | Check cable/network |

**[LA EC] (Green):**
| State | Meaning | Action |
|-------|---------|--------|
| **Lit** | EtherCAT connection established (Link) | — |
| **Flashing** | EtherCAT data traffic (Activity) | — |
| **Off** | No EtherCAT connection | Check EtherCAT wiring |

**Network-Specific LEDs (EtherNet/IP):**

**[XF1], [XF2] (Green):**
| State | Meaning | Action |
|-------|---------|--------|
| **On** | Network connection established (Link) | — |
| **Flashing** | Network data traffic (Activity) | — |
| **Off** | No network connection | Check cable/network |

**[MS] Module Status (Green/Red/Orange):**
| State | Meaning | Action |
|-------|---------|--------|
| **Green (solid)** | Normal operation | — |
| **Green (flashing)** | Configuration incomplete/incorrect | Complete/correct CPX-E config |
| **Red (solid)** | Unrecoverable error | Contact Festo Service |
| **Red (flashing)** | Recoverable error | Check CPX-E configuration |
| **Red/Green alternating** | Self-test mode | — |
| **Orange (solid)** | Bootloader mode | — |
| **Off** | No logic power supply | Check UEL/SEN power |

**[NS] Network Status (Green/Red/Orange):**
| State | Meaning | Action |
|-------|---------|--------|
| **Green (solid)** | Online with network connection | — |
| **Green (flashing)** | Online, IP assigned, no configured connection | Check master/scanner assignment |
| **Red (solid)** | Communication failed / IP conflict | Correct IP address |
| **Red (flashing)** | I/O connection timeout | Check master/scanner connection |
| **Red/Green alternating** | Self-test mode | — |
| **Orange (solid)** | Bootloader (if [MS] also orange) | — |
| **Off** | Offline / no IP address | Check network/DHCP settings |

**System-Specific LEDs:**
See "Automation system CPX-E manual" for:
- **[PS]** (Green): Operating voltage UEL/SEN
- **[PL]** (Green): Load voltage UOUT
- **[SF]** (Red): System fault
- **[M]** (Yellow): Force mode active

## Reset and Recovery Procedures

**Soft Reset (Warm Reset):**
- Via CDSB operator unit: [Service] → [Control] → "Reset"
- Via CODESYS: Online → Reset (Warm)
- Retains remanent variables

**Stop Application:**
- Run/stop switch → Stop position
- Via CDSB operator unit: [Service] → [Control] → "Stop"
- Via CODESYS: Online → Stop

**Start Application:**
- Run/stop switch → Run position
- Via CDSB operator unit: [Service] → [Control] → "Start"
- Via CODESYS: Online → Start

**Factory Reset (IP Configuration):**
- Set rotary switches to **999**
- Restart controller
- EtherNet/IP IP resets to 192.168.1.1 (DHCP active)

**Firmware Recovery:**
- Controller enters bootloader mode (LED [MS] and [NS] orange)
- Use Festo service tools to upload firmware
- Automatic recovery via firmware update with backup/restore

**Reboot Controller:**
- Via Festo service tools (port 10002)
- Via CODESYS: Device → Reboot
- Power cycle

**Diagnostics via Web Server:**
1. Connect PC to controller via Ethernet
2. Open browser: `http://<controller-IP>` (default: 192.168.0.1)
3. Available pages:
   - **CPX Terminal**: Module config/addressing
   - **CI**: Execute commands
   - **System**: Diagnostics, controller info, manufacturer info
   - **CODESYS**: License information

## Technical Specifications

| Parameter | CPX-E-CEC-C1-EP | CPX-E-CEC-M1-EP |
|-----------|-----------------|-----------------|
| **Module Code** | 222/102 | 222/103 |
| **Programming** | CODESYS V3 | CODESYS V3 + SoftMotion |
| **Dimensions (L×W×H)** | 124.3 × 75.9 × 82.5 mm (incl. cover) | 124.3 × 75.9 × 82.5 mm (incl. cover) |
| **Weight** | 288 g (incl. linkage element) | 288 g (incl. linkage element) |
| **Operating Voltage** | 24 V DC ±25% (UEL/SEN) | 24 V DC ±25% (UEL/SEN) |
| **Current Consumption** | Typically 150 mA @ 24 V | Typically 150 mA @ 24 V |
| **Reverse Polarity Protection** | Yes (UEL/SEN) | Yes (UEL/SEN) |
| **Mains Buffering** | 20 ms | 20 ms |
| **Mounting Position** | Vertical / Horizontal | Vertical / Horizontal |
| **Ambient Temp (Vertical)** | –5 to +60 °C | –5 to +60 °C |
| **Ambient Temp (Horizontal)** | –5 to +50 °C | –5 to +50 °C |
| **Storage Temp** | –20 to +70 °C | –20 to +70 °C |
| **Humidity** | 0–95% (non-condensing) | 0–95% (non-condensing) |
| **Degree of Protection** | IP20 | IP20 |
| **EMC** | EN 61000-6-2/-4 | EN 61000-6-2/-4 |
| **Ethernet Transmission** | 10/100 Mbps (full/half duplex) | 10/100 Mbps (full/half duplex) |
| **Max Cable Length** | 100 m @ 100 Mbps | 100 m @ 100 Mbps |
| **EtherCAT Protocol** | EtherCAT Master | EtherCAT Master |
| **EtherNet/IP Protocol** | Scanner/Adapter (RT) | Scanner/Adapter (RT) |

**UL Certification (USA/Canada):**
| Parameter | Value |
|-----------|-------|
| **Category Code** | NRAQ/NRAQ7 |
| **File Number** | E239998 |
| **Standards** | UL 61010-1, UL 61010-2-201, CSA C22.2 No. 61010-1-12, CSA C22.2 No. 61010-2-201 |
| **Pollution Degree** | 3 |
| **Installation** | Indoor use only |
| **Max Installation Height** | 2000 m |
| **UEL/SEN Current (XD1 only)** | ≤ 4 A |
| **UEL/SEN Current (XD1 + XD2)** | > 4 to 8 A (parallel connection required) |

**Power Supply Connections [XD1], [XD2]:**
| Terminal | Signal |
|----------|--------|
| XD1.0, XD2.0 | +24 V DC (UEL/SEN) |
| XD1.1, XD2.1 | (internally connected to XD1.0, XD2.0) |
| XD1.2, XD2.2 | 0 V DC (UEL/SEN) |
| XD1.3, XD2.3 | (internally connected to XD1.2, XD2.2) |

## CDSB Operator Unit (Optional)

**Overview:**
- Optional accessory: plug-in HMI display with touch screen
- Mount: Direct plug to controller (remove protective cover)
- Display: Touch-sensitive areas for navigation

**Menu Structure:**
- **[Diagnosis]**: Status, messages, device info, network, IE device
- **[Bus Systems]**: System bus, EtherCAT modules
- **[Settings]**: Network config, timeout
- **[Service]**: Start/Stop/Reset control
- **[Brightness/Orientation/Calibration/Info]**: General CDSB settings

**Key Functions:**
- Display controller status (Ready / No project / Error)
- View active diagnostic messages
- View/edit IP configuration (IP, subnet, gateway)
- Start/stop/reset CODESYS application (requires run/stop switch in Run)
- View module configuration

## Cyber Security

**Network Isolation:**
- Protect controller networks with:
  - Firewall
  - Intrusion Prevention System (IPS)
  - Network segmentation / VLANs
  - VPN for remote access
  - Physical port security

**Password Protection:**
- CODESYS application password (optional)
- Note: Access password only prevents unintentional modification, not security breach

**Secure Protocols:**
- HTTPS for web visualisation (port 443, configurable)
- Use VPN for remote access
- Disable unused services/ports in CODESYS project

**Best Practices:**
- Only expose necessary ports (disable FTP, web server if not needed)
- Use static IP instead of DHCP in production
- Regularly update firmware
- Implement application-level authentication
- Follow IEC 62443, ISO/IEC 27001 guidelines

**Reference:**
- Cyber security info: www.festo.com/psirt

## Diagnostics and Error Handling

**Diagnostics Methods:**
1. **LED Indicators**: Immediate visual status (power, network, errors)
2. **CDSB Operator Unit**: Status display, messages, device info
3. **Web Server**: Browser-based diagnostics (http://<IP>)
4. **CODESYS Online**: Full diagnostics, variable monitoring, task info
5. **Festo Software**: FFT, FMT, FAS for advanced diagnostics
6. **EtherCAT Diagnostics**: SDO access, diagnostics history (object 0x10F3)

**EtherCAT Diagnostics History (Object 0x10F3):**
- Stores up to 20 diagnostic messages from EtherCAT slaves
- Messages include: error code, timestamp, module number, channel
- Text IDs reference ESI file for clear text descriptions
- Operating modes:
  - **Overwrite mode** (bit 4 = 0): Oldest message overwritten
  - **Acknowledge mode** (bit 4 = 1): Must acknowledge before new message
- Emergency messages: Enable via sub-index 5, bit 0

**Common Error Codes (Emergency Messages):**
| Code (Hex) | Meaning |
|------------|---------|
| 00 00 | No error |
| 10 00 | General error |
| 23 20 | Short circuit at outputs |
| 23 30 | Load dump (wire break) |
| 31 20 | Input voltage too low |
| 33 20 | Output voltage too low |
| 50 00 | Hardware error (error > 128) |

**Error Register Bits (Byte 2):**
| Bit | Meaning |
|-----|---------|
| 0 | Generic error (set for any error) |
| 1 | Current (short circuit, overload) |
| 2 | Voltage (undervoltage, load failure) |
| 4 | Communication error (node guard, heartbeat) |
| 7 | Manufacturer specific (wire break, other) |

## Troubleshooting / FAQ

### Q1: Controller LED [MS] flashing red – what does this mean?
**A:** Recoverable error detected. Check CPX-E configuration in CODESYS:
- Verify all modules in device tree match physical configuration
- Check EtherCAT slave device configuration
- Review diagnostics messages via web server or CDSB operator unit
- Use CODESYS online diagnostics to identify specific errors

### Q2: Cannot connect to controller via CODESYS – network timeout error
**A:** Check network connectivity and IP configuration:
1. Verify Ethernet cable connected to ETH1 or ETH2 (not XF1/XF2)
2. Confirm controller IP address (rotary switch, CDSB, or scan Festo devices)
3. Ensure PC and controller on same subnet (e.g., 192.168.0.x)
4. Check LED [LA ETH1]/[LA ETH2] is lit or flashing
5. Disable PC firewall temporarily to test
6. Verify CODESYS gateway settings (correct IP, ports 11740–11743 not blocked)

### Q3: CODESYS application won't start – "No project loaded" error on CDSB
**A:** Check the following:
- Run/stop switch must be in **Run** position (under front cover)
- CODESYS boot application must be downloaded: Online → Create Boot Application
- Verify no compile errors in CODESYS project
- Check controller firmware version compatible with CODESYS version
- If LED [Run] is off, application is not running

### Q4: EtherCAT slaves not communicating – LED [LA EC] off
**A:** Troubleshoot EtherCAT bus:
1. Check EtherCAT cable connections (port [EC] on controller)
2. Verify EtherCAT slaves are powered and LED indicators active
3. Scan EtherCAT network in CODESYS: Device → Scan for Devices
4. Verify ESI files installed for all EtherCAT devices
5. Check diagnostics object 0x10F3 for EtherCAT slave errors
6. Ensure correct topology (line/star) and cable length ≤ 100 m per segment

### Q5: SD card not accessible from CODESYS application
**A:** Verify SD card compatibility and formatting:
- Use only Festo-approved card: CAMC-M-MS-G32-G2 (max 32 GB)
- Format as FAT32, single partition
- Mount point: `/mnt/sdcard` (use SysFile or CAA.File libraries)
- Check card inserted fully into slot
- SD card slot is for user-monitored operation only (no continuous logging)
- Controller restart may be required after inserting card

### Q6: How do I perform a factory reset of the IP address?
**A:** Reset EtherNet/IP IP to factory default:
1. Turn off controller power
2. Set all three rotary switches to position **9** (999)
3. Power on controller
4. Wait for boot complete (LED [MS] green)
5. IP resets to 192.168.1.1 (DHCP active)
6. Set rotary switches to desired IP (0 = use internal config, 1–254 = custom)
7. Restart controller

**Note:** This only resets EtherNet/IP ports [XF1]/[XF2]. Ethernet ports [ETH1]/[ETH2] must be reset via CODESYS or CDSB operator unit.
