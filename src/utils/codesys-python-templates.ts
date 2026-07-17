/**
 * CODESYS V3.5 Script Engine — IronPython templates
 *
 * Original source: codesys-mcp-toolkit (Johannes Pettersson, MIT 2025).
 * Absorbed verbatim from the upstream project's server implementation.
 * See NOTICE.md for attribution.
 *
 * These templates are run by `services/codesys-interop.ts` via
 * `CODESYS.exe --runscript=<temp.py> --profile=<name> --noUI`.
 *
 * Placeholder convention: literal `{TOKEN}` placeholders are replaced at
 * runtime by `fillTemplate()` below. Inner `${SNIPPET}` interpolations
 * are TypeScript template-literal expansions evaluated at module load.
 */

// -----------------------------------------------------------------------------
// Snippets (helper code reused across multiple templates via ${...})
// -----------------------------------------------------------------------------

export const ENSURE_PROJECT_OPEN_PYTHON_SNIPPET = `
import sys
import scriptengine as script_engine
import os
import time
import traceback

# --- Function to ensure the correct project is open ---
MAX_RETRIES = 3
RETRY_DELAY = 2.0 # seconds (use float for time.sleep)

def ensure_project_open(target_project_path):
    print("DEBUG: Ensuring project is open: %s" % target_project_path)
    # Normalize target path once
    normalized_target_path = os.path.normcase(os.path.abspath(target_project_path))

    for attempt in range(MAX_RETRIES):
        print("DEBUG: Ensure project attempt %d/%d for %s" % (attempt + 1, MAX_RETRIES, normalized_target_path))
        primary_project = None
        try:
            primary_project = script_engine.projects.primary
        except Exception as primary_err:
             print("WARN: Error getting primary project: %s. Assuming none." % primary_err)
             primary_project = None

        current_project_path = ""
        project_ok = False

        if primary_project:
            try:
                current_project_path = os.path.normcase(os.path.abspath(primary_project.path))
                print("DEBUG: Current primary project path: %s" % current_project_path)
                if current_project_path == normalized_target_path:
                    print("DEBUG: Target project path matches primary. Checking access...")
                    try:
                         _ = len(primary_project.get_children(False))
                         print("DEBUG: Target project '%s' is primary and accessible." % target_project_path)
                         project_ok = True
                         return primary_project
                    except Exception as access_err:
                         print("WARN: Primary project access check failed for '%s': %s. Will attempt reopen." % (current_project_path, access_err))
                         primary_project = None
                else:
                     print("DEBUG: Primary project is '%s', not the target '%s'." % (current_project_path, normalized_target_path))
                     primary_project = None

            except Exception as path_err:
                 print("WARN: Could not get path of current primary project: %s. Assuming not the target." % path_err)
                 primary_project = None

        if not project_ok:
            if primary_project is None and current_project_path == "":
                print("DEBUG: No primary project detected. Attempting to open target: %s" % target_project_path)
            elif primary_project is None and current_project_path != "":
                 print("DEBUG: Primary project was '%s' but failed access check or needed close. Attempting to open target: %s" % (current_project_path, target_project_path))
            else:
                print("DEBUG: Target project not primary or initial check failed. Attempting to open/reopen: %s" % target_project_path)

            try:
                update_mode = script_engine.VersionUpdateFlags.NoUpdates | script_engine.VersionUpdateFlags.SilentMode

                opened_project = None
                try:
                     print("DEBUG: Calling script_engine.projects.open('%s', update_flags=%s)..." % (target_project_path, update_mode))
                     opened_project = script_engine.projects.open(target_project_path, update_flags=update_mode)

                     if not opened_project:
                         print("ERROR: projects.open returned None for %s on attempt %d" % (target_project_path, attempt + 1))
                     else:
                         print("DEBUG: projects.open call returned an object for: %s" % target_project_path)
                         print("DEBUG: Pausing for stabilization after open...")
                         time.sleep(RETRY_DELAY)
                         recheck_primary = None
                         try: recheck_primary = script_engine.projects.primary
                         except Exception as recheck_primary_err: print("WARN: Error getting primary project after reopen: %s" % recheck_primary_err)

                         if recheck_primary:
                              recheck_path = ""
                              try:
                                  recheck_path = os.path.normcase(os.path.abspath(recheck_primary.path))
                              except Exception as recheck_path_err:
                                  print("WARN: Failed to get path after reopen: %s" % recheck_path_err)

                              if recheck_path == normalized_target_path:
                                   print("DEBUG: Target project confirmed as primary after reopening.")
                                   try:
                                       _ = len(recheck_primary.get_children(False))
                                       print("DEBUG: Reopened project basic access confirmed.")
                                       return recheck_primary
                                   except Exception as access_err_reopen:
                                        print("WARN: Reopened project (%s) basic access check failed: %s." % (normalized_target_path, access_err_reopen))
                              else:
                                   print("WARN: Different project is primary after reopening! Expected '%s', got '%s'." % (normalized_target_path, recheck_path))
                         else:
                               print("WARN: No primary project found after reopening attempt %d!" % (attempt+1))

                except Exception as open_err:
                     print("ERROR: Exception during projects.open call on attempt %d: %s" % (attempt + 1, open_err))
                     traceback.print_exc()

            except Exception as outer_open_err:
                 print("ERROR: Unexpected error during open setup/logic attempt %d: %s" % (attempt + 1, outer_open_err))
                 traceback.print_exc()

        if attempt < MAX_RETRIES - 1:
            print("DEBUG: Ensure project attempt %d did not succeed. Waiting %f seconds..." % (attempt + 1, RETRY_DELAY))
            time.sleep(RETRY_DELAY)
        else:
             print("ERROR: Failed all ensure_project_open attempts for %s." % normalized_target_path)


    raise RuntimeError("Failed to ensure project '%s' is open and accessible after %d attempts." % (target_project_path, MAX_RETRIES))
# --- End of function ---

# Placeholder for the project file path (must be set in scripts using this snippet)
PROJECT_FILE_PATH = r"{PROJECT_FILE_PATH}"
`;

export const FIND_OBJECT_BY_PATH_PYTHON_SNIPPET = `
import traceback
# --- Find object by path function ---
def find_object_by_path_robust(start_node, full_path, target_type_name="object"):
    print("DEBUG: Finding %s by path: '%s'" % (target_type_name, full_path))
    normalized_path = full_path.replace('\\\\', '/').strip('/')
    path_parts = normalized_path.split('/')
    if not path_parts:
        print("ERROR: Path is empty.")
        return None

    project = start_node
    if not hasattr(start_node, 'active_application') and hasattr(start_node, 'project'):
         try: project = start_node.project
         except Exception as proj_ref_err:
             print("WARN: Could not get project reference from start_node: %s" % proj_ref_err)

    app = None
    if hasattr(project, 'active_application'):
        try: app = project.active_application
        except Exception: pass
        if not app:
            try:
                 apps = project.find("Application", True)
                 if apps: app = apps[0]
            except Exception: pass

    app_name_lower = ""
    if app:
        try: app_name_lower = (app.get_name() or "application").lower()
        except Exception: app_name_lower = "application"

    current_obj = start_node
    if hasattr(project, 'active_application'):
        if app and path_parts[0].lower() == app_name_lower:
             print("DEBUG: Path starts with Application name '%s'. Beginning search there." % path_parts[0])
             current_obj = app
             path_parts = path_parts[1:]
             if not path_parts:
                 print("DEBUG: Target path is the Application object itself.")
                 return current_obj
        else:
            print("DEBUG: Path does not start with Application name. Starting search from project root.")
            current_obj = project
    else:
         print("DEBUG: Starting search from originally provided node.")


    parent_path_str = getattr(current_obj, 'get_name', lambda: str(current_obj))()

    for i, part_name in enumerate(path_parts):
        is_last_part = (i == len(path_parts) - 1)
        print("DEBUG: Searching for part [%d/%d]: '%s' under '%s'" % (i+1, len(path_parts), part_name, parent_path_str))
        found_in_parent = None
        try:
            children_of_current = current_obj.get_children(False)
            print("DEBUG: Found %d direct children under '%s'." % (len(children_of_current), parent_path_str))
            for child in children_of_current:
                 child_name = getattr(child, 'get_name', lambda: None)()
                 if child_name == part_name:
                     found_in_parent = child
                     print("DEBUG: Found direct child matching '%s'." % part_name)
                     break

            if not found_in_parent and is_last_part:
                 print("DEBUG: Direct find failed for last part '%s'. Trying recursive find under '%s'." % (part_name, parent_path_str))
                 found_recursive_list = current_obj.find(part_name, True)
                 if found_recursive_list:
                     found_in_parent = found_recursive_list[0]
                     print("DEBUG: Found last part '%s' recursively." % part_name)
                 else:
                     print("DEBUG: Recursive find also failed for last part '%s'." % part_name)

            if found_in_parent:
                current_obj = found_in_parent
                parent_path_str = getattr(current_obj, 'get_name', lambda: part_name)()
                print("DEBUG: Stepped into '%s'." % parent_path_str)
            else:
                print("ERROR: Path part '%s' not found under '%s'." % (part_name, parent_path_str))
                return None

        except Exception as find_err:
            print("ERROR: Exception while searching for '%s' under '%s': %s" % (part_name, parent_path_str, find_err))
            traceback.print_exc()
            return None

    final_expected_name = full_path.split('/')[-1]
    found_final_name = getattr(current_obj, 'get_name', lambda: None)()

    if found_final_name == final_expected_name:
        print("DEBUG: Final %s found and name verified for path '%s': %s" % (target_type_name, full_path, found_final_name))
        return current_obj
    else:
        print("ERROR: Traversal ended on object '%s' but expected final name was '%s'." % (found_final_name, final_expected_name))
        return None
# --- End of find object function ---
`;

// -----------------------------------------------------------------------------
// Full scripts (one per tool)
// -----------------------------------------------------------------------------

export const CHECK_STATUS_SCRIPT = `
import sys, scriptengine as script_engine, os, traceback
project_open = False; project_name = "No project open"; project_path = "N/A"; scripting_ok = False
try:
    scripting_ok = True; primary_project = script_engine.projects.primary
    if primary_project:
        project_open = True
        try:
            project_path = os.path.normcase(os.path.abspath(primary_project.path))
            try:
                 project_name = primary_project.get_name()
                 if not project_name: project_name = "Unnamed (path: %s)" % os.path.basename(project_path)
            except: project_name = "Unnamed (path: %s)" % os.path.basename(project_path)
        except Exception as e_path: project_path = "N/A (Error: %s)" % e_path; project_name = "Unnamed (Path Error)"
    print("Project Open: %s" % project_open); print("Project Name: %s" % project_name)
    print("Project Path: %s" % project_path); print("Scripting OK: %s" % scripting_ok)
    print("SCRIPT_SUCCESS: Status check complete."); sys.exit(0)
except Exception as e:
    error_message = "Error during status check: %s" % e
    print(error_message); print("Scripting OK: False")
    print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const OPEN_PROJECT_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
try:
    project = ensure_project_open(PROJECT_FILE_PATH)
    proj_name = "Unknown"
    try:
        if project: proj_name = project.get_name() or os.path.basename(PROJECT_FILE_PATH)
        else: proj_name = os.path.basename(PROJECT_FILE_PATH) + " (ensure_project_open returned None?)"
    except Exception:
        proj_name = os.path.basename(PROJECT_FILE_PATH) + " (name retrieval failed)"
    print("Project Opened: %s" % proj_name)
    print("SCRIPT_SUCCESS: Project opened successfully.")
    sys.exit(0)
except Exception as e:
    error_message = "Error opening project %s: %s" % (PROJECT_FILE_PATH, e)
    print(error_message)
    traceback.print_exc()
    print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const CREATE_PROJECT_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, shutil, time, traceback
# Placeholders
TEMPLATE_PROJECT_PATH = r'{TEMPLATE_PROJECT_PATH}' # Path to Standard.project
PROJECT_FILE_PATH = r'{PROJECT_FILE_PATH}'    # Path for the new project (Target Path)
try:
    print("DEBUG: Python script create_project (copy from template):")
    print("DEBUG:   Template Source = %s" % TEMPLATE_PROJECT_PATH)
    print("DEBUG:   Target Path = %s" % PROJECT_FILE_PATH)
    if not PROJECT_FILE_PATH: raise ValueError("Target project file path empty.")
    if not TEMPLATE_PROJECT_PATH: raise ValueError("Template project file path empty.")
    if not os.path.exists(TEMPLATE_PROJECT_PATH): raise IOError("Template project file not found: %s" % TEMPLATE_PROJECT_PATH)

    target_dir = os.path.dirname(PROJECT_FILE_PATH)
    if not os.path.exists(target_dir): print("DEBUG: Creating target directory: %s" % target_dir); os.makedirs(target_dir)
    if os.path.exists(PROJECT_FILE_PATH): print("WARN: Target project file already exists, overwriting: %s" % PROJECT_FILE_PATH)

    print("DEBUG: Copying '%s' to '%s'..." % (TEMPLATE_PROJECT_PATH, PROJECT_FILE_PATH))
    shutil.copy2(TEMPLATE_PROJECT_PATH, PROJECT_FILE_PATH)
    print("DEBUG: File copy complete.")

    print("DEBUG: Opening the copied project: %s" % PROJECT_FILE_PATH)
    update_mode = script_engine.VersionUpdateFlags.NoUpdates | script_engine.VersionUpdateFlags.SilentMode

    project = script_engine.projects.open(PROJECT_FILE_PATH, update_flags=update_mode)
    print("DEBUG: script_engine.projects.open returned: %s" % project)
    if project:
        print("DEBUG: Pausing briefly after open...")
        time.sleep(1.0)
        try:
            print("DEBUG: Explicitly saving project after opening copy...")
            project.save();
            print("DEBUG: Project save after opening copy succeeded.")
        except Exception as save_err:
             print("WARN: Explicit save after opening copy failed: %s" % save_err)
        print("Project Created from Template Copy at: %s" % PROJECT_FILE_PATH)
        print("SCRIPT_SUCCESS: Project copied from template and opened successfully.")
        sys.exit(0)
    else:
        error_message = "Failed to open project copy %s after copying template %s. projects.open returned None." % (PROJECT_FILE_PATH, TEMPLATE_PROJECT_PATH)
        print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error creating project '%s' from template '%s': %s\\n%s" % (PROJECT_FILE_PATH, TEMPLATE_PROJECT_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: Error copying/opening template: %s" % e); sys.exit(1)
`;

export const SAVE_PROJECT_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
try:
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    project_name = "Unknown"
    try:
        if primary_project: project_name = primary_project.get_name() or os.path.basename(PROJECT_FILE_PATH)
        else: project_name = os.path.basename(PROJECT_FILE_PATH) + " (ensure_project_open returned None?)"
    except Exception:
        project_name = os.path.basename(PROJECT_FILE_PATH) + " (name retrieval failed)"

    print("DEBUG: Saving project: %s (%s)" % (project_name, PROJECT_FILE_PATH))
    primary_project.save()
    print("DEBUG: project.save() executed.")
    print("Project Saved: %s" % project_name)
    print("SCRIPT_SUCCESS: Project saved successfully.")
    sys.exit(0)
except Exception as e:
    error_message = "Error saving project %s: %s" % (PROJECT_FILE_PATH, e)
    print(error_message)
    traceback.print_exc()
    print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const CREATE_POU_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
POU_NAME = "{POU_NAME}"; POU_TYPE_STR = "{POU_TYPE_STR}"; IMPL_LANGUAGE_STR = "{IMPL_LANGUAGE_STR}"; PARENT_PATH_REL = "{PARENT_PATH}"
pou_type_map = { "Program": script_engine.PouType.Program, "FunctionBlock": script_engine.PouType.FunctionBlock, "Function": script_engine.PouType.Function }

try:
    print("DEBUG: create_pou script: Name='%s', Type='%s', Lang='%s', ParentPath='%s', Project='%s'" % (POU_NAME, POU_TYPE_STR, IMPL_LANGUAGE_STR, PARENT_PATH_REL, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not POU_NAME: raise ValueError("POU name empty.")
    if not PARENT_PATH_REL: raise ValueError("Parent path empty.")

    pou_type_enum = pou_type_map.get(POU_TYPE_STR)
    if not pou_type_enum: raise ValueError("Invalid POU type string: %s. Use Program, FunctionBlock, or Function." % POU_TYPE_STR)

    parent_object = find_object_by_path_robust(primary_project, PARENT_PATH_REL, "parent container")
    if not parent_object: raise ValueError("Parent object not found for path: %s" % PARENT_PATH_REL)

    parent_name = getattr(parent_object, 'get_name', lambda: str(parent_object))()
    print("DEBUG: Using parent object: %s (Type: %s)" % (parent_name, type(parent_object).__name__))

    if not hasattr(parent_object, 'create_pou'):
        raise TypeError("Parent object '%s' of type %s does not support create_pou." % (parent_name, type(parent_object).__name__))

    lang_guid = None
    print("DEBUG: Setting language to None (will use default).")

    print("DEBUG: Calling parent_object.create_pou: Name='%s', Type=%s, Lang=%s" % (POU_NAME, pou_type_enum, lang_guid))

    new_pou = parent_object.create_pou(
        name=POU_NAME,
        type=pou_type_enum,
        language=lang_guid
    )

    print("DEBUG: parent_object.create_pou returned: %s" % new_pou)
    if new_pou:
        new_pou_name = getattr(new_pou, 'get_name', lambda: POU_NAME)()
        print("DEBUG: POU object created: %s" % new_pou_name)

        try:
            print("DEBUG: Saving Project...")
            primary_project.save()
            print("DEBUG: Project saved successfully after POU creation.")
        except Exception as save_err:
            print("ERROR: Failed to save Project after POU creation: %s" % save_err)
            detailed_error = traceback.format_exc()
            error_message = "Error saving Project after creating POU '%s': %s\\n%s" % (new_pou_name, save_err, detailed_error)
            print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)

        print("POU Created: %s" % new_pou_name); print("Type: %s" % POU_TYPE_STR); print("Language: %s (Defaulted)" % IMPL_LANGUAGE_STR); print("Parent Path: %s" % PARENT_PATH_REL)
        print("SCRIPT_SUCCESS: POU created successfully."); sys.exit(0)
    else:
        error_message = "Failed to create POU '%s'. create_pou returned None." % POU_NAME; print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error creating POU '%s' in project '%s': %s\\n%s" % (POU_NAME, PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: Error creating POU '%s': %s" % (POU_NAME, e)); sys.exit(1)
`;

export const SET_POU_CODE_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
POU_FULL_PATH = "{POU_FULL_PATH}"
DECLARATION_CONTENT = """{DECLARATION_CONTENT}"""
IMPLEMENTATION_CONTENT = """{IMPLEMENTATION_CONTENT}"""

try:
    print("DEBUG: set_pou_code script: POU_FULL_PATH='%s', Project='%s'" % (POU_FULL_PATH, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not POU_FULL_PATH: raise ValueError("POU full path empty.")

    target_object = find_object_by_path_robust(primary_project, POU_FULL_PATH, "target object")
    if not target_object: raise ValueError("Target object not found using path: %s" % POU_FULL_PATH)

    target_name = getattr(target_object, 'get_name', lambda: POU_FULL_PATH)()
    print("DEBUG: Found target object: %s" % target_name)

    declaration_updated = False
    has_declaration_content = 'DECLARATION_CONTENT' in locals() or 'DECLARATION_CONTENT' in globals()
    if has_declaration_content and DECLARATION_CONTENT is not None:
        if hasattr(target_object, 'textual_declaration'):
            decl_obj = target_object.textual_declaration
            if decl_obj and hasattr(decl_obj, 'replace'):
                try:
                    print("DEBUG: Accessing textual_declaration...")
                    decl_obj.replace(DECLARATION_CONTENT)
                    print("DEBUG: Set declaration text using replace().")
                    declaration_updated = True
                except Exception as decl_err:
                    print("ERROR: Failed to set declaration text: %s" % decl_err)
                    traceback.print_exc()
            else:
                 print("WARN: Target '%s' textual_declaration attribute is None or does not have replace(). Skipping declaration update." % target_name)
        else:
            print("WARN: Target '%s' does not have textual_declaration attribute. Skipping declaration update." % target_name)
    else:
         print("DEBUG: Declaration content not provided or is None. Skipping declaration update.")


    implementation_updated = False
    has_implementation_content = 'IMPLEMENTATION_CONTENT' in locals() or 'IMPLEMENTATION_CONTENT' in globals()
    if has_implementation_content and IMPLEMENTATION_CONTENT is not None:
        if hasattr(target_object, 'textual_implementation'):
            impl_obj = target_object.textual_implementation
            if impl_obj and hasattr(impl_obj, 'replace'):
                try:
                    print("DEBUG: Accessing textual_implementation...")
                    impl_obj.replace(IMPLEMENTATION_CONTENT)
                    print("DEBUG: Set implementation text using replace().")
                    implementation_updated = True
                except Exception as impl_err:
                     print("ERROR: Failed to set implementation text: %s" % impl_err)
                     traceback.print_exc()
            else:
                 print("WARN: Target '%s' textual_implementation attribute is None or does not have replace(). Skipping implementation update." % target_name)
        else:
            print("WARN: Target '%s' does not have textual_implementation attribute. Skipping implementation update." % target_name)
    else:
        print("DEBUG: Implementation content not provided or is None. Skipping implementation update.")


    if declaration_updated or implementation_updated:
        try:
            print("DEBUG: Saving Project (after code change)...")
            primary_project.save()
            print("DEBUG: Project saved successfully after code change.")
        except Exception as save_err:
            print("ERROR: Failed to save Project after setting code: %s" % save_err)
            detailed_error = traceback.format_exc()
            error_message = "Error saving Project after code change for '%s': %s\\n%s" % (target_name, save_err, detailed_error)
            print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
    else:
         print("DEBUG: No code parts were updated, skipping project save.")

    print("Code Set For: %s" % target_name)
    print("Path: %s" % POU_FULL_PATH)
    print("SCRIPT_SUCCESS: Declaration and/or implementation set successfully."); sys.exit(0)

except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error setting code for object '%s' in project '%s': %s\\n%s" % (POU_FULL_PATH, PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const CREATE_PROPERTY_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
PARENT_POU_FULL_PATH = "{PARENT_POU_FULL_PATH}"
PROPERTY_NAME = "{PROPERTY_NAME}"
PROPERTY_TYPE = "{PROPERTY_TYPE}"

try:
    print("DEBUG: create_property script: ParentPOU='%s', Name='%s', Type='%s', Project='%s'" % (PARENT_POU_FULL_PATH, PROPERTY_NAME, PROPERTY_TYPE, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not PARENT_POU_FULL_PATH: raise ValueError("Parent POU full path empty.")
    if not PROPERTY_NAME: raise ValueError("Property name empty.")
    if not PROPERTY_TYPE: raise ValueError("Property type empty.")

    parent_pou_object = find_object_by_path_robust(primary_project, PARENT_POU_FULL_PATH, "parent POU")
    if not parent_pou_object: raise ValueError("Parent POU object not found: %s" % PARENT_POU_FULL_PATH)

    parent_pou_name = getattr(parent_pou_object, 'get_name', lambda: PARENT_POU_FULL_PATH)()
    print("DEBUG: Found Parent POU object: %s" % parent_pou_name)

    if not hasattr(parent_pou_object, 'create_property'):
         raise TypeError("Parent object '%s' of type %s does not support create_property." % (parent_pou_name, type(parent_pou_object).__name__))

    lang_guid = None
    print("DEBUG: Calling create_property: Name='%s', Type='%s', Lang=%s" % (PROPERTY_NAME, PROPERTY_TYPE, lang_guid))

    new_property_object = parent_pou_object.create_property(
        name=PROPERTY_NAME,
        return_type=PROPERTY_TYPE,
        language=lang_guid
    )

    if new_property_object:
        new_prop_name = getattr(new_property_object, 'get_name', lambda: PROPERTY_NAME)()
        print("DEBUG: Property object created: %s" % new_prop_name)

        try:
            print("DEBUG: Saving Project (after property creation)...")
            primary_project.save()
            print("DEBUG: Project saved successfully after property creation.")
        except Exception as save_err:
            print("ERROR: Failed to save Project after creating property: %s" % save_err)
            detailed_error = traceback.format_exc()
            error_message = "Error saving Project after creating property '%s': %s\\n%s" % (PROPERTY_NAME, save_err, detailed_error)
            print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)

        print("Property Created: %s" % new_prop_name)
        print("Parent POU: %s" % PARENT_POU_FULL_PATH)
        print("Type: %s" % PROPERTY_TYPE)
        print("SCRIPT_SUCCESS: Property created successfully."); sys.exit(0)
    else:
         error_message = "Failed to create property '%s' under '%s'. create_property returned None." % (PROPERTY_NAME, parent_pou_name)
         print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)

except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error creating property '%s' under POU '%s' in project '%s': %s\\n%s" % (PROPERTY_NAME, PARENT_POU_FULL_PATH, PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const CREATE_METHOD_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
PARENT_POU_FULL_PATH = "{PARENT_POU_FULL_PATH}"
METHOD_NAME = "{METHOD_NAME}"
RETURN_TYPE = "{RETURN_TYPE}"

try:
    print("DEBUG: create_method script: ParentPOU='%s', Name='%s', ReturnType='%s', Project='%s'" % (PARENT_POU_FULL_PATH, METHOD_NAME, RETURN_TYPE, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not PARENT_POU_FULL_PATH: raise ValueError("Parent POU full path empty.")
    if not METHOD_NAME: raise ValueError("Method name empty.")

    parent_pou_object = find_object_by_path_robust(primary_project, PARENT_POU_FULL_PATH, "parent POU")
    if not parent_pou_object: raise ValueError("Parent POU object not found: %s" % PARENT_POU_FULL_PATH)

    parent_pou_name = getattr(parent_pou_object, 'get_name', lambda: PARENT_POU_FULL_PATH)()
    print("DEBUG: Found Parent POU object: %s" % parent_pou_name)

    if not hasattr(parent_pou_object, 'create_method'):
         raise TypeError("Parent object '%s' of type %s does not support create_method." % (parent_pou_name, type(parent_pou_object).__name__))

    lang_guid = None
    actual_return_type = RETURN_TYPE if RETURN_TYPE else None
    print("DEBUG: Calling create_method: Name='%s', ReturnType=%s, Lang=%s" % (METHOD_NAME, actual_return_type, lang_guid))

    new_method_object = parent_pou_object.create_method(
        name=METHOD_NAME,
        return_type=actual_return_type,
        language=lang_guid
    )

    if new_method_object:
        new_meth_name = getattr(new_method_object, 'get_name', lambda: METHOD_NAME)()
        print("DEBUG: Method object created: %s" % new_meth_name)

        try:
            print("DEBUG: Saving Project (after method creation)...")
            primary_project.save()
            print("DEBUG: Project saved successfully after method creation.")
        except Exception as save_err:
            print("ERROR: Failed to save Project after creating method: %s" % save_err)
            detailed_error = traceback.format_exc()
            error_message = "Error saving Project after creating method '%s': %s\\n%s" % (METHOD_NAME, save_err, detailed_error)
            print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)

        print("Method Created: %s" % new_meth_name)
        print("Parent POU: %s" % PARENT_POU_FULL_PATH)
        print("Return Type: %s" % (RETURN_TYPE if RETURN_TYPE else "(None)"))
        print("SCRIPT_SUCCESS: Method created successfully."); sys.exit(0)
    else:
         error_message = "Failed to create method '%s' under '%s'. create_method returned None." % (METHOD_NAME, parent_pou_name)
         print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)

except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error creating method '%s' under POU '%s' in project '%s': %s\\n%s" % (METHOD_NAME, PARENT_POU_FULL_PATH, PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const COMPILE_PROJECT_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
try:
    print("DEBUG: compile_project script: Project='%s'" % PROJECT_FILE_PATH)
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    project_name = os.path.basename(PROJECT_FILE_PATH)
    target_app = None
    app_name = "N/A"

    try:
        target_app = primary_project.active_application
        if target_app:
            app_name = getattr(target_app, 'get_name', lambda: "Unnamed App (Active)")()
            print("DEBUG: Found active application: %s" % app_name)
    except Exception as active_err:
        print("WARN: Could not get active application: %s. Searching..." % active_err)

    if not target_app:
        print("DEBUG: Searching for first compilable application...")
        apps = []
        try:
             all_children = primary_project.get_children(True)
             for child in all_children:
                  if hasattr(child, 'is_application') and child.is_application and hasattr(child, 'build'):
                       app_name_found = getattr(child, 'get_name', lambda: "Unnamed App")()
                       print("DEBUG: Found potential application object: %s" % app_name_found)
                       apps.append(child)
                       break
        except Exception as find_err: print("WARN: Error finding application object: %s" % find_err)

        if not apps: raise RuntimeError("No compilable application found in project '%s'" % project_name)
        target_app = apps[0]
        app_name = getattr(target_app, 'get_name', lambda: "Unnamed App (First Found)")()
        print("WARN: Compiling first found application: %s" % app_name)

    print("DEBUG: Calling build() on app '%s'..." % app_name)
    if not hasattr(target_app, 'build'):
         raise TypeError("Selected object '%s' is not an application or doesn't support build()." % app_name)

    target_app.build();
    print("DEBUG: Build command executed for application '%s'." % app_name)

    print("Compile Initiated For Application: %s" % app_name); print("In Project: %s" % project_name)
    print("SCRIPT_SUCCESS: Application compilation initiated."); sys.exit(0)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error initiating compilation for project %s: %s\\n%s" % (PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback, json
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}

def get_object_structure(obj, indent=0, max_depth=10):
    lines = []; indent_str = "  " * indent
    if indent > max_depth:
        lines.append("%s- Max recursion depth reached." % indent_str)
        return lines
    try:
        name = "Unnamed"; obj_type = type(obj).__name__
        guid_str = ""
        folder_str = ""
        try:
            name = getattr(obj, 'get_name', lambda: "Unnamed")() or "Unnamed"
            if hasattr(obj, 'guid'): guid_str = " {%s}" % obj.guid
            if hasattr(obj, 'is_folder') and obj.is_folder: folder_str = " [Folder]"
        except Exception as name_err:
             print("WARN: Error getting name/guid/folder status for an object: %s" % name_err)
             name = "!!! Error Getting Name !!!"

        lines.append("%s- %s (%s)%s%s" % (indent_str, name, obj_type, folder_str, guid_str))

        children = []
        can_have_children = hasattr(obj, 'get_children') and (
            not hasattr(obj, 'is_folder') or
            (hasattr(obj, 'is_folder') and obj.is_folder) or
             hasattr(obj, 'is_project') or hasattr(obj, 'is_application') or hasattr(obj, 'is_device') or hasattr(obj,'is_pou')
        )

        if can_have_children:
            try:
                children = obj.get_children(False)
            except Exception as get_child_err:
                lines.append("%s  ERROR getting children: %s" % (indent_str, get_child_err))

        for child in children:
            lines.extend(get_object_structure(child, indent + 1, max_depth))

    except Exception as e:
        lines.append("%s- Error processing node: %s" % (indent_str, e))
        traceback.print_exc()
    return lines

def get_object_structure_dict(obj, depth=0, max_depth=15):
    """Return a JSON-serializable nested dict instead of indented text lines."""
    if depth > max_depth:
        return {"name": "(max depth)", "type": "Truncated", "children": []}
    node = {"name": "Unnamed", "type": type(obj).__name__, "children": []}
    try:
        try: node["name"] = getattr(obj, 'get_name', lambda: "Unnamed")() or "Unnamed"
        except Exception: node["name"] = "!!! Error Getting Name !!!"
        try:
            if hasattr(obj, 'guid'): node["guid"] = str(obj.guid)
        except Exception: pass
        if hasattr(obj, 'is_folder'):
            try: node["isFolder"] = bool(obj.is_folder)
            except Exception: pass
        if hasattr(obj, 'is_device'):
            try: node["isDevice"] = bool(obj.is_device)
            except Exception: pass
        if hasattr(obj, 'is_application'):
            try: node["isApplication"] = bool(obj.is_application)
            except Exception: pass
        if hasattr(obj, 'is_pou'):
            try: node["isPou"] = bool(obj.is_pou)
            except Exception: pass
        if hasattr(obj, 'is_project'):
            try: node["isProject"] = bool(obj.is_project)
            except Exception: pass

        children = []
        can_have_children = hasattr(obj, 'get_children') and (
            not hasattr(obj, 'is_folder') or
            (hasattr(obj, 'is_folder') and obj.is_folder) or
            hasattr(obj, 'is_project') or hasattr(obj, 'is_application') or hasattr(obj, 'is_device') or hasattr(obj, 'is_pou')
        )
        if can_have_children:
            try: children = obj.get_children(False)
            except Exception as ch_err: node["childrenError"] = "%s" % ch_err
        for child in children:
            node["children"].append(get_object_structure_dict(child, depth + 1, max_depth))
    except Exception as e:
        node["error"] = "%s" % e
    return node

try:
    print("DEBUG: Getting structure for: %s" % PROJECT_FILE_PATH)
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    project_name = os.path.basename(PROJECT_FILE_PATH)
    print("DEBUG: Getting structure for project: %s" % project_name)
    structure_list = get_object_structure(primary_project, max_depth=15)
    structure_output = "\\n".join(structure_list)
    print("\\n--- PROJECT STRUCTURE START ---")
    print(structure_output)
    print("--- PROJECT STRUCTURE END ---\\n")
    # Also emit JSON-structured payload for machine-readable consumers (tools).
    try:
        structure_dict = get_object_structure_dict(primary_project, max_depth=15)
        json_payload = {
            "projectPath": PROJECT_FILE_PATH,
            "projectName": project_name,
            "tree": structure_dict,
        }
        print("SCRIPT_RESULT_JSON:" + json.dumps(json_payload))
    except Exception as json_err:
        print("WARN: JSON serialization failed: %s" % json_err)
    print("SCRIPT_SUCCESS: Project structure retrieved."); sys.exit(0)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error getting structure for %s: %s\\n%s" % (PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const GET_POU_CODE_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback, json
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
POU_FULL_PATH = "{POU_FULL_PATH}"
DECL_START_MARKER = "### POU DECLARATION START ###"; DECL_END_MARKER = "### POU DECLARATION END ###"
IMPL_START_MARKER = "### POU IMPLEMENTATION START ###"; IMPL_END_MARKER = "### POU IMPLEMENTATION END ###"

try:
    print("DEBUG: Getting code: POU_FULL_PATH='%s', Project='%s'" % (POU_FULL_PATH, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not POU_FULL_PATH: raise ValueError("POU full path empty.")

    target_object = find_object_by_path_robust(primary_project, POU_FULL_PATH, "target object")
    if not target_object: raise ValueError("Target object not found using path: %s" % POU_FULL_PATH)

    target_name = getattr(target_object, 'get_name', lambda: POU_FULL_PATH)()
    print("DEBUG: Found target object: %s" % target_name)

    declaration_code = ""; implementation_code = ""
    has_declaration = False; has_implementation = False

    if hasattr(target_object, 'textual_declaration'):
        decl_obj = target_object.textual_declaration
        if decl_obj and hasattr(decl_obj, 'text'):
            try:
                declaration_code = decl_obj.text
                has_declaration = True
                print("DEBUG: Got declaration text.")
            except Exception as decl_read_err:
                print("ERROR: Failed to read declaration text: %s" % decl_read_err)
                declaration_code = "/* ERROR reading declaration: %s */" % decl_read_err
        else:
            print("WARN: textual_declaration exists but is None or has no 'text' attribute.")
    else:
        print("WARN: No textual_declaration attribute.")

    if hasattr(target_object, 'textual_implementation'):
        impl_obj = target_object.textual_implementation
        if impl_obj and hasattr(impl_obj, 'text'):
            try:
                implementation_code = impl_obj.text
                has_implementation = True
                print("DEBUG: Got implementation text.")
            except Exception as impl_read_err:
                print("ERROR: Failed to read implementation text: %s" % impl_read_err)
                implementation_code = "/* ERROR reading implementation: %s */" % impl_read_err
        else:
            print("WARN: textual_implementation exists but is None or has no 'text' attribute.")
    else:
        print("WARN: No textual_implementation attribute.")


    print("Code retrieved for: %s" % target_name)
    print("\\n" + DECL_START_MARKER)
    print(declaration_code)
    print(DECL_END_MARKER + "\\n")
    print(IMPL_START_MARKER)
    print(implementation_code)
    print(IMPL_END_MARKER + "\\n")

    # Also emit JSON-structured payload for machine-readable consumers (tools).
    try:
        json_payload = {
            "projectPath": PROJECT_FILE_PATH,
            "pouPath": POU_FULL_PATH,
            "name": target_name,
            "type": type(target_object).__name__,
            "declaration": declaration_code,
            "implementation": implementation_code,
            "hasDeclaration": has_declaration,
            "hasImplementation": has_implementation,
        }
        print("SCRIPT_RESULT_JSON:" + json.dumps(json_payload))
    except Exception as json_err:
        print("WARN: JSON serialization failed: %s" % json_err)

    print("SCRIPT_SUCCESS: Code retrieved."); sys.exit(0)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error getting code for object '%s' in project '%s': %s\\n%s" % (POU_FULL_PATH, PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const PATCH_POU_CODE_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback, json
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}
${FIND_OBJECT_BY_PATH_PYTHON_SNIPPET}
POU_FULL_PATH = "{POU_FULL_PATH}"
SECTION = "{SECTION}"  # "declaration" or "implementation"
FIND_TEXT = """{FIND_TEXT}"""
REPLACE_TEXT = """{REPLACE_TEXT}"""
SAVE_AFTER = "{SAVE_AFTER}" == "true"

try:
    print("DEBUG: patch_pou_code: POU='%s', section='%s', save=%s, project='%s'" % (POU_FULL_PATH, SECTION, SAVE_AFTER, PROJECT_FILE_PATH))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    if not POU_FULL_PATH: raise ValueError("POU full path empty.")
    if SECTION not in ("declaration", "implementation"):
        raise ValueError("section must be 'declaration' or 'implementation', got '%s'" % SECTION)

    target_object = find_object_by_path_robust(primary_project, POU_FULL_PATH, "target object")
    if not target_object: raise ValueError("Target object not found using path: %s" % POU_FULL_PATH)

    target_name = getattr(target_object, 'get_name', lambda: POU_FULL_PATH)()
    print("DEBUG: Found target object: %s" % target_name)

    attr_name = "textual_" + SECTION
    if not hasattr(target_object, attr_name):
        raise ValueError("Target '%s' has no %s attribute (POU likely uses graphical language LD/FBD/SFC/CFC)." % (target_name, attr_name))
    text_holder = getattr(target_object, attr_name)
    if not text_holder or not hasattr(text_holder, 'text') or not hasattr(text_holder, 'replace'):
        raise ValueError("Target '%s' %s holder is invalid (None or missing text/replace)." % (target_name, attr_name))

    current_text = text_holder.text
    if current_text is None:
        raise ValueError("Current %s text is None for '%s'." % (SECTION, target_name))

    match_count = current_text.count(FIND_TEXT)
    print("DEBUG: findText matches=%d in %d chars" % (match_count, len(current_text)))

    saved_project = False
    if match_count == 0:
        result = {"matched": False, "matchCount": 0, "savedProject": False, "reason": "findText not found in %s of %s" % (SECTION, target_name)}
        print("SCRIPT_RESULT_JSON:" + json.dumps(result))
        print("SCRIPT_ERROR: %s" % result["reason"])
        sys.exit(1)
    elif match_count > 1:
        result = {"matched": False, "matchCount": match_count, "savedProject": False, "reason": "findText is ambiguous (%d occurrences) -- provide more context to make it unique" % match_count}
        print("SCRIPT_RESULT_JSON:" + json.dumps(result))
        print("SCRIPT_ERROR: %s" % result["reason"])
        sys.exit(1)
    else:
        new_text = current_text.replace(FIND_TEXT, REPLACE_TEXT, 1)
        text_holder.replace(new_text)
        print("DEBUG: Applied single-occurrence replacement (deltaChars=%d)" % (len(new_text) - len(current_text)))
        if SAVE_AFTER:
            try:
                primary_project.save()
                saved_project = True
                print("DEBUG: Project saved after patch.")
            except Exception as save_err:
                print("WARN: Project save failed: %s" % save_err)
        result = {
            "matched": True,
            "matchCount": 1,
            "savedProject": saved_project,
            "pouPath": POU_FULL_PATH,
            "section": SECTION,
            "previousLength": len(current_text),
            "newLength": len(new_text),
        }
        print("SCRIPT_RESULT_JSON:" + json.dumps(result))
        print("SCRIPT_SUCCESS: Patch applied to %s of %s." % (SECTION, target_name))
        sys.exit(0)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error patching POU '%s': %s\\n%s" % (POU_FULL_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

export const GET_DEVICE_TREE_SCRIPT_TEMPLATE = `
import sys, scriptengine as script_engine, os, traceback, json
${ENSURE_PROJECT_OPEN_PYTHON_SNIPPET}

INCLUDE_PARAMETERS = "{INCLUDE_PARAMETERS}" == "true"

def safe_attr(obj, name, default=None):
    try:
        if hasattr(obj, name):
            v = getattr(obj, name)
            return v() if callable(v) else v
    except Exception:
        return default
    return default

def device_to_dict(obj, depth=0, max_depth=12):
    """Serialize a device-tree node + its children recursively to JSON-friendly dict."""
    if depth > max_depth:
        return {"name": "(max depth)", "type": "Truncated", "children": []}

    node = {
        "name": "Unnamed",
        "type": type(obj).__name__,
        "children": [],
    }
    try:
        try: node["name"] = safe_attr(obj, 'get_name') or "Unnamed"
        except Exception: pass
        # Device-specific attributes (CODESYS exposes most as functions, some as fields)
        try:
            if hasattr(obj, 'is_device'): node["isDevice"] = bool(obj.is_device)
        except Exception: pass
        try:
            if hasattr(obj, 'guid'): node["guid"] = str(obj.guid)
        except Exception: pass
        try:
            if hasattr(obj, 'device_identification'):
                ident = obj.device_identification
                node["vendor"] = safe_attr(ident, 'vendor_id', None) or safe_attr(ident, 'vendor', None)
                node["typeId"] = safe_attr(ident, 'type_id', None) or safe_attr(ident, 'type', None)
                node["version"] = safe_attr(ident, 'version', None)
        except Exception: pass

        # Try a few common module-level attributes (slot, module name)
        for attr in ('slot', 'slot_index', 'module_name', 'order_number'):
            try:
                if hasattr(obj, attr):
                    val = getattr(obj, attr)
                    if val is not None and not callable(val):
                        node[attr] = str(val)
            except Exception: pass

        # Parameters (Symbol Configuration / IO mapping) -- only if requested
        if INCLUDE_PARAMETERS:
            try:
                if hasattr(obj, 'get_device_parameters'):
                    params = obj.get_device_parameters()
                    if params:
                        node["parameters"] = []
                        for p in params:
                            try:
                                pname = safe_attr(p, 'get_name') or "Param"
                                pvalue = safe_attr(p, 'get_value') or safe_attr(p, 'value', "")
                                node["parameters"].append({"name": pname, "value": "%s" % pvalue})
                            except Exception: pass
            except Exception: pass

        children = []
        if hasattr(obj, 'get_children'):
            try: children = obj.get_children(False) or []
            except Exception as ch_err: node["childrenError"] = "%s" % ch_err
        for child in children:
            # Walk children only if they're devices/modules -- skip POUs and folders
            is_dev_child = False
            try: is_dev_child = bool(getattr(child, 'is_device', False))
            except Exception: pass
            if is_dev_child or depth == 0:
                node["children"].append(device_to_dict(child, depth + 1, max_depth))
    except Exception as e:
        node["error"] = "%s" % e
    return node

try:
    print("DEBUG: get_device_tree: project='%s', includeParameters=%s" % (PROJECT_FILE_PATH, INCLUDE_PARAMETERS))
    primary_project = ensure_project_open(PROJECT_FILE_PATH)
    project_name = os.path.basename(PROJECT_FILE_PATH)
    print("DEBUG: Walking device tree of project: %s" % project_name)

    # Find top-level devices under the project root
    top_level = []
    try:
        all_children = primary_project.get_children(False) or []
        for child in all_children:
            try:
                if bool(getattr(child, 'is_device', False)):
                    top_level.append(child)
            except Exception: pass
    except Exception as walk_err:
        print("WARN: error walking project root: %s" % walk_err)

    devices_json = []
    for dev in top_level:
        devices_json.append(device_to_dict(dev, depth=0, max_depth=12))

    payload = {
        "projectPath": PROJECT_FILE_PATH,
        "projectName": project_name,
        "deviceCount": len(devices_json),
        "includeParameters": INCLUDE_PARAMETERS,
        "devices": devices_json,
    }
    print("SCRIPT_RESULT_JSON:" + json.dumps(payload))
    print("SCRIPT_SUCCESS: Device tree retrieved (%d top-level devices)." % len(devices_json))
    sys.exit(0)
except Exception as e:
    detailed_error = traceback.format_exc()
    error_message = "Error getting device tree for '%s': %s\\n%s" % (PROJECT_FILE_PATH, e, detailed_error)
    print(error_message); print("SCRIPT_ERROR: %s" % error_message); sys.exit(1)
`;

// -----------------------------------------------------------------------------
// Runtime placeholder substitution
// -----------------------------------------------------------------------------

/**
 * Replace `{TOKEN}` placeholders in a template with values from `vars`.
 * Used by tool handlers before passing scripts to `executeCodesysScript()`.
 *
 * Example:
 *   fillTemplate(CREATE_POU_SCRIPT_TEMPLATE, {
 *     PROJECT_FILE_PATH: "C:/path/to/project.project",
 *     POU_NAME: "FB_MyBlock",
 *     POU_TYPE_STR: "FunctionBlock",
 *     IMPL_LANGUAGE_STR: "ST",
 *     PARENT_PATH: "Application",
 *   })
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}
