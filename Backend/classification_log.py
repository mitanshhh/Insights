import os
import re
import time
import pandas as pd
import numpy as np
from groq import Groq
from dotenv import load_dotenv
from groq import Groq
import os
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def classify_with_regex(content):
    patterns = {
        r"Failed password for (invalid user )?\S+ from \S+( port \d+)?": "Failed Login",
        r"pam_unix\(sshd:auth\): authentication failure;": "PAM Authentication Failure",
        r"Connection closed by \S+ \[preauth\]": "Connection Closed (Preauth)",
        r"Received disconnect from \S+:": "Disconnection",
        r"pam_unix\(sshd:auth\): check pass; user unknown": "PAM Check Pass (Unknown)",
        r"input_userauth_request: invalid user \S+": "Invalid User Request",
        r"reverse mapping checking getaddrinfo for \S+": "Reverse Mapping Check",
        r"Invalid user \S+ from \S+": "Invalid User Attempt",
        r"error: Received disconnect from \S+:": "Error Disconnection"
    }
    for pattern, label in patterns.items():
        if re.search(pattern, str(content), re.IGNORECASE):
            return label
    return None

import json

def classify_with_llm_bulk(log_messages, client):
    if not log_messages:
        return []
        
    prompt = f"""
    Classify the following OpenSSH log messages into one of these exact categories:
    - Max Retries/Failures Exceeded
    - No Identification String
    - Successful Login
    - Session Status Change
    - Connection Error
    - Failed Login
    
    If you cannot figure out a category, return 'Unclassified'.
    
    You must return ONLY a valid JSON array of strings, in the exact same order as the inputs.
    Example: ["Failed Login", "Unclassified", "Connection Error"]
    
    Log messages:
    {json.dumps(log_messages, indent=2)}
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        # Fallback if it wrapped in an object
        if content.startswith('{'):
            parsed = json.loads(content)
            return list(parsed.values())[0] if parsed else ["Unclassified"] * len(log_messages)
        return json.loads(content)
    except Exception as e:
        print(f"Bulk API Error: {e}")
        return ["Unclassified"] * len(log_messages)

def process_ssh_logs(input_file='', 
                     output_file=''):
    
    df = pd.read_csv(input_file)

    df['regex_label'] = df['Content'].apply(classify_with_regex)
    df_non_regex = df[df['regex_label'].isnull()].copy()

    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(env_path)
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    # Bulk classify to prevent upload timeouts
    logs_to_classify = df_non_regex['Content'].tolist()
    llm_labels = classify_with_llm_bulk(logs_to_classify, client)
    
    # Ensure length matches in case LLM hallucinations change array size
    if len(llm_labels) != len(logs_to_classify):
        print("[WARN] Bulk LLM output length mismatch. Falling back to Unclassified.")
        llm_labels = ["Unclassified"] * len(logs_to_classify)

    df_non_regex['llm_label'] = llm_labels

    df['target_label'] = df['regex_label']
    df.loc[df['target_label'].isnull(), 'target_label'] = df_non_regex['llm_label']
    # Fill any remaining nulls (rows not in df_non_regex) with Unclassified
    df['target_label'] = df['target_label'].fillna('Unclassified')

    ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
    df['ip_address'] = df['Content'].str.extract(ip_pattern, expand=False)
    df['ip_address'] = df['ip_address'].fillna("Unknown")

    df_final = df.drop(columns=['regex_label', 'cluster', 'Target_Label'], errors='ignore')
    # Deduplicate columns — if raw CSV already had ip_address/target_label, drop those stale ones
    # (our freshly computed versions are already in df_final via assignment above)
    df_final = df_final.loc[:, ~df_final.columns.str.lower().duplicated(keep='last')]
    df_final.to_csv(output_file, index=False)

    print(f"\n[OK] Data saved to: {output_file}")
    
    return df_final


# process_ssh_logs() is called from the Flask API (/api/project/upload)
# with per-project file paths — do not call it here at module level.