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
        
        # First, try to find the main content area
        content_area = (soup.find('div', class_='entry-content') or 
                       soup.find('main') or 
                       soup.find('article') or 
                       soup.find('div', {'id': 'content'}))
        
        if content_area:
            logger.info("Found main content area")
        else:
            logger.warning("No main content area found, using entire page")
            content_area = soup
        
        # Look for questions in various formats
        # First priority: list items that contain questions
        question_elements = []
        
        # For this specific site structure, extract questions from text content
        if content_area:
            full_text = content_area.get_text()
            lines = full_text.split('\n')
            
            for line in lines:
                line = line.strip()
                # Look for lines that are likely questions
                if (line and '?' in line and len(line) > 20 and len(line) < 500 and
                    (line.startswith('What') or line.startswith('Which') or 
                     line.startswith('How') or line.startswith('Why') or 
                     line.startswith('True or false') or line.startswith('Fill in the blank') or
                     line.startswith('Imagine') or line.startswith('When') or
                     line.startswith('Where') or line.startswith('Who'))):
                    
                    # Create a pseudo-element for this question
                    question_elements.append({
                        'text': line,
                        'is_text_question': True
                    })
        
        if question_elements:
            logger.info(f"Found {len(question_elements)} question list items")
        else:
            # Try other selectors
            question_selectors = [
                'div[class*="question"]',
                'p:contains("?")',
                'h1:contains("?")',
                'h2:contains("?")',
                'h3:contains("?")',
                'h4:contains("?")',
                'strong:contains("?")',
                'div[class*="qa"]',
                'div[class*="faq"]'
            ]
            
            for selector in question_selectors:
                try:
                    if ':contains(' in selector and hasattr(content_area, 'find_all'):
                        # Handle pseudo-selector manually
                        tag = selector.split(':')[0]
                        elements = content_area.find_all(tag)
                        for elem in elements:
                            if '?' in elem.get_text():
                                question_elements.append(elem)
                    elif hasattr(content_area, 'select'):
                        elements = content_area.select(selector)
                        question_elements.extend(elements)
                    
                    if question_elements:
                        logger.info(f"Found {len(question_elements)} elements with selector: {selector}")
                        break
                except Exception as e:
                    logger.error(f"Error with selector {selector}: {e}")
                    continue
        
        # Process found questions
        for i, element in enumerate(question_elements):
            try:
                # Extract question text
                if isinstance(element, dict) and element.get('is_text_question'):
                    question_text = element['text']
                else:
                    question_text = element.get_text(strip=True) if hasattr(element, 'get_text') else str(element)
                
                if not question_text or len(question_text) < 10:
                    continue
                
                # For this specific site, the questions and answers are on the same page
                # We'll use the current URL as the link and extract answers from the same page
                questions.append({
                    'question': question_text,
                    'link': listing_url,  # Same page contains the answers
                    'scraped_from': listing_url,
                    'element_index': i,  # Track which element this was for answer extraction
                    'element_tag': element.get('name', 'text') if hasattr(element, 'get') else 'text'
                })
                    
            except Exception as e:
                logger.error(f"Error processing question element: {e}")
                continue
        
        logger.info(f"Scraped {len(questions)} questions from listing page")
        return questions
    
    def scrape_answer_content(self, answer_url: str, question_data: Dict = None) -> Dict:
        """
        Scrape the answer content from an individual answer page
        
        Args:
            answer_url: URL of the answer page
            question_data: Optional question data for context
            
        Returns:
            Dictionary with answer content
        """
        soup = self.get_page_content(answer_url)
        if not soup:
            return {'error': 'Failed to fetch page'}
        
        # Extract text content using trafilatura for better readability
        text_content = self.get_website_text_content(answer_url)
        
        # Find the main content area
        content_area = (soup.find('div', class_='entry-content') or 
                       soup.find('main') or 
                       soup.find('article') or 
                       soup.find('div', {'id': 'content'}) or
                       soup)
        
        # For pages where questions and answers are together, 
        # try to extract the answer that follows the question
        answer_text = ""
        
        if question_data and 'element_index' in question_data:
            # Find the specific question element and look for answer after it
            li_elements = content_area.find_all('li')
            question_index = question_data['element_index']
            
            if question_index < len(li_elements):
                current_element = li_elements[question_index]
                
                # Look for answer patterns after the question
                # Check next sibling elements
                next_element = current_element.find_next_sibling()
                if next_element:
                    answer_text = next_element.get_text(strip=True)
                
                # Also check if the answer is in the same element (after the question)
                element_text = current_element.get_text(strip=True)
                if 'Answer:' in element_text or 'A:' in element_text:
                    # Split on common answer markers
                    parts = element_text.split('Answer:', 1)
                    if len(parts) > 1:
                        answer_text = parts[1].strip()
                    else:
                        parts = element_text.split('A:', 1)
                        if len(parts) > 1:
                            answer_text = parts[1].strip()
        
        # If no specific answer found, try general answer extraction
        if not answer_text:
            answer_selectors = [
                'div[class*="answer"]',
                'div[class*="content"]',
                'div[class*="explanation"]',
                'div[class*="solution"]',
                '.answer-content',
                '.content-body'
            ]
            
            for selector in answer_selectors:
                answer_elem = content_area.select_one(selector)
                if answer_elem:
                    answer_text = answer_elem.get_text(strip=True)
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
            option_elements = content_area.select(selector)
            for elem in option_elements:
                option_text = elem.get_text(strip=True)
                if option_text and len(option_text) < 200:  # Reasonable option length
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
            'structured_content': answer_text,
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
        
        # Since all questions are on the same page, fetch it once and extract answers
        soup = self.get_page_content(listing_url)
        if not soup:
            logger.error("Failed to fetch main page for answer extraction")
            return {'error': 'Failed to fetch page'}
        
        # Scrape answers for each question
        course_data = {
            'course_name': course_name,
            'listing_url': listing_url,
            'scraped_date': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_questions': len(questions),
            'questions': []
        }
        
        # Extract answers from the same page using the cached content
        for i, question_data in enumerate(questions, 1):
            logger.info(f"Processing question {i}/{len(questions)}: {question_data['question'][:50]}...")
            
            # Extract answer from the same page content
            answer_data = self._extract_answer_from_page(soup, question_data, listing_url)
            
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
    
    def _extract_answer_from_page(self, soup, question_data: Dict, url: str) -> Dict:
        """
        Extract answer for a specific question from the page soup
        
        Args:
            soup: BeautifulSoup object of the page
            question_data: Question data dictionary
            url: URL of the page
            
        Returns:
            Dictionary with answer content
        """
        try:
            answer_text = None
            
            # Look for the correct answer pattern: <li> elements with <strong> tags inside <article>
            article = soup.find('article')
            if article:
                # Find all list items within the article
                list_items = article.find_all('li')
                
                for li in list_items:
                    # Look for <strong> tag within this list item
                    strong_tag = li.find('strong')
                    if strong_tag:
                        answer_text = strong_tag.get_text(strip=True)
                        logging.info(f"Found answer in <strong> tag: {answer_text}")
                        break
            
            # Fallback: Look for bold text in lists anywhere on the page
            if not answer_text:
                bold_in_lists = soup.find_all('li')
                for li in bold_in_lists:
                    strong_tag = li.find('strong')
                    if strong_tag:
                        answer_text = strong_tag.get_text(strip=True)
                        logging.info(f"Found answer in fallback search: {answer_text}")
                        break
            
            if not answer_text:
                logging.warning(f"Could not extract answer from {url}")
                answer_text = "Answer not found"
            
            return {
                'url': url,
                'text_content': answer_text,
                'structured_content': answer_text,
                'options': [],
                'extraction_method': 'strong_tag_in_list_item'
            }
            
        except Exception as e:
            logging.error(f"Error extracting answer from {url}: {str(e)}")
            return {
                'url': url,
                'text_content': "Error extracting answer",
                'structured_content': "Error extracting answer",
                'options': [],
                'extraction_method': 'error'
            }
