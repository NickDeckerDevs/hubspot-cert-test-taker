import json
import os
import logging
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class SchemaBuilder:
    def __init__(self, output_dir: str = "schemas"):
        """
        Initialize schema builder
        
        Args:
            output_dir: Directory to save schema files
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def clean_question_text(self, text: str) -> str:
        """
        Clean and normalize question text for better matching
        
        Args:
            text: Raw question text
            
        Returns:
            Cleaned question text
        """
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        cleaned = ' '.join(text.split())
        
        # Remove common prefixes/suffixes
        prefixes_to_remove = [
            "Question:",
            "Q:",
            "Question",
            "Q.",
        ]
        
        for prefix in prefixes_to_remove:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        
        return cleaned
    
    def extract_correct_answer(self, answer_data: Dict) -> str:
        """
        Extract the correct answer from answer data
        
        Args:
            answer_data: Answer data dictionary
            
        Returns:
            Correct answer text
        """
        # Check for multiple choice options first
        if answer_data.get('options'):
            correct_options = [opt['text'] for opt in answer_data['options'] if opt.get('is_correct')]
            if correct_options:
                return correct_options[0]  # Return first correct option
        
        # Fallback to structured content or text content
        if answer_data.get('structured_content'):
            return answer_data['structured_content']
        
        return answer_data.get('text_content', '')
    
    def build_schema(self, course_data: Dict) -> Dict:
        """
        Build a structured schema from scraped course data
        
        Args:
            course_data: Raw scraped course data
            
        Returns:
            Structured schema dictionary
        """
        schema = {
            'schema_version': '1.0',
            'created_date': datetime.now().isoformat(),
            'course_info': {
                'name': course_data.get('course_name', 'Unknown Course'),
                'source_url': course_data.get('listing_url', ''),
                'total_questions': course_data.get('total_questions', 0),
                'scraped_date': course_data.get('scraped_date', '')
            },
            'questions': []
        }
        
        for qa in course_data.get('questions', []):
            try:
                question_text = self.clean_question_text(qa.get('question', ''))
                answer_text = self.extract_correct_answer(qa.get('answer_data', {}))
                
                if not question_text or not answer_text:
                    logger.warning(f"Skipping incomplete Q&A: {question_text[:50]}...")
                    continue
                
                question_schema = {
                    'id': qa.get('id'),
                    'question': question_text,
                    'answer': answer_text.strip(),
                    'source_url': qa.get('question_source_url', ''),
                    'matching_keywords': self.extract_keywords(question_text),
                    'answer_options': qa.get('answer_data', {}).get('options', []),
                    'metadata': {
                        'scraped_from': qa.get('scraped_from_listing', ''),
                        'has_multiple_choice': bool(qa.get('answer_data', {}).get('options'))
                    }
                }
                
                schema['questions'].append(question_schema)
                
            except Exception as e:
                logger.error(f"Error processing question {qa.get('id', 'unknown')}: {e}")
                continue
        
        return schema
    
    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract keywords from question text for better matching
        
        Args:
            text: Question text
            
        Returns:
            List of keywords
        """
        if not text:
            return []
        
        # Simple keyword extraction - can be enhanced with NLP
        import re
        
        # Remove common stop words
        stop_words = {
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 
            'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 
            'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 
            'should', 'what', 'when', 'where', 'who', 'why', 'how'
        }
        
        # Extract words (alphanumeric sequences)
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Filter out stop words and short words
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        
        # Return unique keywords, limited to top 10
        return list(set(keywords))[:10]
    
    def save_schema(self, schema: Dict, filename: str = None) -> str:
        """
        Save schema to JSON file
        
        Args:
            schema: Schema dictionary
            filename: Optional filename (auto-generated if not provided)
            
        Returns:
            Path to saved file
        """
        if not filename:
            course_name = schema.get('course_info', {}).get('name', 'unknown_course')
            # Clean filename
            clean_name = ''.join(c for c in course_name if c.isalnum() or c in (' ', '_', '-')).strip()
            clean_name = clean_name.replace(' ', '_').lower()
            filename = f"{clean_name}_schema.json"
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(schema, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Schema saved to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving schema to {filepath}: {e}")
            raise
    
    def load_schema(self, filepath: str) -> Dict:
        """
        Load schema from JSON file
        
        Args:
            filepath: Path to schema file
            
        Returns:
            Schema dictionary
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading schema from {filepath}: {e}")
            raise
    
    def merge_schemas(self, schema_files: List[str], output_filename: str = "merged_schema.json") -> str:
        """
        Merge multiple schema files into one
        
        Args:
            schema_files: List of schema file paths
            output_filename: Output filename for merged schema
            
        Returns:
            Path to merged schema file
        """
        merged_schema = {
            'schema_version': '1.0',
            'created_date': datetime.now().isoformat(),
            'merged_from': schema_files,
            'courses': [],
            'total_questions': 0
        }
        
        for filepath in schema_files:
            try:
                schema = self.load_schema(filepath)
                
                course_info = schema.get('course_info', {})
                course_info['questions'] = schema.get('questions', [])
                
                merged_schema['courses'].append(course_info)
                merged_schema['total_questions'] += len(schema.get('questions', []))
                
            except Exception as e:
                logger.error(f"Error processing {filepath} for merge: {e}")
                continue
        
        output_path = os.path.join(self.output_dir, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(merged_schema, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Merged schema saved to: {output_path}")
        return output_path
