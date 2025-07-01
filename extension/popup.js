// Q&A Schema Highlighter Popup Script
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const currentUrlElement = document.getElementById('currentUrl');
    const questionsFoundElement = document.getElementById('questionsFound');
    const highlightedCountElement = document.getElementById('highlightedCount');
    const schemasLoadedElement = document.getElementById('schemasLoaded');
    const messageElement = document.getElementById('message');
    const processBtn = document.getElementById('processBtn');
    const clearBtn = document.getElementById('clearBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const schemaFileInput = document.getElementById('schemaFile');
    const schemaListElement = document.getElementById('schemaList');
    const clearSchemasBtn = document.getElementById('clearSchemasBtn');
    
    // Initialize popup
    init();
    
    async function init() {
        await updatePageInfo();
        await loadSchemaList();
        setupEventListeners();
    }
    
    function setupEventListeners() {
        processBtn.addEventListener('click', processPage);
        clearBtn.addEventListener('click', clearHighlights);
        refreshBtn.addEventListener('click', refreshSchemas);
        schemaFileInput.addEventListener('change', handleFileUpload);
        clearSchemasBtn.addEventListener('click', clearAllSchemas);
    }
    
    async function updatePageInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Update current URL
            const url = new URL(tab.url);
            currentUrlElement.textContent = url.hostname;
            currentUrlElement.title = tab.url;
            
            // Get page info from content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
            
            if (response) {
                questionsFoundElement.textContent = response.questionsFound || 0;
                highlightedCountElement.textContent = response.highlightedCount || 0;
                schemasLoadedElement.textContent = response.schemasLoaded || 0;
                
                // Update status colors
                updateStatusColors();
            }
        } catch (error) {
            console.error('Error updating page info:', error);
            currentUrlElement.textContent = 'Error';
            showMessage('Failed to get page information. Please refresh the page.', 'error');
        }
    }
    
    function updateStatusColors() {
        const questionsCount = parseInt(questionsFoundElement.textContent) || 0;
        const highlightedCount = parseInt(highlightedCountElement.textContent) || 0;
        const schemasCount = parseInt(schemasLoadedElement.textContent) || 0;
        
        // Questions found color
        questionsFoundElement.className = 'status-value ' + (questionsCount > 0 ? 'success' : 'warning');
        
        // Highlighted count color
        highlightedCountElement.className = 'status-value ' + (highlightedCount > 0 ? 'success' : 'warning');
        
        // Schemas loaded color
        schemasLoadedElement.className = 'status-value ' + (schemasCount > 0 ? 'success' : 'error');
    }
    
    async function processPage() {
        try {
            processBtn.disabled = true;
            processBtn.textContent = 'Processing...';
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'processPage' });
            
            // Update page info after processing
            setTimeout(async () => {
                await updatePageInfo();
                showMessage('Page processed successfully!', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('Error processing page:', error);
            showMessage('Failed to process page. Make sure you are on a supported course page.', 'error');
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = 'Process Page';
        }
    }
    
    async function clearHighlights() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
            
            await updatePageInfo();
            showMessage('Highlights cleared!', 'success');
            
        } catch (error) {
            console.error('Error clearing highlights:', error);
            showMessage('Failed to clear highlights.', 'error');
        }
    }
    
    async function refreshSchemas() {
        try {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'reloadSchemas' });
            
            await loadSchemaList();
            await updatePageInfo();
            
            showMessage(`Schemas refreshed! Loaded ${response.count} schemas.`, 'success');
            
        } catch (error) {
            console.error('Error refreshing schemas:', error);
            showMessage('Failed to refresh schemas.', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Schemas';
        }
    }
    
    async function handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        let uploadedCount = 0;
        let errors = [];
        
        try {
            // Get existing schemas
            const result = await chrome.storage.local.get(['qaSchemas']);
            let schemas = result.qaSchemas || [];
            
            // Process each file
            for (const file of files) {
                try {
                    const content = await readFileAsText(file);
                    const schema = JSON.parse(content);
                    
                    // Validate schema structure
                    if (validateSchema(schema)) {
                        // Add metadata
                        schema.uploaded_date = new Date().toISOString();
                        schema.filename = file.name;
                        
                        schemas.push(schema);
                        uploadedCount++;
                    } else {
                        errors.push(`${file.name}: Invalid schema format`);
                    }
                } catch (error) {
                    errors.push(`${file.name}: ${error.message}`);
                }
            }
            
            // Save updated schemas
            await chrome.storage.local.set({ qaSchemas: schemas });
            
            // Update UI
            await loadSchemaList();
            await updatePageInfo();
            
            // Show results
            if (uploadedCount > 0) {
                showMessage(`Successfully uploaded ${uploadedCount} schema(s)!`, 'success');
            }
            
            if (errors.length > 0) {
                showMessage(`Errors: ${errors.join(', ')}`, 'error');
            }
            
        } catch (error) {
            console.error('Error uploading schemas:', error);
            showMessage('Failed to upload schemas.', 'error');
        }
        
        // Clear file input
        schemaFileInput.value = '';
    }
    
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    function validateSchema(schema) {
        // Basic schema validation
        if (typeof schema !== 'object' || !schema) return false;
        if (!schema.course_info && !schema.questions) return false;
        
        // Check if it has questions array
        const questions = schema.questions || [];
        if (!Array.isArray(questions)) return false;
        
        // Validate at least one question has required fields
        if (questions.length > 0) {
            const firstQuestion = questions[0];
            if (!firstQuestion.question || !firstQuestion.answer) return false;
        }
        
        return true;
    }
    
    async function loadSchemaList() {
        try {
            const result = await chrome.storage.local.get(['qaSchemas']);
            const schemas = result.qaSchemas || [];
            
            schemaListElement.innerHTML = '';
            
            if (schemas.length === 0) {
                schemaListElement.innerHTML = '<div class="loading">No schemas loaded</div>';
                return;
            }
            
            schemas.forEach((schema, index) => {
                const schemaItem = document.createElement('div');
                schemaItem.className = 'schema-item';
                
                const courseName = schema.course_info?.name || schema.filename || `Schema ${index + 1}`;
                const questionCount = schema.questions?.length || 0;
                
                schemaItem.innerHTML = `
                    <div class="schema-name" title="${courseName}">${courseName}</div>
                    <div class="schema-count">${questionCount} Q&A</div>
                `;
                
                schemaListElement.appendChild(schemaItem);
            });
            
        } catch (error) {
            console.error('Error loading schema list:', error);
            schemaListElement.innerHTML = '<div class="error">Error loading schemas</div>';
        }
    }
    
    async function clearAllSchemas() {
        if (!confirm('Are you sure you want to clear all schemas? This action cannot be undone.')) {
            return;
        }
        
        try {
            await chrome.storage.local.set({ qaSchemas: [] });
            await loadSchemaList();
            await updatePageInfo();
            
            showMessage('All schemas cleared!', 'success');
            
        } catch (error) {
            console.error('Error clearing schemas:', error);
            showMessage('Failed to clear schemas.', 'error');
        }
    }
    
    function showMessage(text, type = 'info') {
        messageElement.textContent = text;
        messageElement.className = `message ${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
});
