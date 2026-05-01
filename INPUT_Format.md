# Input File Format

## Overview

The Insights project processes logs in a structured CSV format. This document defines the schema and requirements for input files.

## File Specification

**File Format:** CSV (Comma-Separated Values)  
**Encoding:** UTF-8  
**Line Endings:** LF or CRLF  
**Expected Size:** 50Mb csv  

## Column Schema

| # | Column Name | Data Type | Description | Example |
|---|-------------|-----------|-------------|---------|
| 1 | `LineId` | Integer | Unique sequential identifier for each log entry | `1`, `2`, `2000` |
| 2 | `Date` | String | Month of the log entry | `Dec`, `Jan`, `Feb` |
| 3 | `Day` | Integer | Day of the month | `10`, `15`, `31` |
| 4 | `Time` | String | Time in HH:MM:SS format (24-hour) | `06:55:46`, `11:04:45` |
| 5 | `Component` | String | System component generating the log | `LabSZ` |
| 6 | `Pid` | Integer | Process ID of the SSH daemon | `24200`, `25539` |
| 7 | `Content` | String | Full raw log message with actual values | `Invalid user webmaster from 173.234.31.186` |
| 8 | `EventId` | String | Normalized event category identifier | `E2`, `E10`, `E27` |
| 9 | `EventTemplate` | String | Template pattern with wildcards (`<*>`) replacing variable values | `Invalid user <*> from <*>` |

## Data Characteristics

### Column Details

**LineId**
- Starts at 1
- Increments by 1 for each row
- No gaps or duplicates

**Date, Day, Time**
- Temporal fields representing when the log event occurred
- All entries in a typical dataset span 1-2 days
- Time is in 24-hour format with leading zeros

**Component**
- Identifies the source system (e.g., `LabSZ`)
- Typically consistent across all entries in a single dataset
- May vary if logs from multiple systems are combined

**Pid**
- Process ID of the sshd service
- Varies across different SSH connection attempts
- Multiple PIDs indicate concurrent sessions

**Content**
- Raw, untemplatized log message
- Contains actual values (IP addresses, usernames, ports, domains, etc.)
- Variable length, typically 80-200 characters
- Examples:
  - `Invalid user webmaster from 173.234.31.186`
  - `Failed password for invalid user test9 from 52.80.34.196 port 36060 ssh2`
  - `reverse mapping checking getaddrinfo for ns.marryaldkfaczcz.com [173.234.31.186] failed - POSSIBLE BREAK-IN ATTEMPT!`

**EventId**
- Short categorical identifier (e.g., `E2`, `E10`, `E27`)
- Maps log entries to event types for analysis and clustering
- Typically 15-30 unique event types in a dataset

**EventTemplate**
- Parametric representation of the log message pattern
- Uses `<*>` as wildcards for variable fields
- Enables pattern matching and anomaly detection
- Examples:
  - Template: `Invalid user <*> from <*>`
  - Template: `Failed password for <*> from <*> port <*> ssh2`

## Row Count

- **Header:** 1 row
- **Data Rows:** Typically 2,000 or more
- **Total Lines:** Header + data rows

## Example Rows

```csv
LineId,Date,Day,Time,Component,Pid,Content,EventId,EventTemplate
1,Dec,10,06:55:46,LabSZ,24200,reverse mapping checking getaddrinfo for ns.marryaldkfaczcz.com [173.234.31.186] failed - POSSIBLE BREAK-IN ATTEMPT!,E27,reverse mapping checking getaddrinfo for <*> [<*>] failed - POSSIBLE BREAK-IN ATTEMPT!
2,Dec,10,06:55:46,LabSZ,24200,Invalid user webmaster from 173.234.31.186,E13,Invalid user <*> from <*>
3,Dec,10,06:55:46,LabSZ,24200,input_userauth_request: invalid user webmaster [preauth],E12,input_userauth_request: invalid user <*> [preauth]
6,Dec,10,06:55:48,LabSZ,24200,Failed password for invalid user webmaster from 173.234.31.186 port 38926 ssh2,E10,Failed password for invalid user <*> from <*> port <*> ssh2
```

## Validation Requirements

- [ ] File must be valid CSV format with headers in the first row
- [ ] All columns must be present in the specified order
- [ ] `LineId` values must be unique and sequential
- [ ] `Date` must be a valid month abbreviation (Jan-Dec)
- [ ] `Day` must be an integer between 1-31
- [ ] `Time` must be in HH:MM:SS format (00:00:00 - 23:59:59)
- [ ] `Pid` must be a positive integer
- [ ] `Content` and `EventTemplate` must not be empty
- [ ] `EventId` must follow the pattern `E` followed by digits (e.g., `E1`, `E10`)
- [ ] All fields should be properly escaped (quotes if containing commas or newlines)

## Source

This structured log format is derived from raw OpenSSH authentication logs, pre-processed to extract:
- Temporal information
- Categorical event identifiers
- Parametric templates for pattern analysis

The EventTemplate field enables efficient clustering and anomaly detection by normalizing variable fields across similar log messages.

## Usage

Load the CSV file into your analysis pipeline:

```python
import pandas as pd

df = pd.read_csv('OpenSSH_2k_log_structured.csv')
print(f"Loaded {len(df)} log entries")
print(df.head())
```

```javascript
const csv = require('csv-parser');
const fs = require('fs');

fs.createReadStream('OpenSSH_2k_log_structured.csv')
  .pipe(csv())
  .on('data', (row) => {
    console.log(row);
  });
```
