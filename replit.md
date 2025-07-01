# Q&A Schema Scraper and Chrome Extension

## Overview

This project is a comprehensive system for scraping question-and-answer content from certification course websites and providing automated answer highlighting through a Chrome extension. The system consists of two main components: a Python-based web scraper that extracts Q&A data and builds schemas, and a Chrome extension that uses these schemas to highlight correct answers on certification course pages in real-time.

## System Architecture

The system follows a two-tier architecture:

1. **Backend (Python)**: Web scraper and schema builder that extracts Q&A data from educational websites
2. **Frontend (Chrome Extension)**: Browser extension that consumes the generated schemas and provides real-time answer highlighting

### Backend Architecture
- **Scraper Module**: Handles HTTP requests, HTML parsing, and content extraction using BeautifulSoup and Trafilatura
- **Schema Builder**: Processes scraped data and generates standardized JSON schemas for Q&A content
- **Configuration Management**: Centralized configuration for scraping parameters and site-specific selectors

### Frontend Architecture
- **Chrome Extension**: Manifest V3 extension with background service worker, content scripts, and popup interface
- **Content Script**: Injected into target pages to perform DOM manipulation and answer highlighting
- **Background Script**: Manages extension lifecycle, badge updates, and cross-tab communication

## Key Components

### Python Backend Components

1. **WebScraper (`scraper.py`)**
   - Handles HTTP requests with respectful rate limiting
   - Parses HTML content using BeautifulSoup
   - Extracts content using Trafilatura for better text extraction
   - Implements retry logic and error handling

2. **SchemaBuilder (`schema_builder.py`)**
   - Cleans and normalizes question text for consistent matching
   - Extracts correct answers from scraped data
   - Generates JSON schemas with standardized format
   - Handles data validation and quality checks

3. **Configuration (`config.py`)**
   - Centralized settings for scraping behavior
   - Site-specific CSS selectors for different platforms (HubSpot, etc.)
   - Extension configuration parameters
   - Matching algorithms configuration

4. **Main Orchestrator (`main.py`)**
   - Command-line interface for the scraping process
   - Coordinates scraper and schema builder operations
   - Handles logging and error reporting

### Chrome Extension Components

1. **Background Service Worker (`background.js`)**
   - Manages extension lifecycle and installation
   - Updates badge text to show answer count
   - Handles cross-tab communication

2. **Content Script (`content.js`)**
   - Injects into target certification pages
   - Performs DOM analysis to find questions and answers
   - Implements text matching algorithms with fuzzy matching
   - Applies visual highlights to correct answers

3. **Popup Interface (`popup.html`, `popup.js`)**
   - Provides user interface for extension management
   - Displays statistics (questions found, answers highlighted)
   - Allows schema file uploads and management
   - Controls extension behavior

4. **Styling (`styles.css`)**
   - Defines visual highlighting styles
   - Provides smooth animations and transitions
   - Ensures accessibility and visibility

## Data Flow

1. **Schema Generation Flow**:
   - Python scraper fetches pages from certification sites
   - HTML content is parsed to extract questions and answers
   - SchemaBuilder normalizes and structures the data
   - JSON schemas are generated and saved locally

2. **Answer Highlighting Flow**:
   - User navigates to a certification course page
   - Content script loads stored schemas from Chrome storage
   - Page DOM is analyzed to identify questions and answer options
   - Text matching algorithm compares page content with schema data
   - Correct answers are highlighted with visual indicators
   - Badge shows count of highlighted answers

3. **Schema Management Flow**:
   - Users can upload schema files through the popup interface
   - Schemas are stored in Chrome's local storage
   - Multiple schemas can be loaded and managed simultaneously
   - Schemas can be cleared or refreshed as needed

## External Dependencies

### Python Backend
- **requests**: HTTP client for web scraping
- **BeautifulSoup4**: HTML parsing and DOM manipulation
- **trafilatura**: Enhanced content extraction
- **urllib**: URL parsing and manipulation

### Chrome Extension
- **Chrome Extension APIs**: Storage, tabs, scripting, and action APIs
- **DOM APIs**: For page content analysis and manipulation
- **Web Standards**: HTML5, CSS3, ES6+ JavaScript

### Target Platforms
- HubSpot Academy (academy.hubspot.com)
- Google Skillshop (skillshop.withgoogle.com)
- Facebook Blueprint (facebookblueprint.com)
- Extensible to other certification platforms

## Deployment Strategy

### Python Backend Deployment
- Standalone Python application that can be run locally
- Requires Python 3.6+ with pip-installed dependencies
- Output schemas are saved to local filesystem
- Can be containerized for consistent deployment environments

### Chrome Extension Deployment
- Manifest V3 extension compatible with modern Chrome browsers
- Can be loaded as unpacked extension for development
- Production deployment through Chrome Web Store
- Requires host permissions for target certification sites

### Schema Distribution
- Schemas can be distributed as JSON files
- Users can manually upload schema files through extension popup
- Future enhancement could include cloud-based schema distribution

## Changelog
- July 01, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.