// Q&A Schema Highlighter Content Script
(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        highlightColor: '#00ff00',
        highlightWidth: '3px',
        partialMatchThreshold: 0.8,
        maxQuestionsPerPage: 50,
        debugMode: true // Enable debug mode for detailed console logging
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
    
    // Enhanced logging functions
    function logQuestion(questionText, questionElement = null) {
        console.group(`🔍 [Q&A] Found Question`);
        console.log(`Question Text: "${questionText}"`);
        if (questionElement) {
            console.log('Question Element:', questionElement);
            console.log('Element HTML:', questionElement.outerHTML.substring(0, 200) + '...');
        }
        console.groupEnd();
    }
    
    function logSchemaSearch(questionText, matchResult) {
        console.group(`🔎 [Q&A] Schema Search`);
        console.log(`Searching for: "${questionText}"`);
        console.log(`Normalized search text: "${normalizeText(questionText)}"`);
        
        if (matchResult) {
            console.log(`✅ MATCH FOUND!`);
            console.log(`Match Type: ${matchResult.matchType}`);
            console.log(`Similarity Score: ${matchResult.similarity.toFixed(3)}`);
            console.log(`Schema Question: "${matchResult.qa.question}"`);
            console.log(`Schema Answer: "${matchResult.qa.answer}"`);
            if (matchResult.qa.answer_options && matchResult.qa.answer_options.length > 0) {
                console.log(`Answer Options:`, matchResult.qa.answer_options);
            }
        } else {
            console.log(`❌ NO MATCH FOUND`);
            console.log(`Available schema questions (${loadedSchemas.length > 0 ? loadedSchemas[0].questions?.length || 0 : 0} total):`);
            if (loadedSchemas.length > 0 && loadedSchemas[0].questions) {
                loadedSchemas[0].questions.slice(0, 5).forEach((q, i) => {
                    console.log(`  ${i + 1}. "${q.question.substring(0, 80)}..."`);
                });
                if (loadedSchemas[0].questions.length > 5) {
                    console.log(`  ... and ${loadedSchemas[0].questions.length - 5} more`);
                }
            }
        }
        console.groupEnd();
    }
    
    function logAnswerSearch(questionElement, correctAnswer, candidates) {
        console.group(`🎯 [Q&A] Answer Search`);
        console.log(`Looking for answer: "${correctAnswer}"`);
        console.log(`Found ${candidates.length} answer candidates near question`);
        
        candidates.slice(0, 10).forEach((candidate, i) => {
            const isMatch = isAnswerMatch(candidate.element, correctAnswer);
            console.log(`${isMatch ? '✅' : '❌'} Candidate ${i + 1}: "${candidate.text}" (distance: ${candidate.distance.toFixed(1)}px)`);
            if (isMatch) {
                console.log(`   📍 Element:`, candidate.element);
            }
        });
        
        if (candidates.length > 10) {
            console.log(`... and ${candidates.length - 10} more candidates`);
        }
        console.groupEnd();
    }
    
    function logPageAnswers() {
        console.group(`📋 [Q&A] Page Answer Options Detected`);
        
        const answerElements = document.querySelectorAll([
            'input[type="radio"]',
            'input[type="checkbox"]', 
            'label',
            '[data-test-id*="option"]',
            '[data-testid*="option"]',
            '[class*="option"]',
            '[class*="choice"]',
            '[class*="answer"]'
        ].join(','));
        
        console.log(`Found ${answerElements.length} potential answer elements on page:`);
        
        answerElements.forEach((element, i) => {
            const text = element.textContent?.trim() || '';
            if (text.length > 0 && text.length < 200) {
                console.log(`${i + 1}. "${text}" (${element.tagName}${element.className ? '.' + element.className.split(' ').join('.') : ''})`);
            }
        });
        
        console.groupEnd();
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
        return new Promise(async (resolve) => {
            console.log('🔄 [Q&A] Loading schemas...');
            
            // First, try to load schema based on current URL
            const currentUrl = window.location.href;
            let examId = null;
            
            console.log(`🌐 [Q&A] Current URL: ${currentUrl}`);
            
            // Extract exam ID from HubSpot Academy URL
            const examIdMatch = currentUrl.match(/tracks\/(\d+)\/exam/);
            if (examIdMatch) {
                examId = examIdMatch[1];
                console.log(`🎯 [Q&A] Detected exam ID: ${examId}`);
                
                // Try to load the specific schema for this exam
                try {
                    const schemaUrl = `schemas/hubspot_gdd_${examId}_complete.json`;
                    console.log(`📥 [Q&A] Attempting to load schema: ${schemaUrl}`);
                    
                    const response = await fetch(chrome.runtime.getURL(schemaUrl));
                    if (response.ok) {
                        const schema = await response.json();
                        loadedSchemas = [schema];
                        console.log(`✅ [Q&A] Successfully loaded exam-specific schema:`);
                        console.log(`   📚 Course: ${schema.course_info.name}`);
                        console.log(`   📊 Questions: ${schema.questions.length}`);
                        console.log(`   🔗 Exam ID: ${schema.course_info.exam_id}`);
                        resolve(loadedSchemas);
                        return;
                    } else {
                        console.log(`❌ [Q&A] Schema file not found (${response.status}): ${schemaUrl}`);
                    }
                } catch (error) {
                    console.log(`❌ [Q&A] Error loading exam-specific schema for ID ${examId}:`, error);
                }
            } else {
                console.log(`❓ [Q&A] No exam ID found in URL`);
            }
            
            // Fallback to stored schemas from user uploads
            console.log(`🔄 [Q&A] Falling back to stored schemas from user uploads...`);
            chrome.storage.local.get(['qaSchemas'], (result) => {
                loadedSchemas = result.qaSchemas || [];
                console.log(`📚 [Q&A] Loaded ${loadedSchemas.length} stored schemas from user uploads`);
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
        console.group('🔍 [Q&A] Finding Question Elements');
        
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
        
        console.log(`🎯 [Q&A] Trying specific selectors first...`);
        // First, try specific selectors
        for (const selector of questionSelectors.slice(0, 10)) {
            const elements = document.querySelectorAll(selector);
            console.log(`   Selector "${selector}": found ${elements.length} elements`);
            
            for (const element of elements) {
                const text = element.textContent.trim();
                if (text.length > 10 && text.includes('?')) {
                    questionElements.push(element);
                    console.log(`   ✅ Added question: "${text.substring(0, 60)}..."`);
                }
            }
        }
        
        // If no specific elements found, search for text containing questions
        if (questionElements.length === 0) {
            console.log(`🔄 [Q&A] No specific elements found, searching all text elements...`);
            
            const allElements = document.querySelectorAll('div, p, h1, h2, h3, h4, li, span');
            console.log(`   Checking ${allElements.length} text elements for question patterns...`);
            
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
                        console.log(`   ✅ Found question by pattern: "${text.substring(0, 60)}..."`);
                    }
                }
            }
        }
        
        console.log(`📊 [Q&A] Total question elements found: ${questionElements.length}`);
        
        // Log details of each found question
        questionElements.slice(0, 10).forEach((element, i) => {
            const text = element.textContent.trim();
            console.log(`   ${i + 1}. "${text.substring(0, 80)}..." (${element.tagName})`);
        });
        
        if (questionElements.length > 10) {
            console.log(`   ... and ${questionElements.length - 10} more questions`);
        }
        
        console.groupEnd();
        
        return questionElements.slice(0, CONFIG.maxQuestionsPerPage);
    }
    
    // Answer highlighting
    function highlightCorrectAnswer(questionElement, answer) {
        console.group(`🎯 [Q&A] Highlighting Answer: "${answer}"`);
        
        const answerCandidates = findAnswerCandidates(questionElement, answer);
        console.log(`Found ${answerCandidates.length} answer candidates to check`);
        
        for (const candidate of answerCandidates) {
            const isMatch = isAnswerMatch(candidate.element, answer);
            console.log(`Checking candidate: "${candidate.text}" - Match: ${isMatch ? '✅' : '❌'}`);
            
            if (isMatch) {
                const highlightedElement = highlightAnswerElement(candidate.element);
                console.log(`✅ Successfully highlighted answer: "${candidate.text}"`);
                console.log(`Highlighted element:`, highlightedElement);
                console.groupEnd();
                return true;
            }
        }
        
        console.log(`❌ No matching answer found for: "${answer}"`);
        console.groupEnd();
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
    
    function highlightAnswerElement(textElement) {
        // Find the appropriate parent container using closest()
        const answerContainer = textElement.closest([
            '.SelectableBox__StyledInnerBox-p3ixlm-1', // HubSpot specific
            '[class*="SelectableBox"]',
            '[class*="option"]',
            '[class*="choice"]',
            '[class*="answer"]',
            'li',
            'label',
            'div'
        ].join(','));
        
        const targetElement = answerContainer || textElement;
        
        console.log(`🎨 [Q&A] Highlighting answer element:`, targetElement);
        
        // Store original styles
        const originalStyle = targetElement.style.cssText;
        
        // Apply green background highlighting (50% opacity)
        targetElement.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
        targetElement.style.transition = 'background-color 0.3s ease';
        
        // Store for cleanup
        highlightedElements.push({
            element: targetElement,
            originalStyle,
            className: 'answer-highlight'
        });
        
        return targetElement;
    }
    
    // Main processing function
    async function processPage() {
        console.log('🚀 [Q&A] Starting page processing...');
        
        // Load schemas
        await loadSchemas();
        
        if (loadedSchemas.length === 0) {
            console.log('❌ [Q&A] No schemas loaded');
            showAlert('No Q&A schemas loaded. Please upload schema files first.', 'warning');
            return;
        }
        
        console.log(`📚 [Q&A] Loaded ${loadedSchemas.length} schema(s) with ${loadedSchemas[0]?.questions?.length || 0} questions`);
        
        // Log all answer options currently visible on the page
        logPageAnswers();
        
        // Find questions on the page
        const questionElements = findQuestionElements();
        
        if (questionElements.length === 0) {
            console.log('❌ [Q&A] No questions found on page');
            showAlert('No questions detected on this page.', 'info');
            return;
        }
        
        console.log(`📋 [Q&A] Found ${questionElements.length} question elements on page`);
        
        let highlightedCount = 0;
        let unrecognizedCount = 0;
        
        // Process each question
        for (const questionElement of questionElements) {
            const questionText = questionElement.textContent.trim();
            
            // Skip if already processed
            if (processedQuestions.has(questionText)) continue;
            processedQuestions.add(questionText);
            
            // Log the found question
            logQuestion(questionText, questionElement);
            
            // Find matching Q&A in schema
            const match = findMatchingQuestion(questionText);
            
            // Log the schema search result
            logSchemaSearch(questionText, match);
            
            if (match) {
                // Only highlight the correct answer (no question highlighting)
                const answerHighlighted = highlightCorrectAnswer(questionElement, match.qa.answer);
                
                if (answerHighlighted) {
                    highlightedCount++;
                    console.log(`✅ [Q&A] Successfully highlighted answer for: "${questionText.substring(0, 50)}..."`);
                } else {
                    console.log(`❌ [Q&A] Could not find/highlight answer for: "${questionText.substring(0, 50)}..."`);
                }
            } else {
                unrecognizedCount++;
                console.log(`❓ [Q&A] No schema match for: "${questionText.substring(0, 50)}..."`);
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
        console.log(`🧹 [Q&A] Clearing ${highlightedElements.length} highlighted elements`);
        
        for (const highlighted of highlightedElements) {
            // Restore original styles
            highlighted.element.style.cssText = highlighted.originalStyle;
            
            // Remove any highlight classes that might have been added
            highlighted.element.classList.remove('qa-highlight-correct', 'qa-highlight-question', 'qa-highlight-answer');
        }
        
        highlightedElements = [];
        processedQuestions.clear();
        
        console.log(`✅ [Q&A] All highlights cleared`);
    }
    
    // Monitor for "Next" button clicks and page changes in HubSpot Academy
    function setupExamMonitoring() {
        log('Setting up exam monitoring for HubSpot Academy');
        
        // Monitor for "Next" button clicks
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Check if clicked element or its parents contain the next button data attributes
            let element = target;
            for (let i = 0; i < 5 && element; i++) {
                if (element.dataset && 
                    (element.dataset.testId === 'exam-next-question-button' ||
                     element.textContent?.includes('Next') && element.tagName === 'BUTTON')) {
                    
                    console.log('🔄 [Q&A] Next button clicked - clearing highlights and preparing for new question');
                    
                    // Immediately clear all existing highlights
                    clearHighlights();
                    
                    // Wait for new content to load, then process the page
                    setTimeout(() => {
                        console.log('🆕 [Q&A] Processing new question after Next button click');
                        processPage();
                    }, 1000); // 1 second delay for content to load
                    
                    break;
                }
                element = element.parentElement;
            }
        });
        
        // Also monitor for DOM changes (when new questions load)
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new content that might contain questions was added
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const text = node.textContent || '';
                            if (text.includes('?') && text.length > 20) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldProcess) {
                console.log('🔄 [Q&A] New question content detected via DOM changes');
                
                // Clear existing highlights before processing new content
                clearHighlights();
                
                // Small delay to ensure content is fully loaded
                setTimeout(() => {
                    console.log('🆕 [Q&A] Processing new question after DOM change');
                    processPage();
                }, 1000);
            }
        });
        
        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Exam monitoring setup complete');
    }

    // Event listeners and initialization
    document.addEventListener('DOMContentLoaded', () => {
        log('DOM loaded, initializing extension');
        setupExamMonitoring();
        processPage();
    });
    
    // Also try to initialize if DOM is already loaded
    if (document.readyState === 'loading') {
        // DOM is still loading
    } else {
        // DOM is already loaded
        log('DOM already loaded, initializing extension immediately');
        setupExamMonitoring();
        processPage();
    }
    
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
