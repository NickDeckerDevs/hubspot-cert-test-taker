// Q&A Schema Highlighter Content Script
(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        highlightColor: '#00ff00',
        highlightWidth: '3px',
        partialMatchThreshold: 0.8,
        maxQuestionsPerPage: 50,
        debugMode: false
    };
    
    // Global variables
    let loadedSchemas = [];
    let highlightedElements = [];
    let processedQuestions = new Set();
    
    // Utility functions
    function log(message, data = null) {
        if (CONFIG.debugMode) {
            console.log(`[Q&A Highlighter] ${message}`, data || '');
        }
    }
    
    function normalizeText(text) {
        if (!text) return '';
        return text.trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toLowerCase();
    }
    
    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    function levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // Schema management
    function loadSchemas() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['qaSchemas'], (result) => {
                loadedSchemas = result.qaSchemas || [];
                log(`Loaded ${loadedSchemas.length} schemas`);
                resolve(loadedSchemas);
            });
        });
    }
    
    function findMatchingQuestion(questionText) {
        const normalizedQuestion = normalizeText(questionText);
        
        for (const schema of loadedSchemas) {
            if (!schema.questions) continue;
            
            for (const qa of schema.questions) {
                const normalizedSchemaQuestion = normalizeText(qa.question);
                
                // Exact match
                if (normalizedQuestion === normalizedSchemaQuestion) {
                    return { qa, matchType: 'exact', similarity: 1.0 };
                }
                
                // Partial match
                const similarity = calculateSimilarity(normalizedQuestion, normalizedSchemaQuestion);
                if (similarity >= CONFIG.partialMatchThreshold) {
                    return { qa, matchType: 'partial', similarity };
                }
                
                // Keyword match
                if (qa.matching_keywords) {
                    const questionWords = normalizedQuestion.split(' ');
                    const matchingKeywords = qa.matching_keywords.filter(keyword => 
                        questionWords.some(word => word.includes(keyword) || keyword.includes(word))
                    );
                    
                    if (matchingKeywords.length >= Math.min(3, qa.matching_keywords.length * 0.5)) {
                        return { qa, matchType: 'keyword', similarity: matchingKeywords.length / qa.matching_keywords.length };
                    }
                }
            }
        }
        
        return null;
    }
    
    // Question detection
    function findQuestionElements() {
        const questionSelectors = [
            // HubSpot Academy specific selectors
            '[data-test-id*="question"]',
            '[data-testid*="question"]',
            '[class*="question"]',
            '[id*="question"]',
            // Generic exam platform selectors
            '[class*="quiz"]',
            '[class*="assessment"]',
            '[class*="exam"]',
            '[role="group"]',
            '[role="radiogroup"]',
            '[role="checkbox"]',
            // Content-based selectors for question text
            'div:contains("?")',
            'p:contains("?")',
            'h1:contains("?")',
            'h2:contains("?")',
            'h3:contains("?")',
            'h4:contains("?")',
            'li:contains("?")',
            'label:contains("?")',
            'span:contains("?")'
        ];
        
        const questionElements = [];
        
        // First, try specific selectors
        for (const selector of questionSelectors.slice(0, 2)) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent.trim();
                if (text.length > 10 && text.includes('?')) {
                    questionElements.push(element);
                }
            }
        }
        
        // If no specific elements found, search for text containing questions
        if (questionElements.length === 0) {
            const allElements = document.querySelectorAll('div, p, h1, h2, h3, h4, li, span');
            for (const element of allElements) {
                const text = element.textContent.trim();
                if (text.length > 20 && text.includes('?') && text.length < 500) {
                    // Check if it's likely a question (not just containing a question mark)
                    const questionPatterns = [
                        /^(what|which|who|when|where|why|how|is|are|do|does|did|can|could|should|would|will)/i,
                        /\?$/,
                        /^.{10,200}\?/
                    ];
                    
                    if (questionPatterns.some(pattern => pattern.test(text))) {
                        questionElements.push(element);
                    }
                }
            }
        }
        
        log(`Found ${questionElements.length} potential question elements`);
        return questionElements.slice(0, CONFIG.maxQuestionsPerPage);
    }
    
    // Answer highlighting
    function highlightCorrectAnswer(questionElement, answer) {
        const answerCandidates = findAnswerCandidates(questionElement, answer);
        
        for (const candidate of answerCandidates) {
            if (isAnswerMatch(candidate.element, answer)) {
                highlightElement(candidate.element, 'correct-answer');
                log(`Highlighted correct answer: ${candidate.element.textContent.substring(0, 50)}...`);
                return true;
            }
        }
        
        return false;
    }
    
    function findAnswerCandidates(questionElement, answer) {
        const candidates = [];
        const searchRadius = 500; // pixels to search around the question
        
        // Get question position
        const questionRect = questionElement.getBoundingClientRect();
        
        // Find potential answer elements - enhanced for HubSpot Academy
        const answerSelectors = [
            // Form elements
            'input[type="radio"]',
            'input[type="checkbox"]',
            'label',
            'button',
            // HubSpot Academy specific
            '[data-test-id*="option"]',
            '[data-testid*="option"]',
            '[data-test-id*="choice"]',
            '[data-testid*="choice"]',
            '[data-test-id*="answer"]',
            '[data-testid*="answer"]',
            // Generic class-based selectors
            '[class*="option"]',
            '[class*="choice"]',
            '[class*="answer"]',
            '[class*="radio"]',
            '[class*="checkbox"]',
            // Content containers
            'li',
            'div',
            'span',
            'p'
        ];
        
        const allElements = document.querySelectorAll(answerSelectors.join(','));
        
        for (const element of allElements) {
            const elementRect = element.getBoundingClientRect();
            
            // Check if element is within search radius
            const distance = Math.sqrt(
                Math.pow(elementRect.top - questionRect.bottom, 2) +
                Math.pow(elementRect.left - questionRect.left, 2)
            );
            
            if (distance <= searchRadius) {
                const text = element.textContent.trim();
                if (text.length > 0) {
                    candidates.push({
                        element,
                        text,
                        distance
                    });
                }
            }
        }
        
        // Sort by distance (closest first)
        return candidates.sort((a, b) => a.distance - b.distance);
    }
    
    function isAnswerMatch(element, correctAnswer) {
        const elementText = normalizeText(element.textContent);
        const answerText = normalizeText(correctAnswer);
        
        // Direct match
        if (elementText === answerText) return true;
        
        // Contains match
        if (elementText.includes(answerText) || answerText.includes(elementText)) return true;
        
        // Similarity match
        const similarity = calculateSimilarity(elementText, answerText);
        return similarity >= CONFIG.partialMatchThreshold;
    }
    
    function highlightElement(element, className) {
        // Remove any existing highlights
        element.classList.remove('qa-highlight-correct', 'qa-highlight-question');
        
        // Add new highlight
        element.classList.add(`qa-highlight-${className}`);
        
        // Apply inline styles as backup
        const originalStyle = element.style.cssText;
        element.style.border = `${CONFIG.highlightWidth} solid ${CONFIG.highlightColor}`;
        element.style.borderRadius = '4px';
        element.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        
        highlightedElements.push({
            element,
            originalStyle,
            className
        });
    }
    
    // Main processing function
    async function processPage() {
        log('Starting page processing...');
        
        // Load schemas
        await loadSchemas();
        
        if (loadedSchemas.length === 0) {
            log('No schemas loaded, showing alert');
            showAlert('No Q&A schemas loaded. Please upload schema files first.', 'warning');
            return;
        }
        
        // Find questions on the page
        const questionElements = findQuestionElements();
        
        if (questionElements.length === 0) {
            log('No questions found on page');
            showAlert('No questions detected on this page.', 'info');
            return;
        }
        
        let highlightedCount = 0;
        let unrecognizedCount = 0;
        
        // Process each question
        for (const questionElement of questionElements) {
            const questionText = questionElement.textContent.trim();
            
            // Skip if already processed
            if (processedQuestions.has(questionText)) continue;
            processedQuestions.add(questionText);
            
            // Find matching Q&A in schema
            const match = findMatchingQuestion(questionText);
            
            if (match) {
                log(`Found match for question: ${questionText.substring(0, 50)}...`, match);
                
                // Highlight the question
                highlightElement(questionElement, 'question');
                
                // Highlight the correct answer
                const answerHighlighted = highlightCorrectAnswer(questionElement, match.qa.answer);
                
                if (answerHighlighted) {
                    highlightedCount++;
                } else {
                    log(`Could not find answer element for: ${questionText.substring(0, 50)}...`);
                }
            } else {
                unrecognizedCount++;
                log(`No match found for question: ${questionText.substring(0, 50)}...`);
            }
        }
        
        // Show results
        const message = `Processed ${questionElements.length} questions. Highlighted ${highlightedCount} answers.`;
        if (unrecognizedCount > 0) {
            message += ` ${unrecognizedCount} questions not recognized.`;
        }
        
        showAlert(message, highlightedCount > 0 ? 'success' : 'warning');
        
        // Update badge
        chrome.runtime.sendMessage({
            action: 'updateBadge',
            count: highlightedCount
        });
    }
    
    // Alert system
    function showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlert = document.querySelector('.qa-highlighter-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `qa-highlighter-alert qa-alert-${type}`;
        alert.textContent = message;
        
        // Style the alert
        Object.assign(alert.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: '10000',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Set colors based on type
        const colors = {
            success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
            warning: { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' },
            error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
            info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
        };
        
        const color = colors[type] || colors.info;
        alert.style.backgroundColor = color.bg;
        alert.style.color = color.text;
        alert.style.border = `1px solid ${color.border}`;
        
        // Add to page
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
    
    // Clean up function
    function clearHighlights() {
        for (const highlighted of highlightedElements) {
            highlighted.element.style.cssText = highlighted.originalStyle;
            highlighted.element.classList.remove(`qa-highlight-${highlighted.className}`);
        }
        highlightedElements = [];
        processedQuestions.clear();
    }
    
    // Event listeners
    document.addEventListener('DOMContentLoaded', processPage);
    
    // Re-process when page content changes
    let contentChangeTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(contentChangeTimer);
        contentChangeTimer = setTimeout(() => {
            log('Page content changed, re-processing...');
            processPage();
        }, 1000);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Message listener for commands from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'processPage':
                processPage();
                sendResponse({ success: true });
                break;
                
            case 'clearHighlights':
                clearHighlights();
                sendResponse({ success: true });
                break;
                
            case 'reloadSchemas':
                loadSchemas().then(() => {
                    sendResponse({ success: true, count: loadedSchemas.length });
                });
                return true; // Indicates async response
                
            case 'getPageInfo':
                const questionElements = findQuestionElements();
                sendResponse({
                    url: window.location.href,
                    questionsFound: questionElements.length,
                    highlightedCount: highlightedElements.length,
                    schemasLoaded: loadedSchemas.length
                });
                break;
        }
    });
    
    log('Q&A Highlighter content script loaded');
})();
