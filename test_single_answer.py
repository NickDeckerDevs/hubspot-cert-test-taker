#!/usr/bin/env python3

import sys
sys.path.append('.')

from scraper import WebScraper

# Test a single question to verify the answer extraction
scraper = WebScraper("https://www.gcertificationcourse.com", delay=0.5)

# Test the specific question from the user's example
test_url = "https://www.gcertificationcourse.com/which-of-the-following-is-not-a-good-way-to-speed-up-the-process/"
question_data = {
    'question': "Which of the following is NOT a good way to speed up the process of building a launch pad website?",
    'link': test_url
}

print(f"Testing answer extraction from: {test_url}")
print(f"Question: {question_data['question']}")

# Get the page and extract the answer
soup = scraper.get_page_content(test_url)
if soup:
    answer_data = scraper._extract_answer_from_page(soup, question_data, test_url)
    
    print(f"\nExtracted answer: {answer_data['structured_content']}")
    print(f"Extraction method: {answer_data['extraction_method']}")
    print(f"Source URL: {answer_data['url']}")
    
    # Expected answer based on the user's HTML: "Build the site as quickly as possible, regardless of quality."
    expected = "Build the site as quickly as possible, regardless of quality."
    if expected in answer_data['structured_content']:
        print(f"\n✅ SUCCESS: Found expected answer!")
    else:
        print(f"\n❌ MISMATCH: Expected '{expected}' but got '{answer_data['structured_content']}'")
else:
    print("❌ Failed to fetch page")