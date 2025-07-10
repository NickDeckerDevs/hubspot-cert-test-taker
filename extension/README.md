## HubSpot Certification Exams

- [HubSpot Growth Driven Design Certification](https://app.hubspot.com/academy/171726/tracks/9108789/exam)  
- [HubSpot CMS for Developers](https://app.hubspot.com/academy/171726/tracks/9171525/exam)  
- [Integrating With HubSpot I: Foundations](https://app.hubspot.com/academy/171726/tracks/9108788/exam)  
- [HubSpot CMS for Developers II: Best Practices](https://app.hubspot.com/academy/171726/tracks/9146235/exam)  
- [HubSpot Content Hub for Marketers](https://app.hubspot.com/academy/171726/tracks/9206068/exam)  
- [Service Hub Software](https://app.hubspot.com/academy/171726/tracks/9148739/exam)  
- [Inbound Marketing Optimization](https://app.hubspot.com/academy/171726/tracks/9147492/exam)  
- [Social Media Marketing](https://app.hubspot.com/academy/171726/tracks/9206658/exam)  
- [Social Media Marketing Certification II](https://app.hubspot.com/academy/171726/tracks/9108125/exam)  
- [Inbound](https://app.hubspot.com/academy/171726/tracks/9181866/exam)  
- [Email Marketing](https://app.hubspot.com/academy/171726/tracks/9151241/exam)  
- [Email Marketing Software](https://app.hubspot.com/academy/171726/tracks/9219097/exam)  
- [Content Marketing](https://app.hubspot.com/academy/171726/tracks/9206665/exam)  
- [HubSpot Marketing Hub Software](https://app.hubspot.com/academy/171726/tracks/9219692/exam)  
- [HubSpot Reporting](https://app.hubspot.com/academy/171726/tracks/9181275/exam)  
- [Digital Advertising](https://app.hubspot.com/academy/171726/tracks/9219107)  
- [Digital Marketing](https://app.hubspot.com/academy/171726/tracks/9219103/exam)  
- [SEO](https://app.hubspot.com/academy/171726/tracks/9157909/exam)  
- [SEO II](https://app.hubspot.com/academy/171726/tracks/9108127/exam)  
- [Contextual Marketing](https://app.hubspot.com/academy/171726/tracks/9141778/exam)  
- [HubSpot Sales Hub Software](https://app.hubspot.com/academy/171726/tracks/9147486/exam)  
- [Frictionless Sales](https://app.hubspot.com/academy/171726/tracks/9147503/exam)  
- [Sales Enablement](https://app.hubspot.com/academy/171726/tracks/9206662/exam)  
- [Sales Management](https://app.hubspot.com/academy/171726/tracks/9206655/exam)  
- [Revenue Operations](https://app.hubspot.com/academy/171726/tracks/9219099/exam)  

# Q&A Schema Highlighter Chrome Extension

This Chrome extension highlights correct answers on certification course pages based on scraped Q&A schemas.

## How to Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" 
4. Select the `extension` folder from this project
5. The extension should now appear in your Chrome toolbar

## How to Use

### Step 1: Navigate to HubSpot Academy Exam
1. Go to the HubSpot Academy exam page: https://app.hubspot.com/academy/171726/tracks/9108789/exam
2. Make sure you're logged into HubSpot Academy
3. The extension will automatically detect the exam ID (9108789) and load the appropriate schema

### Step 2: Automatic Processing
1. The extension automatically detects questions and highlights answers
2. No manual processing needed - it works automatically!
3. When you click "Next" to go to the next question, the extension will automatically process the new question
4. Questions appear with blue borders, correct answers with green borders

### Step 3: Manual Control (Optional)
1. Click the extension icon to see status and statistics
2. Use "Process Page" button to manually trigger processing if needed
3. Use "Clear Highlights" to remove all highlighting

## Features

- **Automatic Detection**: Finds questions on pages automatically
- **Smart Matching**: Uses exact text matching and fuzzy matching for questions
- **Visual Feedback**: Green borders for correct answers, blue borders for questions
- **Status Display**: Shows number of questions found, answers highlighted, and schemas loaded
- **Schema Management**: Upload, list, and clear schema files
- **Multi-Site Support**: Works on various certification platforms

## Schema Format

The extension expects JSON schema files with this structure:

```json
{
  "schema_version": "1.0",
  "course_info": {
    "name": "Course Name",
    "source_url": "https://example.com",
    "total_questions": 3
  },
  "questions": [
    {
      "id": 1,
      "question": "What is the question text?",
      "answer": "This is the correct answer",
      "matching_keywords": ["keyword1", "keyword2"],
      "source_url": "https://example.com"
    }
  ]
}
```

## Testing

1. The extension automatically loads the complete Growth Driven Design schema with all 53 questions
2. Navigate to: https://app.hubspot.com/academy/171726/tracks/9108789/exam (requires HubSpot Academy login)
3. Upload the schema through the extension popup
4. Click "Process Page" and watch for questions highlighted in blue and correct answers in green
5. The extension will show the number of questions found and answers highlighted in the popup

## Troubleshooting

- **No questions detected**: The page structure may not match expected patterns
- **No answers highlighted**: Ensure your schema has correct answer text that matches page content
- **Extension not working**: Check that you have proper permissions for the target website

## Supported Sites

- GCertification Course (gcertificationcourse.com)
