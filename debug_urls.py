#!/usr/bin/env python3

import sys
sys.path.append('.')

from scraper import WebScraper

# Test URL extraction with more debug
scraper = WebScraper("https://www.gcertificationcourse.com", delay=0.5)

# Get page content to debug
soup = scraper.get_page_content("https://www.gcertificationcourse.com/hubspot-growth-driven-design-answers/")

# Find the main content area
content_area = (soup.find('div', class_='entry-content') or 
               soup.find('main') or 
               soup.find('article') or 
               soup.find('div', {'id': 'content'}) or
               soup)

print("Checking page structure...")

# Check for list items first
li_elements = content_area.find_all('li')
print(f"Found {len(li_elements)} <li> elements")

# Check ALL <li> elements for <a> tags (to find the question links)
print("\nLooking for <li> elements with <a> tags:")
question_links = []
for i, li in enumerate(li_elements):
    a_tag = li.find('a')
    if a_tag and a_tag.get('href', '').startswith('https://www.gcertificationcourse.com/'):
        question_links.append({
            'text': a_tag.get_text(strip=True),
            'href': a_tag.get('href', ''),
            'li_index': i
        })

print(f"Found {len(question_links)} question links")
print("\nFirst 5 question links:")
for i, link in enumerate(question_links[:5]):
    print(f"{i+1}. Question: {link['text'][:60]}...")
    print(f"   URL: {link['href']}")
    print(f"   LI index: {link['li_index']}")
    print()

# Test the actual scraper method
print("Now testing scraper method:")
questions = scraper.scrape_questions_listing("https://www.gcertificationcourse.com/hubspot-growth-driven-design-answers/")

print(f"Scraper found {len(questions)} questions")
print("\nFirst 3 questions from scraper:")
for i, q in enumerate(questions[:3]):
    print(f"{i+1}. Question: {q['question'][:60]}...")
    print(f"   URL: {q['link']}")
    print()