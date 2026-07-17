(* =============================================================
   FB_ButtonLamp — Illuminated Pushbutton Controller

   Category:     Actuators
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls an illuminated pushbutton with multiple lamp modes:
   - OFF: Lamp off
   - ON: Lamp solid on
   - BLINK_SLOW: 1Hz blink (500ms on / 500ms off)
   - BLINK_FAST: 4Hz blink (125ms on / 125ms off)

   Also provides edge detection on the button input.

   Usage:
     fbStart : FB_ButtonLamp;
     fbStart(bButton := bDI_StartBtn, nLampMode := 1);
     bStartPressed := fbStart.bPressed;
     bStartLamp    := fbStart.bLamp;
   ============================================================= *)
FUNCTION_BLOCK FB_ButtonLamp
VAR_INPUT
    bButton     : BOOL;                (* Button input (NO contact) *)
    nLampMode   : INT := 0;            (* 0=OFF, 1=ON, 2=BLINK_SLOW, 3=BLINK_FAST *)
END_VAR
VAR_OUTPUT
    bLamp       : BOOL;                (* Lamp output *)
    bPressed    : BOOL;                (* Button is pressed (debounced) *)
    bRising     : BOOL;                (* Rising edge on button *)
    bFalling    : BOOL;                (* Falling edge on button *)
END_VAR
VAR
    tonDebounce : TON;
    rtrigBtn    : R_TRIG;
    ftrigBtn    : F_TRIG;
    tonBlinkOn  : TON;
    tonBlinkOff : TON;
    bBlinkState : BOOL;
    tOnTime     : TIME;
    tOffTime    : TIME;
END_VAR

(* Debounce button *)
tonDebounce(IN := bButton, PT := T#30MS);
bPressed := tonDebounce.Q;

(* Edge detection *)
rtrigBtn(CLK := bPressed);
ftrigBtn(CLK := bPressed);
bRising := rtrigBtn.Q;
bFalling := ftrigBtn.Q;

(* Lamp control *)
CASE nLampMode OF
0: (* OFF *)
    bLamp := FALSE;

1: (* Solid ON *)
    bLamp := TRUE;

2: (* Blink slow — 1Hz *)
    tOnTime := T#500MS;
    tOffTime := T#500MS;
    IF NOT bBlinkState THEN
        tonBlinkOff(IN := TRUE, PT := tOffTime);
        IF tonBlinkOff.Q THEN
            bBlinkState := TRUE;
            tonBlinkOff(IN := FALSE, PT := tOffTime);
        END_IF
    ELSE
        tonBlinkOn(IN := TRUE, PT := tOnTime);
        IF tonBlinkOn.Q THEN
            bBlinkState := FALSE;
            tonBlinkOn(IN := FALSE, PT := tOnTime);
        END_IF
    END_IF
    bLamp := bBlinkState;

3: (* Blink fast — 4Hz *)
    tOnTime := T#125MS;
    tOffTime := T#125MS;
    IF NOT bBlinkState THEN
        tonBlinkOff(IN := TRUE, PT := tOffTime);
        IF tonBlinkOff.Q THEN
            bBlinkState := TRUE;
            tonBlinkOff(IN := FALSE, PT := tOffTime);
        END_IF
    ELSE
        tonBlinkOn(IN := TRUE, PT := tOnTime);
        IF tonBlinkOn.Q THEN
            bBlinkState := FALSE;
            tonBlinkOn(IN := FALSE, PT := tOnTime);
        END_IF
    END_IF
    bLamp := bBlinkState;

ELSE
    bLamp := FALSE;
END_CASE

END_FUNCTION_BLOCK
