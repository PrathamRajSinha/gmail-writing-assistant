class WritingAssistant {
    constructor() {
        console.log('Writing Assistant initialized');
        this.API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.isProcessing = false;
        this.setupUI();
        this.checkForComposeBox();
    }

    checkForComposeBox() {
        console.log('Checking for compose box');
        setInterval(() => {
            const composeBox = document.querySelector('div[role="textbox"][aria-label*="Body"]');
            if (composeBox && !document.querySelector('.writing-controls')) {
                console.log('Found compose box, creating controls');
                this.createControls(composeBox);
            }
        }, 1000);
    }

    setupUI() {
        console.log('Setting up UI');
        const observer = new MutationObserver((mutations, obs) => {
            const composeBox = document.querySelector('div[role="textbox"][aria-label*="Body"]');
            if (composeBox && !document.querySelector('.writing-controls')) {
                console.log('Creating controls through observer');
                this.createControls(composeBox);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    createControls(composeBox) {
        console.log('Creating controls');
        const controls = document.createElement('div');
        controls.className = 'writing-controls';

        const helpButton = document.createElement('button');
        helpButton.textContent = 'Help me write';
        helpButton.className = 'help-btn';
        
        const helpText = document.createElement('span');
        helpText.className = 'help-text';
        helpText.textContent = 'Use *stars* for specific parts';
        
        const processingIndicator = document.createElement('span');
        processingIndicator.className = 'processing-indicator';
        processingIndicator.textContent = 'Writing...';

        helpButton.addEventListener('click', async () => {
            if (this.isProcessing) return;
            
            let textToEnhance;
            let startIndex = 0;
            let endIndex = 0;

            // Check for selected text first
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                textToEnhance = selection.toString();
                const range = selection.getRangeAt(0);
                startIndex = range.startOffset;
                endIndex = range.endOffset;
            } else {
                // Check for text between stars
                const result = this.findTextBetweenStars(composeBox);
                if (result.textToEnhance) {
                    textToEnhance = result.textToEnhance;
                    startIndex = result.startIndex;
                    endIndex = result.endIndex;
                } else {
                    // Use all text if no selection or stars
                    textToEnhance = composeBox.textContent.trim();
                    if (!textToEnhance) {
                        alert('Please enter some text to enhance');
                        return;
                    }
                }
            }

            this.isProcessing = true;
            helpButton.disabled = true;
            processingIndicator.classList.add('active');
            
            try {
                const enhancedText = await this.improveText(textToEnhance);
                this.replaceText(composeBox, enhancedText, startIndex, endIndex);
            } catch (error) {
                console.error('Processing error:', error);
                alert('Error improving text. Please try again.');
            } finally {
                this.isProcessing = false;
                helpButton.disabled = false;
                processingIndicator.classList.remove('active');
            }
        });

        controls.appendChild(helpButton);
        controls.appendChild(helpText);
        controls.appendChild(processingIndicator);

        const toolbarDiv = composeBox.closest('div[role="presentation"]');
        if (toolbarDiv) {
            toolbarDiv.insertBefore(controls, toolbarDiv.firstChild);
        } else {
            composeBox.parentElement.insertBefore(controls, composeBox);
        }
    }

    findTextBetweenStars(composeBox) {
        const text = composeBox.textContent;
        const startMarker = text.indexOf('*');
        const endMarker = text.indexOf('*', startMarker + 1);

        if (startMarker === -1 || endMarker === -1) {
            return { textToEnhance: null };
        }

        return {
            textToEnhance: text.substring(startMarker + 1, endMarker),
            startIndex: startMarker,
            endIndex: endMarker + 1
        };
    }

    async improveText(text) {
        const prompt = `Improve this text for an email. Make it clear, professional, and natural-sounding:
"${text}"

Guidelines:
- Keep it concise but complete
- Use natural, clear language
- Maintain a professional but friendly tone
- Keep appropriate length (not too long or short)
- Preserve the key information and intent
- Don't add any instructions or unknown formats that the user has to enter like "[Your Name]"
- Don't add any special formatting or markers`;

        try {
            const response = await fetch(`${this.API_URL}?key=${CONFIG.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.8,
                    }
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text
                .replace(/^(Enhanced Response:|"|\[|\]|\*\*)/gi, '')
                .replace(/\*\*$/g, '')
                .replace(/^["']|["']$/g, '')
                .trim();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    replaceText(composeBox, newText, startIndex, endIndex) {
        if (startIndex === 0 && endIndex === 0) {
            composeBox.textContent = newText;
        } else {
            const fullText = composeBox.textContent;
            const beforeText = fullText.substring(0, startIndex);
            const afterText = fullText.substring(endIndex);
            composeBox.textContent = beforeText + newText + afterText;
        }
    }
}

// Initialize
window.addEventListener('load', () => new WritingAssistant());
if (document.readyState === 'complete') new WritingAssistant();