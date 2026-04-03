import json
import os
from groq import Groq
from dotenv import load_dotenv

def analyze_soc_threat(json_data, client):
    """
    Ingests log data and returns a structured JSON SOC report.

    Accepts two shapes:
      - dict  → a single group payload produced by the per-group loop in main.py
                (keys: target_label, ip_address, event_count, times_seen, full_log_entries)
      - list  → a flat list of summarised group dicts (legacy / automated sweep path)
    """
    # ── Normalise input ──────────────────────────────────────────────────────
    if isinstance(json_data, dict):
        # Single group payload: pass the whole dict as-is so the LLM sees
        # every field including full_log_entries.
        data_to_analyze = json_data
        is_single_group = True
    elif isinstance(json_data, list):
        data_to_analyze = json_data
        is_single_group = False
    else:
        data_to_analyze = [json_data]
        is_single_group = False

    context_string = json.dumps(data_to_analyze, indent=2)

    # ── Choose prompt phrasing based on input shape ──────────────────────────
    if is_single_group:
        data_description = (
            "You are receiving a SINGLE threat group. "
            "The group contains: target_label (event classification), ip_address, "
            "event_count (total occurrences), times_seen (timestamps of each occurrence), "
            "and full_log_entries (every raw log row belonging to this group). "
            "Reference specific log entries in your details and tailor your analysis "
            "entirely to this one group."
        )
    else:
        data_description = (
            "You are receiving MULTIPLE threat groups. Each entry is grouped by IP address "
            "and target label and includes counts and timestamps. "
            "Evaluate each group's behavior and produce a holistic report across all groups."
        )

    # ── Master Prompt ────────────────────────────────────────────────────────
    master_prompt = f"""You are a Security Operations Center (SOC) backend analysis engine. \
Your sole function is to process log data and output a structured JSON response. \
You must NOT output any conversational text or markdown formatting.

CONTEXT:
{data_description}

DATA:
{context_string}

OUTPUT FORMAT — return a single, valid JSON object using EXACTLY this schema:
{{
  "executive_summary": "string — high-level summary of the threat picture",
  "threat_level": "Low | Medium | High | Critical",
  "log_analyses": [
    {{
      "ip_address_or_identifier": "string — the specific IP or entity",
      "threat_detected": "string — specific attack type (e.g. SSH Brute Force, Credential Stuffing)",
      "details": "string — deep analysis referencing specific log entries, counts, and timestamps",
      "action": "string — recommended mitigation action for this attacker profile"
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a data processing API. Output only valid JSON. No preamble."},
                {"role": "user", "content": master_prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        raw_response = response.choices[0].message.content.strip()
        parsed_json = json.loads(raw_response)
        return parsed_json

    except json.JSONDecodeError as e:
        return {"error": f"JSON Parsing Failed: {e}", "raw_output": raw_response}
    except Exception as e:
        return {"error": f"API Request Failed: {e}"}
