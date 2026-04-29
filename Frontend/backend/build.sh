#!/usr/bin/env bash
set -e

# Upgrade pip to avoid outdated version warnings
pip install --upgrade pip setuptools wheel

# Install requirements
pip install -r requirements.txt