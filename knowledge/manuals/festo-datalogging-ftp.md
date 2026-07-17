# Data Logging via FTP — Application Note 100257

> Festo Application Note for data logging from CODESYS PLC to USB flash drive using SysFile library functions.

## Overview

This document explains how to log PLC data to a CSV file on a USB flash drive using File Handling functions of CODESYS (SysFile library).

**Key capabilities:**
- Create, open, write, and close files on USB storage
- Log PLC variables to CSV format at configurable intervals
- Automatic file rotation after N samples
- Error detection via CMPErrors library

## Components

| Type | Version |
|------|---------|
| CODESYS | V3.5 SP12 |
| CPX-E-CEC Package | V3.5.12.75 |
| CPX-E-CEC-C1-PN | Firmware V1.1.18 |

---

## SysFile Library Functions

> **Prerequisite**: Add the `SysFile` library to the project before using file handling functions.

### SysFileOpen

Opens an existing file or creates a new file.

```iecst
hFile := SysFileOpen(
    szFile   := sFilePath,     // STRING — full path to file
    am       := AM_WRITE,      // Access mode: AM_WRITE (create/overwrite) or AM_APPEND (append)
    pResult  := ADR(eResult)   // RTS_IEC_RESULT — error code
);
```

**Access Modes:**
| Mode | Behavior |
|------|----------|
| `AM_WRITE` | Creates new file or overwrites existing |
| `AM_APPEND` | Opens existing file for appending data |
| `AM_READ` | Opens for reading only |

### SysFileWrite

Writes data to an open file.

```iecst
nBytesWritten := SysFileWrite(
    hFile    := hFile,          // RTS_IEC_HANDLE — from SysFileOpen
    pbyBuffer := ADR(sData),   // POINTER TO BYTE — data to write
    ulSize   := SIZEOF(sData), // __XWORD — number of bytes
    pResult  := ADR(eResult)   // RTS_IEC_RESULT — error code
);
```

### SysFileClose

Closes an open file handle. **Always close files after writing.**

```iecst
eResult := SysFileClose(hFile := hFile);
```

---

## File Paths by Platform

| Platform | USB Path | Example |
|----------|----------|---------|
| **CPX-E-CEC** | `$usb$/` | `$usb$/DataSample.csv` |
| **CDPX panels** | `/USBMemory/` | `/USBMemory/DataSample.csv` |

---

## Data Logging Procedure

### Step 1 — Build the file path

Concatenate directory and filename:

```iecst
sFilePath := CONCAT('$usb$/', sFileName);
// Result: '$usb$/DataSample_1.csv'
```

### Step 2 — Open the file

**New file** (first time or after rotation):
```iecst
hFile := SysFileOpen(
    szFile  := sFilePath,
    am      := AM_WRITE,       // Creates new file
    pResult := ADR(eResult)
);
```

**Existing file** (append next sample):
```iecst
hFile := SysFileOpen(
    szFile  := sFilePath,
    am      := AM_APPEND,      // Append to existing
    pResult := ADR(eResult)
);
```

### Step 3 — Write data

```iecst
// Format data as CSV line
sLine := CONCAT(REAL_TO_STRING(rTemperature), ',');
sLine := CONCAT(sLine, REAL_TO_STRING(rPressure));
sLine := CONCAT(sLine, '$N');  // Newline

nWritten := SysFileWrite(
    hFile    := hFile,
    pbyBuffer := ADR(sLine),
    ulSize   := INT_TO_UDINT(LEN(sLine)),
    pResult  := ADR(eResult)
);
```

### Step 4 — Close the file

```iecst
eResult := SysFileClose(hFile := hFile);
```

---

## Sample Program Architecture

### Inputs
| Parameter | Type | Description |
|-----------|------|-------------|
| `sDirectoryPath` | STRING | USB folder (e.g. `$usb$`) |
| `sFileName` | STRING | Base filename (e.g. `DataSample`) |
| `nSamplesPerFile` | INT | Samples before creating new file (e.g. 100) |
| `tLogInterval` | TIME | Interval between logs (e.g. T#1S) |

### Program Flow

1. Concatenate `sDirectoryPath` + `sFileName` → generate full path (e.g. `$usb$/DataSample_1.csv`)
2. When file counter reaches `nSamplesPerFile`, create new file (increment suffix: `_1`, `_2`, ...)
3. For new files: open with `AM_WRITE`
4. For existing files: open with `AM_APPEND`
5. Write CSV data with `SysFileWrite`
6. Close file with `SysFileClose`
7. Handle errors — display via visualization

### Error Handling

| Error | Meaning |
|-------|---------|
| `RTS_INVALID_HANDLE` (16#FFFFFFFF) | File handling done incorrectly (wrong path, USB not inserted, etc.) |
| Other CMPErrors values | Check `CMPErrors` library for specific error codes |

---

## Important Notes

- **USB write cycles**: Flash drives support 10,000–100,000 write/erase cycles. Plan logging frequency accordingly.
- **Always close files**: Unclosed files may corrupt data or lose the last write buffer.
- **File rotation**: Implement automatic rotation to avoid single files growing too large.
- **Error checking**: Always check `pResult` after each SysFile operation.
- **CSV format**: Use comma separator and `$N` (newline) for line breaks in Structured Text strings.
- **String escaping in ST**: `$N` = newline, `$R` = carriage return, `$T` = tab, `$$` = literal dollar sign.
