---
id: codesys-recipe-manager
title: CODESYS Recipe Manager — API, .txtrecipe Format, and Gotchas
priority: HIGH
token_estimate: 3600
use_when:
  - storing and recalling machine parameter sets / recipes on a CODESYS PLC
  - saving or loading operator recipes from Structured Text
  - decoding a Recipe Management return code or GetLastInfo bitmask
  - a recipe "saved" from the HMI but did not persist / disappears on power-cycle
  - putting an ARRAY OF STRUCT into a Recipe Definition
  - understanding the textual .txtrecipe file format for a parser or twin
never_use_when:
  - the parameters survive power-off on their own (use VAR_GLOBAL PERSISTENT RETAIN — see codesys-gotchas)
  - you need MQTT/cloud telemetry, not on-PLC recipes (see festo-mqtt)
related: [codesys-gotchas, ground-truth, plc-architecture-patterns]
keywords: [recipe manager, recipe management, save parameters, load recipe, parameter set, batch settings, product recipe, txtrecipe, RecipeManCommands, LoadAndWriteRecipe, SaveRecipe, CreateRecipe, recipe definition, recipe not found, ERR_RECIPE_MISMATCH, GetLastError, GetLastInfo, storage path, PlcLogic, IecFilePath, recipe not saving, recipe disappears after power cycle, array of struct recipe, wildcard rejected, update structured variables, recipe returns error code, persist machine settings, formula, save current values]
see_also: [codesys-gotchas, ground-truth, plc-architecture-patterns]
---

# CODESYS Recipe Manager

> The Recipe Manager stores named **parameter sets** (recipes) in textual
> `.txtrecipe` files on the PLC and writes them back into your process variables.
> Use it for operator-selectable product recipes. Do NOT use it for values that
> just need to survive power-off — that is `VAR_GLOBAL PERSISTENT RETAIN`
> (see `codesys-gotchas`). This topic is written against **Recipe Management
> 4.7.x** (bundled with recent V3.5 service packs); older 3.3.x had ARRAY OF
> STRUCT bugs — prefer 4.7+.

## 1. The moving parts

1. **Recipe Manager** object (Application → Add Object → Recipe Manager). One per
   application. Holds the storage settings.
2. **Recipe Definition(s)** (child objects, e.g. `RcpDef_Product`). Each is a
   *list of fully-qualified variable paths* that make up one family of recipe.
3. **Recipe(s)** (children of a definition, e.g. `_default`). Each is one saved
   set of values for the definition's variables, serialized to one `.txtrecipe`.
4. **`RecipeManCommands`** — the ST function block you call at runtime to
   load/save/create/delete/query recipes.

A common pattern: mirror each recipe family into a typed "active recipe" struct
in a GVL (e.g. `GVL_ActiveRecipe.stProduct`), point the Recipe Definition at the
struct's members, and let the rest of the program read only the struct.

## 2. `RecipeManCommands` API

Instantiate `Recipe_Management.RecipeManCommands`. All commands return a `UDINT`
result you compare against `Recipe_Management.ReturnValues.ERR_OK`.

| Group | Method | Purpose |
|-------|--------|---------|
| **Load/Save** | `LoadAndWriteRecipe(sDef, sName) : UDINT` | load file **and** write values into the PLC variables (the usual "apply recipe") |
| | `SaveRecipe(sDef, sName) : UDINT` | read current PLC values and write them to the file |
| | `LoadRecipe(sDef, sName) : UDINT` | load file into memory without applying |
| | `WriteRecipe(sDef, sName) : UDINT` | apply an already-loaded recipe |
| | `LoadFromAndWriteRecipe(sDef, sName, sPath) : UDINT` | load from an external path + apply |
| | `ReadRecipe(sDef, sName) : UDINT` | read current values into memory (no file) |
| | `ReadAndSaveRecipe(sDef, sName) : UDINT` | read current values **and** save to file |
| **CRUD** | `CreateRecipe(sDef, sName) : UDINT` | create a new recipe from current values |
| | `CreateRecipeNoSave(sDef, sName) : UDINT` | create in memory without writing the file |
| | `DeleteRecipe(sDef, sName) : UDINT` | delete recipe (memory + file) |
| | `DeleteRecipeFile(sDef, sName) : UDINT` | delete only the file, keep it in memory |
| | `ReloadRecipes(sDef) : UDINT` | rescan the filesystem for recipe files |
| **Query** | `GetRecipeCount(sDef) : INT` | number of recipes in a definition |
| | `GetRecipeNamesSizeOf(sDef, ADR(arr), iSize, iMax, iScroll)` | list recipe names — **prefer this**, the older `GetRecipeNames` mishandled explicit STRING lengths |
| | `GetRecipeValuesSizeOf(...)` / `SetRecipeValues(...)` | inspect / edit values by index |
| **Config** | `SetStoragePath(sPath) : UDINT` | change the storage path at runtime (rare) |
| **Error** | `GetLastError() : UDINT` | error state after Save/Create/Delete |
| | `GetLastInfo() : UDINT` | info bitmask after Load/Read operations |
| | `ResetLastError()` / `ResetLastInfo()` | clear the stored state |

### GetLastInfo vs GetLastError — which to call

- **`GetLastInfo()`** after: `LoadAndWriteRecipe`, `LoadRecipe`,
  `LoadFromAndWriteRecipe`, `ReadAndSaveRecipe` (it returns an *info bitmask*, not
  a hard error — a partial variable match is info, not failure).
- **`GetLastError()`** after: `SaveRecipe`, `CreateRecipe`, `DeleteRecipe`, and
  general operations.

### Typical usage

```iecst
VAR
    fbRecipe : Recipe_Management.RecipeManCommands;
    nResult  : UDINT;
END_VAR

// APPLY on startup / on operator select
nResult := fbRecipe.LoadAndWriteRecipe('RcpDef_Product', '_default');
IF nResult = Recipe_Management.ReturnValues.ERR_OK THEN
    GVL_Bus.bRecipe_LoadError := FALSE;
ELSE
    GVL_Bus.nRecipe_LastCode := fbRecipe.GetLastInfo();   // bitmask, see below
    GVL_Bus.bRecipe_LoadError := TRUE;
END_IF

// SAVE — guard it: never overwrite the active recipe during production
IF NOT GVL_Bus.bProductionActive THEN
    nResult := fbRecipe.SaveRecipe('RcpDef_Product', sNewName);
    IF nResult <> Recipe_Management.ReturnValues.ERR_OK THEN
        GVL_Bus.nRecipe_LastCode := fbRecipe.GetLastError();
    END_IF
END_IF
```

## 3. ReturnValues (`Recipe_Management.ReturnValues`)

| Constant | Hex | Dec | Meaning |
|----------|-----|-----|---------|
| `ERR_OK` | `16#0` | 0 | success |
| `ERR_FAILED` | `16#1` | 1 | generic failure |
| `ERR_PARAMETER` | `16#2` | 2 | bad parameter |
| `ERR_NOTINITIALIZED` | `16#3` | 3 | data server not initialized |
| `ERR_NOTIMPLEMENTED` | `16#C` | 12 | data server does not implement the interface |
| `ERR_NO_OBJECT` | `16#10` | 16 | not all variables are writable via the data server |
| `ERR_NOMEMORY` | `16#11` | 17 | data server out of memory |
| `ERR_RECIPE_FILE_NOT_FOUND` | `16#4000` | 16384 | the `.txtrecipe` file does not exist |
| `ERR_RECIPE_MISMATCH` | `16#4001` | 16385 | file schema ≠ definition (a variable was renamed/removed) |
| `ERR_RECIPE_SAVE_ERR` | `16#4002` | 16386 | save failed (disk full, invalid path, blocked extension) |
| `ERR_RECIPE_NOT_FOUND` | `16#4003` | 16387 | recipe name does not exist (load of an unknown name) |
| `ERR_RECIPE_DEFINITION_NOT_FOUND` | `16#4004` | 16388 | recipe definition does not exist |
| `ERR_RECIPE_ALREADY_EXIST` | `16#4005` | 16389 | create of a duplicate name |
| `ERR_NO_RECIPE_MANAGER_SET` | `16#4006` | 16390 | "Recipe management in the PLC" is OFF in settings |
| `ERR_RECIPE_NOT_ALL_VARIABLES_WERE_LOADED` | `16#4007` | 16391 | definition has more variables than the file (info, not fatal) |
| `ERR_RECIPE_NOMEMORY` | `16#4008` | 16392 | out of memory to create the recipe |
| `ERR_RECIPE_MANAGER_LOCKED_DURING_ONLINE_CHANGE` | `16#4009` | 16393 | locked during an online change |

The four you handle most: `ERR_RECIPE_FILE_NOT_FOUND` (16#4000),
`ERR_RECIPE_MISMATCH` (16#4001), `ERR_RECIPE_NOT_FOUND` (16#4003),
`ERR_NO_RECIPE_MANAGER_SET` (16#4006).

## 4. InfoValues — the `GetLastInfo()` bitmask

`GetLastInfo()` returns a **combinable bitmask** (multiple bits at once):

| Constant | Hex | Dec | Meaning |
|----------|-----|-----|---------|
| `NO_INFO` | `16#0` | 0 | no info |
| `INFO_RECIPE_MANAGER_NOT_ALL_VARIABLES_FOUND` | `16#1` | 1 | some app variables are missing from the file (older file) |
| `INFO_RECIPE_MANAGER_OTHER_VARIABLES_FOUND` | `16#2` | 2 | the file has variables the app no longer has (deleted var) |
| `INFO_RECIPE_MANAGER_ONE_OR_MORE_VARIABLES_FOUND` | `16#4` | 4 | at least one variable matched |
| `INFO_RECIPE_MANAGER_ALL_VARIABLES_FOUND` | `16#8` | 8 | every variable matched (the ideal outcome) |

An ideal load returns `16#C` (`ALL_VARIABLES_FOUND | ONE_OR_MORE`) — bits 8+4.

## 5. The `.txtrecipe` file format

The textual format is one `path:=value` per line. Know these particulars — a
parser or a test twin must reproduce them exactly.

| Item | Value |
|------|-------|
| Encoding | **UTF-8 with BOM** (an invisible BOM as the first bytes) |
| Line ending | CRLF |
| Separator | `:=` exactly, **no spaces** around it |
| Header | **none** — the recipe and definition names come from the *filename* |
| `BOOL` | `TRUE` / `FALSE` (uppercase) |
| `TIME` | `T#5S` (uppercase, simplified per unit) |
| `REAL` | trailing zeros truncated — you write `100.0`, the file stores `100` |
| `STRING` | single quotes: `'text'` |
| Empty value | the line ends right after `:=` (uninitialized variable) |
| Array index | always concrete `[N]` — **never** `[*]` |
| Path | fully qualified, no `Application.` prefix: `GVL_ActiveRecipe.stProduct.aSteps[0].rPosition` |

Filename pattern (flat layout, one folder): `<recipe>.<definition>.txtrecipe`,
e.g. `_default.RcpDef_Product.txtrecipe`. There are **no** per-definition
subfolders — the suffix disambiguates families.

Example (BOM shown as `<BOM>`; note truncated REAL, empty lines, single quotes):

```text
<BOM>GVL_ActiveRecipe.stProduct.aSteps[0].rPosition:=100
GVL_ActiveRecipe.stProduct.aSteps[0].bActive:=TRUE
GVL_ActiveRecipe.stProduct.aSteps[1].rPosition:=
GVL_ActiveRecipe.stProduct.aSteps[1].bActive:=
GVL_ActiveRecipe.stProduct.tFinalDwell:=T#5S
GVL_ActiveRecipe.stProduct.sName:='ProductA'
```

A parser must: accept the BOM; parse only `path:=value` lines (no header); treat
an empty value as "keep the default"; parse `T#5S` (uppercase); read a REAL that
lost its `.0` (`100` → `100.0`); and take the definition/recipe identity from the
filename, not the content.

## 6. A generic recipe schema

Keep the recipe data in typed structs and point the Recipe Definition at them.
A scalar header + a fixed ARRAY OF STRUCT of steps is a good, general shape:

```iecst
TYPE ST_RecipeHeader :
STRUCT
    sName        : STRING(31);   (* recipe name (also the filename stem) *)
    sMaterial    : STRING(31);   (* free-text material / product code *)
    eType        : E_RecipeType; (* which family this recipe belongs to *)
    rPartLength  : REAL;         (* mm *)
END_STRUCT
END_TYPE

TYPE ST_RecipeStep :
STRUCT
    rPosition : REAL;   (* mm *)
    rVelocity : REAL;   (* mm/s *)
    rSetpoint : REAL;   (* process setpoint for this step *)
    tDwell    : TIME;   (* dwell at position *)
    bActive   : BOOL;   (* enable this step's output *)
END_STRUCT
END_TYPE

TYPE ST_RecipeData :
STRUCT
    stHeader  : ST_RecipeHeader;
    nSteps    : INT;                    (* how many of aSteps are used *)
    aSteps    : ARRAY[0..39] OF ST_RecipeStep;
END_STRUCT
END_TYPE
```

## 7. Gotchas (each costs hours to rediscover)

### 7.1 Wildcard `[*]` is accepted by the editor but rejected by the compiler
Typing `GVL_ActiveRecipe.stProduct.aSteps[*].rPosition` into a Recipe Definition
*looks* fine — the editor even reports the element type (REAL). But **Build
fails**: `C0007: expected an expression instead of '*'`. The `[*]` is a false
lead. **Correct approach:** add ONE representative index-0 path per struct field
(`aSteps[0].rPosition`, `aSteps[0].rVelocity`, …), then right-click →
**"Update structured variables"**. CODESYS expands each representative across the
whole array (e.g. 10 fields × 40 indices = 400 concrete paths) — 10 clicks + one
expand instead of 400 rows by hand.

### 7.2 A storage path outside the PLC sandbox is rejected SILENTLY
For security, the runtime refuses to write recipe files outside its own file
sandbox (`PlcLogic`). An absolute path like `C:\temp\...` on the Recipe Manager
object produces **no error** — the HMI reports "saved", the recipe even loads
from memory, but **no file is written** and it vanishes on power-cycle. **Always
use a RELATIVE storage path.** CODESYS resolves it under the runtime placeholder
`$IecFilePath$`:

| Platform | `$IecFilePath$` resolves to |
|----------|-----------------------------|
| Linux runtime (e.g. embedded controllers) | `/var/opt/codesys/PlcLogic/...` |
| Windows soft-PLC | `C:\ProgramData\CODESYS\CODESYSControlWinV3x64\<id>\PlcLogic\...` |

> **Verify the exact relative form on the real target.** The relative string that
> resolves correctly is runtime-dependent — forms such as `PlcLogic/Recipes/` and
> `./Recipes/` have each been the *only* one that produced a file on a given
> controller, while the other silently duplicated the folder. After Download,
> confirm the file actually exists (Device → Files → Runtime side) before trusting
> that saving works. The context-menu "Save recipe…" command *does* accept an
> arbitrary path (handy for capturing a file during development) — do not confuse
> it with the Recipe Manager object's storage-path field, which does not.

### 7.3 The Recipe Manager does NOT export via PLCopen XML
The Recipe Manager object and its Recipe Definitions live in the proprietary
`.project`, not in a PLCopen XML export. If your build pipeline round-trips code
through PLCopen XML (import a generated `master` XML), the Recipe Manager is
**not** carried across and must be recreated manually after a full re-import.
Treat Recipe Manager setup as a **one-time manual step** and avoid full
re-imports once it exists.

### 7.4 Auto-save is not reliable — trigger saves explicitly
"Save recipe changes to recipes automatically" does not work dependably across
versions. Keep it **OFF** on purpose (it also prevents accidental overwrite of
the active recipe during production) and drive every save explicitly:
- on the first scan, `LoadAndWriteRecipe(...)` a known `_default` so the machine
  boots with valid parameters;
- on an operator SAVE, call `SaveRecipe(...)` (guarded, so it never overwrites
  during production);
- `CreateRecipe` alone does **not** always write the file — follow with
  `ReadAndSaveRecipe` (or the UI "Read and Save Recipe" during commissioning) if
  the file does not appear.

### 7.5 "Save current values per recipe = ON" is required for a template
Turn this ON so the recipe you edit in the Recipe Editor (e.g. `_default`) is
serialized to its `.txtrecipe` during Download — that file is the prerequisite
for a first-scan `LoadAndWriteRecipe('RcpDef_Product', '_default')` to find
anything to load.
