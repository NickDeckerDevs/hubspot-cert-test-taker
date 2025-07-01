"""
Configuration settings for the web scraper and Chrome extension system
"""

# Default scraping settings
DEFAULT_SCRAPING_CONFIG = {
    'delay_between_requests': 1.0,  # seconds
    'request_timeout': 30,  # seconds
    'max_retries': 3,
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# HubSpot specific configuration (example)
HUBSPOT_CONFIG = {
    'base_url': 'https://academy.hubspot.com',
    'question_selectors': [
        'div[class*="question"]',
        'li[class*="question"]',
        'div[class*="quiz-question"]',
        '.question-container',
        '.quiz-item'
    ],
    'answer_selectors': [
        'div[class*="answer"]',
        'div[class*="explanation"]',
        'div[class*="solution"]',
        '.answer-content',
        '.explanation-text'
    ],
    'option_selectors': [
        'input[type="radio"]',
        'input[type="checkbox"]',
        'li[class*="option"]',
        'div[class*="choice"]',
        '.quiz-option',
        '.answer-choice'
    ]
}

# Chrome extension configuration
EXTENSION_CONFIG = {
    'highlight_color': '#00ff00',  # Green border for correct answers
    'highlight_width': '3px',
    'alert_missing_answer': True,
    'alert_unrecognized_question': True,
    'case_sensitive_matching': False,
    'partial_matching_threshold': 0.8,  # 80% similarity for partial matches
    'max_questions_per_page': 50
}

# Schema configuration
SCHEMA_CONFIG = {
    'output_directory': 'schemas',
    'schema_version': '1.0',
    'backup_enabled': True,
    'max_question_length': 1000,
    'max_answer_length': 5000,
    'min_keywords': 3,
    'max_keywords': 10
}

# Logging configuration
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'log_file': 'scraper.log',
    'max_log_size': 10485760,  # 10MB
    'backup_count': 5
}

# URL patterns for different certification providers
URL_PATTERNS = {
    'hubspot': {
        'domain': 'academy.hubspot.com',
        'course_pattern': r'/courses/[^/]+',
        'question_pattern': r'/questions/[^/]+',
        'quiz_pattern': r'/quiz/[^/]+'
    },
    'google': {
        'domain': 'skillshop.withgoogle.com',
        'course_pattern': r'/course/[^/]+',
        'question_pattern': r'/assessment/[^/]+',
        'quiz_pattern': r'/exam/[^/]+'
    },
    'facebook': {
        'domain': 'www.facebookblueprint.com',
        'course_pattern': r'/course/[^/]+',
        'question_pattern': r'/lesson/[^/]+',
        'quiz_pattern': r'/assessment/[^/]+'
    }
}

# Error messages
ERROR_MESSAGES = {
    'network_error': 'Failed to connect to the website. Please check your internet connection.',
    'parsing_error': 'Failed to parse the webpage content. The site structure may have changed.',
    'no_questions_found': 'No questions were found on this page. Please verify the URL.',
    'no_answers_found': 'No answers were found for the questions. Please check the answer links.',
    'schema_save_error': 'Failed to save the schema file. Please check file permissions.',
    'extension_load_error': 'Failed to load the Chrome extension. Please check the manifest file.'
}

# Success messages
SUCCESS_MESSAGES = {
    'scraping_complete': 'Successfully scraped {count} questions from {course}',
    'schema_saved': 'Schema saved successfully to {filepath}',
    'extension_loaded': 'Chrome extension loaded successfully',
    'questions_highlighted': 'Found and highlighted {count} questions on this page'
}
