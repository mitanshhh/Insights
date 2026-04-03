import os
import re
import time
import pandas as pd
import numpy as np
from groq import Groq
from dotenv import load_dotenv

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

def classify_with_llm(log_message, client):
    prompt = f"""
    Classify the following OpenSSH log message into one of these exact categories:
    - Max Retries/Failures Exceeded
    - No Identification String
    - Successful Login
    - Session Status Change
    - Connection Error
    - Failed Login
    
    If you cannot figure out a category, return 'Unclassified'.
    Only return the exact category name. No preamble, no explanation.
    
    Log message: {log_message}
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=15
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"API Error: {e}"

def process_ssh_logs(input_file='', 
                     output_file='', 
                     model_name='all-MiniLM-L6-v2'):
    from sentence_transformers import SentenceTransformer
    from sklearn.cluster import DBSCAN
    
    df = pd.read_csv(input_file)

    model = SentenceTransformer(model_name)
    embeddings = model.encode(df['Content'].tolist())

    dbscan = DBSCAN(eps=0.2, min_samples=1, metric='cosine')
    df['cluster'] = dbscan.fit_predict(embeddings)

    cluster_counts = df['cluster'].value_counts()
    large_clusters = cluster_counts[cluster_counts > 10].index

    for cluster in large_clusters:
        print(f"\nCluster {cluster}:")
        print(df[df['cluster'] == cluster]['Content'].head(3).to_string(index=False))

    df['regex_label'] = df['Content'].apply(classify_with_regex)
    df_non_regex = df[df['regex_label'].isnull()].copy()

    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(env_path)
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    llm_labels = []
    for idx, log in enumerate(df_non_regex['Content']):
        label = classify_with_llm(log, client)
        llm_labels.append(label)
        time.sleep(0.5)
        print(f"[{idx + 1}/{len(df_non_regex)}] -> {label}")

    df_non_regex['llm_label'] = llm_labels

    df['Target_Label'] = df['regex_label']
    df.loc[df['Target_Label'].isnull(), 'Target_Label'] = df_non_regex['llm_label']

    ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
    df['IP'] = df['Content'].str.extract(ip_pattern, expand=False)
    df['IP'] = df['IP'].fillna("Unknown")

    df_final = df.drop(columns=['regex_label', 'cluster'], errors='ignore')
    df_final.to_csv(output_file, index=False)

    print(f"\n✅ Data saved to: {output_file}")
    
    return df_final


# process_ssh_logs() is called from the Flask API (/api/project/upload)
# with per-project file paths — do not call it here at module level.