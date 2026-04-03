import json
import os
from groq import Groq
from dotenv import load_dotenv

def analyze_soc_threat(json_data, client, chunk_size=15):
    """
    Ingests pre-aggregated log data, chunks it to prevent LLM overload,
    and returns a structured JSON SOC report with per-log detailed analyses.
    """
    # 1. Determine the array target to iterate over
    if isinstance(json_data, dict):
        data_to_analyze = json_data.get("sql_answer", [])
        if not data_to_analyze:
            data_to_analyze = json_data.get("logs", [])
            if not data_to_analyze:
                data_to_analyze = [json_data]
    elif isinstance(json_data, list):
        data_to_analyze = json_data
    else:
        data_to_analyze = [json_data]
        
    master_report = {
        "executive_summary": "Aggregate SOC Report",
        "threat_level": "Low",
        "detailed_log_analysis": [],
        "overall_recommended_actions": []
    }
    
    if not data_to_analyze:
        master_report["executive_summary"] = "No logs available for analysis."
        return master_report

    # 2. Process in manageable chunks to respect context window and detail constraints
    for i in range(0, len(data_to_analyze), chunk_size):
        chunk = data_to_analyze[i:i + chunk_size]
        context_string = json.dumps(chunk, indent=2)
        
        master_prompt = f"""You are a Security Operations Center (SOC) backend analysis engine. Your sole function is to process log data and output a structured JSON response. You must NOT output any conversational text or markdown formatting blocks.

CONSTRAINTS:
We are providing you with a subset chunk of log data. You must analyze EVERY log entry (or group) in this chunk and provide specific details for it. Do not return a generalized summary.

CONTEXTUAL DATA:
{context_string}

OUTPUT FORMAT:
You must return a single, valid JSON object using EXACTLY this schema:
{{
  "chunk_threat_level": "Low/Medium/High/Critical",
  "log_analyses": [
    {{
      "ip_address_or_identifier": "string (the IP or entity extracted from the log)",
      "threat_detected": "string (Specific nature of the attack, e.g. Credential Stuffing, Brute Force, Unauthorized Access)",
      "details": "string (Detailed observation about THIS specific log/IP, its timeline, and frequency)",
      "action": "string (Specific action to mitigate THIS attacker)"
    }}
  ]
}}"""

        try:
            print(f"⚙️ LLM Analyzing log chunk {i//chunk_size + 1}/{max(1, (len(data_to_analyze) + chunk_size - 1) // chunk_size)}...")
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a data processing API. You output only valid JSON. No preamble."},
                    {"role": "user", "content": master_prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            raw_response = response.choices[0].message.content.strip()
            parsed_json = json.loads(raw_response)
            
            # Merge parsed_json chunk findings into master_report
            level = parsed_json.get("chunk_threat_level", "Low")
            threat_hierarchy = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
            if threat_hierarchy.get(level, 1) > threat_hierarchy.get(master_report["threat_level"], 1):
                master_report["threat_level"] = level
            
            for item in parsed_json.get("log_analyses", []):
                master_report["detailed_log_analysis"].append(item)
                if item.get("action"):
                    if item["action"] not in master_report["overall_recommended_actions"]:
                        master_report["overall_recommended_actions"].append(item["action"])

        except json.JSONDecodeError as e:
            print(f"JSON Parsing Failed for chunk: {e}")
        except Exception as e:
            print(f"API Request Failed for chunk: {e}")

    # Generate a final executive summary based on the compiled elements
    if master_report["detailed_log_analysis"]:
        master_report["executive_summary"] = f"Analyzed {len(data_to_analyze)} log profiles entirely. Identified {len(master_report['detailed_log_analysis'])} specific threat profiles manifesting as incidents across the environment. Overall system threat level assessed as {master_report['threat_level']}."
    
    return master_report
