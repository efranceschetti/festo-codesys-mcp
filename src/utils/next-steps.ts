/**
 * Next-step hints — appended to successful tool results so the agent
 * always knows the next action in the pipeline. One line, deterministic.
 * Keyed by tool name (plus ':variant' for outcome-dependent hints).
 */
const NEXT_STEPS: Record<string, string> = {
  'create_function_block':      'review_st_code (conventions) -> debug_plc_code (runtime bugs) -> generate_plcopen_xml when the project is ready for CODESYS import.',
  'create_program':             'review_st_code, then debug_plc_code. Include this PRG in a task configuration when importing.',
  'create_data_type':           'reference this type in your FB/GVL declarations. Run generate_plcopen_xml when all POUs are ready.',
  'create_gvl':                 'reference variables as GVL_Name.VarName (qualified_only is enforced). Run review_st_code on POUs that use it.',
  'create_project_structure':   'create types first, then GVLs, then FBs (search plc_library before each new FB), then programs. Finish with generate_plcopen_xml.',
  'generate_plcopen_xml':       'validate_plcopen_xml (fast gate), then validate_plcopen_xsd, then validate_plcopen_semantic. Do not import into CODESYS before all three pass.',
  'validate_plcopen_xml:valid': 'validate_plcopen_xsd for strict schema validation, then validate_plcopen_semantic.',
  'validate_plcopen_xml:fix':   'fix the issues above in the .st sources, re-run generate_plcopen_xml, then validate again. Do not import.',
  'validate_plcopen_xsd:valid': 'validate_plcopen_semantic to confirm no variables/initializers were dropped.',
  'validate_plcopen_semantic:valid': 'XML is import-ready. In CODESYS: File -> Import PLCopen XML, then Build -> Generate Code (expect 0 errors).',
  'plc_library:no_match':       'no reusable block found. Load plc_knowledge topics conventions + state-machines, then create_function_block.',
  'plc_library:get':            'adapt the block (rename, adjust IO), then review_st_code on the result.',
  'plc_knowledge:conventions':  'also load topic abbreviations before writing code.',
  'plc_knowledge:ground-truth': 'also load topic xml-rules, then generate_plcopen_xml -> validation chain.',
  'review_st_code:clean':       'debug_plc_code for runtime-bug analysis.',
  'debug_plc_code:clean':       'generate_plcopen_xml when all POUs are ready for import.',
  'explain_error_code:found':   'if this is a drive fault, plc_knowledge topic festo-ptp (library errors) or read_manual hw-cmmt-servo has recovery procedures.',
};

export function appendNextStep(text: string, key: string): string {
  const hint = NEXT_STEPS[key];
  return hint ? `${text}\n\n---\nNext: ${hint}` : text;
}

export { NEXT_STEPS };
