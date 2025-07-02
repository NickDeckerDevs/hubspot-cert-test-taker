#!/usr/bin/env python3
"""
Main script for the Q&A Schema Scraper and Builder
This script orchestrates the web scraping and schema building process
"""

import os
import sys
import json
import logging
import argparse
from urllib.parse import urlparse
from typing import List, Dict

from scraper import WebScraper
from schema_builder import SchemaBuilder
from registry_manager import add_schema_to_registry
from config import (
    DEFAULT_SCRAPING_CONFIG,
    SCHEMA_CONFIG,
    LOGGING_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
)

# Set up logging
def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, LOGGING_CONFIG['level']),
        format=LOGGING_CONFIG['format'],
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOGGING_CONFIG['log_file'])
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def validate_url(url: str) -> bool:
    """
    Validate if the provided URL is properly formatted
    
    Args:
        url: URL to validate
        
    Returns:
        True if valid, False otherwise
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def scrape_course(url: str, course_name: str = None, output_dir: str = None, exam_url: str = None) -> str:
    """
    Scrape a single course and generate schema
    
    Args:
        url: Course listing URL
        course_name: Optional course name
        output_dir: Optional output directory
        
    Returns:
        Path to generated schema file
    """
    logger.info(f"Starting scrape for URL: {url}")
    
    # Validate URL
    if not validate_url(url):
        raise ValueError(f"Invalid URL provided: {url}")
    
    # Initialize scraper and schema builder
    scraper = WebScraper(
        base_url=url,
        delay=DEFAULT_SCRAPING_CONFIG['delay_between_requests']
    )
    
    schema_builder = SchemaBuilder(
        output_dir=output_dir or SCHEMA_CONFIG['output_directory']
    )
    
    try:
        # Scrape the course
        course_data = scraper.scrape_full_course(url, course_name)
        
        if not course_data.get('questions'):
            logger.warning("No questions found in the scraped data")
            return None
        
        # Build schema
        schema = schema_builder.build_schema(course_data)
        
        # Save schema
        schema_file = schema_builder.save_schema(schema)
        
        # Update registry for Chrome extension if exam URL provided
        if exam_url and schema_file:
            try:
                # Copy schema file to extension directory
                extension_schemas_dir = os.path.join('extension', 'schemas')
                os.makedirs(extension_schemas_dir, exist_ok=True)
                
                schema_filename = os.path.basename(schema_file)
                extension_schema_path = os.path.join(extension_schemas_dir, schema_filename)
                
                # Copy the schema file
                import shutil
                shutil.copy2(schema_file, extension_schema_path)
                logger.info(f"Copied schema to extension: {extension_schema_path}")
                
                # Register with relative path from extension directory
                relative_schema_path = f"schemas/{schema_filename}"
                add_schema_to_registry(
                    course_name=course_data.get('course_name', 'Unknown Course'),
                    exam_url=exam_url,
                    schema_filename=relative_schema_path
                )
            except Exception as e:
                logger.warning(f"Failed to update registry: {e}")
        
        logger.info(SUCCESS_MESSAGES['scraping_complete'].format(
            count=len(course_data['questions']),
            course=course_data['course_name']
        ))
        
        return schema_file
        
    except Exception as e:
        logger.error(f"Error scraping course: {e}")
        raise

def scrape_multiple_courses(urls: List[str], output_dir: str = None) -> List[str]:
    """
    Scrape multiple courses and generate individual schemas
    
    Args:
        urls: List of course URLs
        output_dir: Optional output directory
        
    Returns:
        List of generated schema file paths
    """
    schema_files = []
    
    for i, url in enumerate(urls, 1):
        try:
            logger.info(f"Processing course {i}/{len(urls)}: {url}")
            schema_file = scrape_course(url, output_dir=output_dir)
            
            if schema_file:
                schema_files.append(schema_file)
                logger.info(f"Successfully processed: {url}")
            else:
                logger.warning(f"No data extracted from: {url}")
                
        except Exception as e:
            logger.error(f"Failed to process {url}: {e}")
            continue
    
    return schema_files

def merge_schemas(schema_files: List[str], output_filename: str = None) -> str:
    """
    Merge multiple schema files into a single schema
    
    Args:
        schema_files: List of schema file paths
        output_filename: Optional output filename
        
    Returns:
        Path to merged schema file
    """
    schema_builder = SchemaBuilder()
    
    if not output_filename:
        output_filename = "merged_schema.json"
    
    merged_file = schema_builder.merge_schemas(schema_files, output_filename)
    logger.info(f"Merged {len(schema_files)} schemas into {merged_file}")
    
    return merged_file

def list_schemas(schema_dir: str = None) -> List[Dict]:
    """
    List all available schema files with metadata
    
    Args:
        schema_dir: Directory to search for schemas
        
    Returns:
        List of schema metadata dictionaries
    """
    if not schema_dir:
        schema_dir = SCHEMA_CONFIG['output_directory']
    
    if not os.path.exists(schema_dir):
        logger.warning(f"Schema directory does not exist: {schema_dir}")
        return []
    
    schemas = []
    
    for filename in os.listdir(schema_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(schema_dir, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    schema = json.load(f)
                
                metadata = {
                    'filename': filename,
                    'filepath': filepath,
                    'course_name': schema.get('course_info', {}).get('name', 'Unknown'),
                    'question_count': len(schema.get('questions', [])),
                    'created_date': schema.get('created_date', 'Unknown'),
                    'file_size': os.path.getsize(filepath)
                }
                
                schemas.append(metadata)
                
            except Exception as e:
                logger.error(f"Error reading schema file {filepath}: {e}")
                continue
    
    return schemas

def main():
    """Main function to handle command line interface"""
    parser = argparse.ArgumentParser(
        description="Q&A Schema Scraper and Builder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape a single course
  python main.py scrape https://academy.hubspot.com/courses/inbound-marketing
  
  # Scrape multiple courses
  python main.py scrape-batch urls.txt
  
  # List existing schemas
  python main.py list
  
  # Merge existing schemas
  python main.py merge schema1.json schema2.json
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Scrape single course command
    scrape_parser = subparsers.add_parser('scrape', help='Scrape a single course')
    scrape_parser.add_argument('url', help='Course listing URL to scrape')
    scrape_parser.add_argument('--name', help='Course name (optional)')
    scrape_parser.add_argument('--output-dir', help='Output directory for schema files')
    scrape_parser.add_argument('--exam-url', help='HubSpot exam URL for Chrome extension mapping (optional)')
    
    # Scrape batch command
    batch_parser = subparsers.add_parser('scrape-batch', help='Scrape multiple courses from a file')
    batch_parser.add_argument('url_file', help='File containing URLs to scrape (one per line)')
    batch_parser.add_argument('--output-dir', help='Output directory for schema files')
    batch_parser.add_argument('--merge', action='store_true', help='Merge all schemas into one file')
    
    # List schemas command
    list_parser = subparsers.add_parser('list', help='List available schema files')
    list_parser.add_argument('--schema-dir', help='Directory to search for schemas')
    
    # Merge schemas command
    merge_parser = subparsers.add_parser('merge', help='Merge multiple schema files')
    merge_parser.add_argument('schema_files', nargs='+', help='Schema files to merge')
    merge_parser.add_argument('--output', help='Output filename for merged schema')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == 'scrape':
            schema_file = scrape_course(args.url, args.name, args.output_dir, getattr(args, 'exam_url', None))
            if schema_file:
                print(f"Schema saved to: {schema_file}")
            else:
                print("No schema generated (no questions found)")
        
        elif args.command == 'scrape-batch':
            # Read URLs from file
            with open(args.url_file, 'r') as f:
                urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
            if not urls:
                print("No valid URLs found in the file")
                return
            
            print(f"Found {len(urls)} URLs to process")
            schema_files = scrape_multiple_courses(urls, args.output_dir)
            
            print(f"Successfully processed {len(schema_files)} courses")
            
            if args.merge and schema_files:
                merged_file = merge_schemas(schema_files)
                print(f"Merged schema saved to: {merged_file}")
        
        elif args.command == 'list':
            schemas = list_schemas(args.schema_dir)
            
            if not schemas:
                print("No schema files found")
                return
            
            print(f"Found {len(schemas)} schema files:")
            print("-" * 80)
            
            for schema in schemas:
                print(f"File: {schema['filename']}")
                print(f"Course: {schema['course_name']}")
                print(f"Questions: {schema['question_count']}")
                print(f"Created: {schema['created_date']}")
                print(f"Size: {schema['file_size']} bytes")
                print("-" * 40)
        
        elif args.command == 'merge':
            # Validate schema files exist
            for file_path in args.schema_files:
                if not os.path.exists(file_path):
                    print(f"Schema file not found: {file_path}")
                    return
            
            merged_file = merge_schemas(args.schema_files, args.output)
            print(f"Merged schema saved to: {merged_file}")
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
    except Exception as e:
        logger.error(f"Error: {e}")
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
