document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById('chatMessages');
    const clearHistoryModal = document.getElementById('clearHistoryModal');
    const confirmClearBtn = document.getElementById('confirmClearBtn');
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    const chatForm = document.getElementById('chatForm');
    const questionInput = document.getElementById('questionInput');
    const clearBtn = document.getElementById('clearBtn');
    const sendBtn = document.getElementById('sendBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    const MAX_LOCAL_MESSAGES = 25;

    // Configure marked options
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    // Theme logic
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('numl_theme', newTheme);
    };

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const savedTheme = localStorage.getItem('numl_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);


    function generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    function loadChatHistory() {
        let messages = [];
        try {
            const saved = localStorage.getItem('numl_chat_history');
            if (saved) {
                messages = JSON.parse(saved);
                if (!Array.isArray(messages)) messages = [];
            }
        } catch (e) {
            console.warn("Error parsing chat history, resetting:", e);
            messages = [];
        }

        if (messages.length === 0) {
            clearChatHistory(false);
            return;
        }

        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            appendMessageToDOM(msg);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function saveChatHistory(role, content, sources = []) {
        let messages = [];
        try {
            const saved = localStorage.getItem('numl_chat_history');
            if (saved) messages = JSON.parse(saved);
            if (!Array.isArray(messages)) messages = [];
        } catch (e) {
            messages = [];
        }

        const newMessage = {
            id: generateId(),
            role: role,
            content: content,
            sources: sources,
            timestamp: Date.now()
        };

        messages.push(newMessage);
        
        if (messages.length > MAX_LOCAL_MESSAGES) {
            messages = messages.slice(-MAX_LOCAL_MESSAGES);
        }

        trySave(messages);
    }

    function trySave(messages) {
        try {
            localStorage.setItem('numl_chat_history', JSON.stringify(messages));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'DOMException') {
                console.warn("Storage quota exceeded, pruning history heavily and retrying...");
                messages = messages.slice(-10);
                try {
                    localStorage.setItem('numl_chat_history', JSON.stringify(messages));
                } catch (retryErr) {
                    console.error("Failed to save after pruning:", retryErr);
                }
            } else {
                console.error("Error saving chat history:", e);
            }
        }
    }

    function clearChatHistory(removeFromStorage = true) {
        if (removeFromStorage) {
            try {
                localStorage.removeItem('numl_chat_history');
            } catch(e) {
                console.error("Error clearing local storage:", e);
            }
        }
        chatMessages.innerHTML = `
            <div class="message assistant-message slide-in">
                <div class="message-content markdown-body">
                    <p>Hello! I am your NUML Policy Assistant. How can I help you regarding university regulations and policies today?</p>
                </div>
            </div>
            <div class="suggestions slide-in" style="animation-delay: 0.1s;">
                <button class="suggestion-chip" onclick="document.getElementById('questionInput').value=this.innerText; document.getElementById('chatForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))">Can I repeat a course to improve a C or D grade?</button>
                <button class="suggestion-chip" onclick="document.getElementById('questionInput').value=this.innerText; document.getElementById('chatForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))">How is CGPA calculated on NUML's absolute grading scale?</button>
                <button class="suggestion-chip" onclick="document.getElementById('questionInput').value=this.innerText; document.getElementById('chatForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))">What happens if a student fails more than 50% of registered courses?</button>
            </div>`;
    }

    function appendMessageToDOM(msg) {
        // Remove suggestions when chatting
        const suggestions = document.querySelector('.suggestions');
        if (suggestions) suggestions.remove();

        if (msg.role === 'user') {
            const userMsgHTML = `
                <div class="message user-message slide-in" id="${msg.id}">
                    <div class="message-content">
                        <p style="white-space: pre-wrap;">${escapeHTML(msg.content)}</p>
                    </div>
                </div>`;
            chatMessages.innerHTML += userMsgHTML;
        } else {
            const parsedHTML = DOMPurify.sanitize(marked.parse(msg.content));
            let sourcesHTML = '';
            
            if (msg.sources && msg.sources.length > 0) {
                const sourceItems = msg.sources.map(src => {
                    const rawDoc = src.document || src.doc || '';
                    const filename = rawDoc.split('/').pop().split('\\').pop() || 'Document';
                    return `<li>
                                <span class="source-doc">${escapeHTML(filename)}</span>
                                <span class="source-page">Pg. ${src.page ?? 'N/A'}</span>
                            </li>`;
                }).join('');

                sourcesHTML = `
                    <div class="sources-section">
                        <h4>Reference Sources</h4>
                        <ul>${sourceItems}</ul>
                    </div>`;
            }

            const assistantMsgHTML = `
                <div class="message assistant-message slide-in" id="${msg.id}">
                    <div class="message-content markdown-body">
                        ${parsedHTML}
                        ${sourcesHTML}
                    </div>
                </div>`;
            chatMessages.innerHTML += assistantMsgHTML;
        }
    }

    loadChatHistory();

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            document.documentElement.style.setProperty('--app-height', `${window.visualViewport.height}px`);
        });
        document.documentElement.style.setProperty('--app-height', `${window.visualViewport.height}px`);
    }

    clearBtn.addEventListener('click', () => {
        clearHistoryModal.style.display = 'flex';
    });

    cancelClearBtn.addEventListener('click', () => {
        clearHistoryModal.style.display = 'none';
    });

    confirmClearBtn.addEventListener('click', () => {
        clearHistoryModal.style.display = 'none';
        clearChatHistory();
    });

    // Auto-resize textarea
    if (questionInput) {
        questionInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') {
                this.style.height = 'auto'; // Reset
            }
        });

        // Submit query when Enter is pressed (but Shift+Enter for new line)
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        });
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = questionInput.value.trim();
        if (!question) return;

        sendBtn.disabled = true;

        const tempUserMsg = { id: generateId(), role: 'user', content: question, sources: [] };
        appendMessageToDOM(tempUserMsg);
        saveChatHistory('user', question, []);
        
        const loadingHTML = `
            <div class="message assistant-message slide-in" id="loadingMsg">
                <div class="message-content loading-content">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>`;

        chatMessages.innerHTML += loadingHTML;
        questionInput.value = '';
        questionInput.style.height = 'auto';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        let historyPayload = [];
        try {
            const saved = localStorage.getItem('numl_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                historyPayload = parsed.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
            }
        } catch (e) {
            console.warn("Could not parse history for API payload", e);
        }

        try {
            const res = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question, history: historyPayload })
            });

            const data = await res.json();

            const loadingMsg = document.getElementById('loadingMsg');
            if (loadingMsg) loadingMsg.remove();

            let rawMarkdown = data.answer || "No response generated.";
            
            // Fix literal escaped newlines from LLM JSON payloads
            if (typeof rawMarkdown === 'string') {
                rawMarkdown = rawMarkdown.replace(/\\n/g, '\n');
                
                // Fix inline table rows joined by "| |" (horizontal only)
                rawMarkdown = rawMarkdown.replace(/\|[ \t]+\|/g, '|\n|');
                
                // Fix missing newlines before markdown lists if they are stuck on the same line
                // Only matches horizontal space to prevent breaking existing newlines
                rawMarkdown = rawMarkdown.replace(/([^\n\.])[ \t]+(\d+\.\s+|- \s*)/g, '$1\n\n$2');
            }
            const sources = data.sources || [];
            
            const tempAssistantMsg = { 
                id: generateId(), 
                role: 'assistant', 
                content: rawMarkdown, 
                sources: sources 
            };
            
            appendMessageToDOM(tempAssistantMsg);
            saveChatHistory('assistant', rawMarkdown, sources);

        } catch (err) {
            const loadingMsg = document.getElementById('loadingMsg');
            if (loadingMsg) loadingMsg.remove();

            chatMessages.innerHTML += `
                <div class="message assistant-message slide-in">
                    <div class="message-content error-content">
                        <p>Unable to connect. Please check your connection and try again.</p>
                    </div>
                </div>`;
            showToast("Network error. Please try again.");
        } finally {
            sendBtn.disabled = false;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            questionInput.focus();
        }
    });

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast slide-in';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
