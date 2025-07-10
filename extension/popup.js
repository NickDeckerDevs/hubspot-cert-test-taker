// Q&A Schema Highlighter Popup Script
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            console.log(`Opening: ${link.href}`);
        });
    });
});
