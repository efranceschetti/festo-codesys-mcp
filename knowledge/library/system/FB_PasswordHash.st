(* =============================================================
   FB_PasswordHash — FNV-1a 64-bit Password Hash with Salt (local ACL)

   Category:     System
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Generic primitive for a local machine access-control list (operator
   login): "register" creates a hash, "log in" compares hashes. It reads
   the string buffer byte by byte. Deterministic: the same password + salt
   always produces the same hash.

   FNV-1a 64-bit ALGORITHM:
     hash := OFFSET_BASIS ; hash := hash XOR salt ; hash := hash * PRIME
     for each byte c of the password: hash := (hash XOR c) * PRIME

   NOT cryptographically secure (reversible, no work factor). Sufficient for
   an INTERNAL machine ACL with no network exposure. If exposed to the
   internet, replace with SHA-256 + salt / PBKDF2.

   Usage:
     fbHash(sPassword := '...', nSalt := <salt>);  => fbHash.nHash
   ============================================================= *)
FUNCTION_BLOCK FB_PasswordHash
VAR_INPUT
    sPassword : STRING(40);   (* plaintext password (memory only, never persisted) *)
    nSalt     : DWORD;         (* per-account 32-bit salt *)
END_VAR
VAR_OUTPUT
    nHash     : ULINT;         (* FNV-1a 64-bit hash of password + salt *)
END_VAR
VAR
    nIdx      : INT;           (* byte index into the string buffer *)
    nLen      : INT;           (* password length *)
    cChar     : USINT;         (* current byte code *)
END_VAR
VAR CONSTANT
    cFNV_OFFSET_64 : ULINT := 16#CBF29CE484222325;  (* FNV-1a 64-bit offset basis *)
    cFNV_PRIME_64  : ULINT := 16#100000001B3;        (* FNV 64-bit prime *)
END_VAR

(* offset basis -> mix in the salt (XOR + multiply) *)
nHash := cFNV_OFFSET_64;
nHash := nHash XOR DWORD_TO_ULINT(nSalt);
nHash := nHash * cFNV_PRIME_64;

(* mix each BYTE (real ASCII code) of the password; read the buffer by index
   so that alphabetic passwords do not collide (STRING_TO_USINT would apply a
   numeric conversion instead) *)
nLen := LEN(sPassword);
nIdx := 0;
WHILE nIdx < nLen DO
    cChar := TO_USINT(sPassword[nIdx]);
    nHash := nHash XOR USINT_TO_ULINT(cChar);
    nHash := nHash * cFNV_PRIME_64;
    nIdx := nIdx + 1;
END_WHILE

END_FUNCTION_BLOCK
