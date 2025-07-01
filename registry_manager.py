#!/usr/bin/env python3
"""
Registry Manager for Chrome Extension Schema Mapping
Manages the schema_registry.json file that maps HubSpot exam URLs to schema files
"""

import json
import os
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

REGISTRY_PATH = "extension/schema_registry.json"

def load_registry() -> Dict:
    """Load the current schema registry"""
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, 'r') as f:
            return json.load(f)
    else:
        return {
            "version": "1.0",
            "updated": "2025-07-01",
            "schemas": []
        }

def save_registry(registry: Dict):
    """Save the schema registry to file"""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, 'w') as f:
        json.dump(registry, f, indent=2)

def extract_exam_id_from_url(exam_url: str) -> Optional[str]:
    """Extract exam ID from HubSpot exam URL"""
    if not exam_url:
        return None
    
    # Pattern: https://app.hubspot.com/academy/[ACCOUNT_ID]/tracks/[EXAM_ID]/exam
    match = re.search(r'/tracks/(\d+)/exam', exam_url)
    return match.group(1) if match else None

def generate_url_pattern(exam_url: str) -> str:
    """Generate URL pattern for matching"""
    exam_id = extract_exam_id_from_url(exam_url)
    if exam_id:
        return f"tracks/{exam_id}/exam"
    else:
        # Fallback to domain matching
        parsed = urlparse(exam_url)
        return parsed.netloc

def add_schema_to_registry(course_name: str, exam_url: str, schema_filename: str) -> bool:
    """
    Add a schema entry to the registry
    
    Args:
        course_name: Name of the course
        exam_url: HubSpot exam URL  
        schema_filename: Path to schema file relative to extension directory
        
    Returns:
        True if successfully added, False otherwise
    """
    if not exam_url:
        print("Warning: No exam URL provided, schema will not be automatically loaded by extension")
        return False
        
    registry = load_registry()
    
    exam_id = extract_exam_id_from_url(exam_url)
    url_pattern = generate_url_pattern(exam_url)
    
    # Check if entry already exists
    for schema in registry["schemas"]:
        if schema.get("exam_id") == exam_id or schema.get("exam_url_pattern") == url_pattern:
            # Update existing entry
            schema.update({
                "name": course_name,
                "exam_url_pattern": url_pattern,
                "schema_file": schema_filename,
                "exam_id": exam_id,
                "course_name": course_name,
                "exam_url": exam_url
            })
            print(f"Updated existing registry entry for exam ID: {exam_id}")
            save_registry(registry)
            return True
    
    # Add new entry
    new_entry = {
        "name": course_name,
        "exam_url_pattern": url_pattern,
        "schema_file": schema_filename,
        "exam_id": exam_id,
        "course_name": course_name,
        "exam_url": exam_url
    }
    
    registry["schemas"].append(new_entry)
    registry["updated"] = "2025-07-01"
    
    save_registry(registry)
    print(f"Added new registry entry for: {course_name} (exam ID: {exam_id})")
    return True

def list_registry_entries() -> List[Dict]:
    """List all registry entries"""
    registry = load_registry()
    return registry.get("schemas", [])

def remove_schema_from_registry(exam_id: str) -> bool:
    """Remove a schema from the registry by exam ID"""
    registry = load_registry()
    
    original_count = len(registry["schemas"])
    registry["schemas"] = [s for s in registry["schemas"] if s.get("exam_id") != exam_id]
    
    if len(registry["schemas"]) < original_count:
        save_registry(registry)
        print(f"Removed registry entry for exam ID: {exam_id}")
        return True
    else:
        print(f"No registry entry found for exam ID: {exam_id}")
        return False

if __name__ == "__main__":
    # Test the registry manager
    print("Registry entries:")
    entries = list_registry_entries()
    for entry in entries:
        print(f"  - {entry['name']} (ID: {entry['exam_id']})")