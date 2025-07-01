import requests
from bs4 import BeautifulSoup
import json
import time
import logging
from urllib.parse import urljoin, urlparse
import trafilatura
from typing import List, Dict, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebScraper:
    def __init__(self, base_url: str, delay: float = 1.0):
        """
        Initialize the web scraper
        
        Args:
            base_url: Base URL for the website
            delay: Delay between requests to be respectful
        """
        self.base_url = base_url
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def get_page_content(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch and parse HTML content from a URL
        
        Args:
            url: URL to fetch
            
        Returns:
            BeautifulSoup object or None if failed
        """
        try:
            logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Add delay to be respectful
            time.sleep(self.delay)
            
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def get_website_text_content(self, url: str) -> str:
        """
        Extract main text content using trafilatura
        
        Args:
            url: URL to extract content from
            
        Returns:
            Extracted text content
        """
        try:
            downloaded = trafilatura.fetch_url(url)
            text = trafilatura.extract(downloaded)
            return text or ""
        except Exception as e:
            logger.error(f"Error extracting text from {url}: {e}")
            return ""
    
    def scrape_questions_listing(self, listing_url: str) -> List[Dict]:
        """
        Scrape the main listing page for questions and answer links
        
        Args:
            listing_url: URL of the listing page
            
        Returns:
            List of question dictionaries with links
        """
        soup = self.get_page_content(listing_url)
        if not soup:
            return []
        
        questions = []
        
        # Look for common patterns in certification pages
        # This is a generic approach that can be customized for specific sites
        question_selectors = [
            'div[class*="question"]',
            'li[class*="question"]',
            'div[class*="qa"]',
            'div[class*="faq"]',
            'article',
            '.question-item',
            '.qa-item'
        ]
        
        for selector in question_selectors:
            question_elements = soup.select(selector)
            if question_elements:
                logger.info(f"Found {len(question_elements)} elements with selector: {selector}")
                break
        
        if not question_elements:
            # Fallback: look for links that might be questions
            question_elements = soup.find_all('a', href=True)
            logger.info(f"Fallback: Found {len(question_elements)} links")
        
        for element in question_elements:
            try:
                # Extract question text
                question_text = element.get_text(strip=True)
                if not question_text or len(question_text) < 10:
                    continue
                
                # Find associated link
                link = None
                if element.name == 'a':
                    link = element.get('href')
                else:
                    # Look for a link within the element
                    link_elem = element.find('a', href=True)
                    if link_elem:
                        link = link_elem.get('href')
                
                if link:
                    # Make absolute URL
                    absolute_link = urljoin(listing_url, link)
                    
                    questions.append({
                        'question': question_text,
                        'link': absolute_link,
                        'scraped_from': listing_url
                    })
                    
            except Exception as e:
                logger.error(f"Error processing question element: {e}")
                continue
        
        logger.info(f"Scraped {len(questions)} questions from listing page")
        return questions
    
    def scrape_answer_content(self, answer_url: str) -> Dict:
        """
        Scrape the answer content from an individual answer page
        
        Args:
            answer_url: URL of the answer page
            
        Returns:
            Dictionary with answer content
        """
        soup = self.get_page_content(answer_url)
        if not soup:
            return {'error': 'Failed to fetch page'}
        
        # Extract text content using trafilatura for better readability
        text_content = self.get_website_text_content(answer_url)
        
        # Also try to get structured content
        answer_selectors = [
            'div[class*="answer"]',
            'div[class*="content"]',
            'div[class*="explanation"]',
            'div[class*="solution"]',
            'main',
            'article',
            '.answer-content',
            '.content-body'
        ]
        
        structured_content = ""
        for selector in answer_selectors:
            answer_elem = soup.select_one(selector)
            if answer_elem:
                structured_content = answer_elem.get_text(strip=True)
                break
        
        # Extract multiple choice options if present
        options = []
        option_selectors = [
            'input[type="radio"]',
            'input[type="checkbox"]',
            'li[class*="option"]',
            'div[class*="choice"]',
            '.option',
            '.choice'
        ]
        
        for selector in option_selectors:
            option_elements = soup.select(selector)
            for elem in option_elements:
                option_text = elem.get_text(strip=True)
                if option_text:
                    # Check if this is marked as correct
                    is_correct = (
                        'correct' in elem.get('class', []) or
                        elem.get('checked') or
                        'selected' in elem.get('class', []) or
                        elem.find_parent(class_=lambda x: x and 'correct' in ' '.join(x))
                    )
                    
                    options.append({
                        'text': option_text,
                        'is_correct': bool(is_correct)
                    })
        
        return {
            'url': answer_url,
            'text_content': text_content,
            'structured_content': structured_content,
            'options': options,
            'raw_html': str(soup) if len(str(soup)) < 10000 else str(soup)[:10000] + "..."
        }
    
    def scrape_full_course(self, listing_url: str, course_name: str = None) -> Dict:
        """
        Scrape a complete course with questions and answers
        
        Args:
            listing_url: URL of the course listing page
            course_name: Name of the course (optional)
            
        Returns:
            Complete course data dictionary
        """
        if not course_name:
            course_name = urlparse(listing_url).netloc
        
        logger.info(f"Starting scrape for course: {course_name}")
        
        # Scrape questions from listing page
        questions = self.scrape_questions_listing(listing_url)
        
        # Scrape answers for each question
        course_data = {
            'course_name': course_name,
            'listing_url': listing_url,
            'scraped_date': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_questions': len(questions),
            'questions': []
        }
        
        for i, question_data in enumerate(questions, 1):
            logger.info(f"Processing question {i}/{len(questions)}: {question_data['question'][:50]}...")
            
            # Scrape answer content
            answer_data = self.scrape_answer_content(question_data['link'])
            
            # Combine question and answer data
            complete_qa = {
                'id': i,
                'question': question_data['question'],
                'question_source_url': question_data['link'],
                'answer_data': answer_data,
                'scraped_from_listing': question_data['scraped_from']
            }
            
            course_data['questions'].append(complete_qa)
        
        logger.info(f"Completed scraping {len(questions)} questions for {course_name}")
        return course_data
