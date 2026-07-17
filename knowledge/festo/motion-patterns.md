---
id: festo-motion-patterns
title: Motion Control ST Code Patterns (Power, Home, Move, Stop)
priority: MEDIUM
use_when:
  - need ready-to-use ST code snippets for servo motion
  - implementing power-on, homing, absolute move, jog, or emergency stop
never_use_when:
  - need full FB signatures (see festo-ptp-reference)
  - simple motors without EtherCAT
keywords: [motion pattern, power-on, homing, absolute move, jog, emergency stop, fbPwr, fbHome, fbMoveAbs, ST snippet, motion code example, power on axis, homing code, move code, ready-to-use motion, servo code template, how to move an axis, quick stop code]
see_also: [festo-ptp, ethercat-cia402, state-machines]
---

# Festo Motion Control Patterns (CiA 402 + PLCopen)

## Axis Power-On
```iecst
fbPwr(Axis := stAxis, Enable := bEnbPwr,
      Enable_Positive := TRUE, Enable_Negative := TRUE);
bAxisRdy := fbPwr.Status;
```

## Homing
```iecst
fbHome(Axis := stAxis, Execute := bAxisRdy AND bHomeCmd, Position := 0.0);
bHomeDone := fbHome.Done;
```

## Absolute Move
```iecst
fbMoveAbs(Axis := stAxis, Execute := bMoveCmd,
          Position := rTgtPos, Velocity := rMaxVel,
          Acceleration := rAcc, Deceleration := rDec);
```

## Velocity Move (Jog)
```iecst
fbMoveVel(Axis := stAxis, Execute := bJogCmd,
          Velocity := rJogSpd, Acceleration := rAcc);
```

## Emergency Stop
```iecst
fbStp(Axis := stAxis, Execute := bEmgStp, Deceleration := rEmgDec);
IF fbStp.Done THEN bEnbPwr := FALSE; END_IF
```
