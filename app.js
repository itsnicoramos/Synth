// ===== Configuration =====
const config = {
    // API endpoint - change this to your Vercel deployment URL
    apiUrl: '/api/chat',
    // AI provider: 'openai', 'anthropic', or 'gemini'
    aiProvider: 'openai',
    // Enable/disable real AI (false = use template fallback only)
    useRealAI: true,
    // Timeout for API calls (ms)
    apiTimeout: 30000
};

// ===== State Management =====
const state = {
    projects: JSON.parse(localStorage.getItem('synth_projects')) || [],
    currentProjectId: null,
    currentMode: 'brainstormer',
    dailyFocusEnabled: false,
    isOffline: false
};

// ===== Slash Commands =====
const slashCommands = {
    '/tasks': { action: () => switchTab('tasks'), description: 'Go to tasks' },
    '/notes': { action: () => switchTab('notes'), description: 'Go to notes' },
    '/chat': { action: () => switchTab('chat'), description: 'Go to chat' },
    '/brainstorm': { action: () => switchMode('brainstormer'), description: 'Switch to Brainstormer mode' },
    '/plan': { action: () => switchMode('planner'), description: 'Switch to Planner mode' },
    '/edit': { action: () => switchMode('editor'), description: 'Switch to Editor mode' },
    '/challenge': { action: () => switchMode('challenger'), description: 'Switch to Challenger mode' },
    '/focus': { action: () => toggleDailyFocus(), description: 'Toggle Daily Focus mode' },
    '/extract': { action: () => extractFromLastAI(), description: 'Extract tasks from last AI message' },
    '/summary': { action: () => generateMemorySummary(), description: 'Generate project memory summary' },
    '/clear': { action: () => clearChat(), description: 'Clear chat history' },
    '/export': { action: () => exportProject(), description: 'Export project' },
    '/help': { action: () => showCommandHelp(), description: 'Show all commands' }
};

// ===== AI Follow-ups =====
const followUps = {
    brainstormer: [
        "Want me to turn this into tasks?",
        "Should we explore a different angle?",
        "Ready to challenge this idea?",
        "Want to save the key points as a note?"
    ],
    planner: [
        "Should I create these as tasks?",
        "Want a concrete next step?",
        "Ready to commit to this plan?",
        "Need me to break this down further?"
    ],
    editor: [
        "Want me to refine this more?",
        "Should we save this version?",
        "Ready for a final polish?",
        "Want to challenge these edits?"
    ],
    challenger: [
        "Did that uncover anything useful?",
        "Want to brainstorm solutions?",
        "Should we document these risks?",
        "Ready to move forward despite concerns?"
    ]
}; 

// ===== DOM Elements =====
const elements = {
    // Sidebar
    newProjectBtn: document.getElementById('newProjectBtn'),
    projectsList: document.getElementById('projectsList'),

    // Main content
    emptyState: document.getElementById('emptyState'),
    emptyStateNewProject: document.getElementById('emptyStateNewProject'),
    workspace: document.getElementById('workspace'),

    // Workspace
    projectTitle: document.getElementById('projectTitle'),
    deleteProjectBtn: document.getElementById('deleteProjectBtn'),
    exportBtn: document.getElementById('exportBtn'),
    modeOptions: document.getElementById('modeOptions'),

    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    // Chat
    messages: document.getElementById('messages'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    typingIndicator: document.getElementById('typingIndicator'),

    // Notes
    notesList: document.getElementById('notesList'),
    addNoteBtn: document.getElementById('addNoteBtn'),

    // Tasks
    tasksList: document.getElementById('tasksList'),
    addTaskBtn: document.getElementById('addTaskBtn'),

    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalClose: document.getElementById('modalClose'),
    modalCancel: document.getElementById('modalCancel'),
    modalCreate: document.getElementById('modalCreate'),
    projectNameInput: document.getElementById('projectNameInput'),
    projectDescInput: document.getElementById('projectDescInput')
};

// ===== AI Response Templates =====
const aiResponses = {
    brainstormer: {
        greeting: (projectName, description) => {
            const base = `Hey! I'm excited to brainstorm on **${projectName}** with you.`;
            if (description) {
                return `${base}\n\nBased on what you've shared: "${description}"\n\nHere are some initial directions we could explore:\n\n1. **Core concept** - What's the one thing that makes this unique?\n2. **Target audience** - Who needs this most urgently?\n3. **First milestone** - What's the smallest version we could validate?\n\nWhat aspect feels most important to dig into first?`;
            }
            return `${base}\n\nI'm here to help you explore ideas freely. What's on your mind? Share any rough thoughts, and I'll help shape them into something actionable.`;
        },
        responses: [
            "That's an interesting angle! What if we pushed it further - {idea}?",
            "I like where this is going. Here are three variations to consider:\n\n1. {variation1}\n2. {variation2}\n3. {variation3}\n\nWhich resonates most?",
            "Building on that thought... What if we combined {element1} with {element2}? That could create something really distinctive.",
            "Great instinct. Let me riff on this:\n\n**The bold version:** Go all-in on {bold}\n**The safe version:** Start with {safe}\n**The wild card:** What about {wildcard}?\n\nI'm curious which direction excites you."
        ]
    },
    planner: {
        greeting: (projectName, description) => {
            const base = `Let's build a solid plan for **${projectName}**.`;
            if (description) {
                return `${base}\n\nStarting from your goal: "${description}"\n\nI'll help you break this down into clear, actionable steps. First, let's establish:\n\n- **What success looks like** - How will you know when you're done?\n- **Key milestones** - What are the major checkpoints?\n- **Immediate next action** - What can you do in the next 30 minutes?\n\nShall we start by defining the end goal more precisely?`;
            }
            return `${base}\n\nI'll help you structure your thinking into clear milestones and actionable tasks. What are you trying to accomplish?`;
        },
        responses: [
            "Good. Let me organize that into a roadmap:\n\n**Phase 1:** {phase1}\n**Phase 2:** {phase2}\n**Phase 3:** {phase3}\n\nShall I break any of these into smaller tasks?",
            "Here's a suggested priority order:\n\n1. {priority1} (Do first - unlocks everything else)\n2. {priority2} (Important but can wait)\n3. {priority3} (Nice to have)\n\nDoes this sequencing make sense?",
            "I've identified some dependencies:\n\n- {task1} needs to happen before {task2}\n- {task3} can run in parallel\n\nWant me to create tasks for these?",
            "Let me add structure to that:\n\n**Must have:** {must}\n**Should have:** {should}\n**Could have:** {could}\n\nThis helps ensure we focus on what matters most."
        ]
    },
    editor: {
        greeting: (projectName, description) => {
            const base = `Ready to refine and polish **${projectName}**.`;
            if (description) {
                return `${base}\n\nLooking at: "${description}"\n\nI'll help you:\n- Sharpen the language and clarity\n- Identify gaps or inconsistencies\n- Strengthen the overall structure\n\nPaste in what you're working on, and I'll provide specific feedback.`;
            }
            return `${base}\n\nI'm here to help you refine, clarify, and strengthen your work. Share what you've got, and I'll offer specific suggestions.`;
        },
        responses: [
            "Here's a tighter version:\n\n> {improved}\n\nKey changes: {changes}",
            "The core idea is strong. Consider:\n\n- **Opening:** {opening}\n- **Structure:** {structure}\n- **Closing:** {closing}",
            "A few suggestions:\n\n1. {suggestion1}\n2. {suggestion2}\n3. {suggestion3}\n\nThe overall direction is good - these are refinements, not rewrites.",
            "This section could be sharper:\n\n**Before:** {before}\n**After:** {after}\n\nThe rest reads well. Ready to move forward?"
        ]
    },
    challenger: {
        greeting: (projectName, description) => {
            const base = `Let's stress-test **${projectName}**.`;
            if (description) {
                return `${base}\n\nYou mentioned: "${description}"\n\nMy job is to ask the hard questions:\n\n- What's the biggest assumption you're making?\n- What would make this fail?\n- Why hasn't someone else already done this?\n\nI'll push back to help you build something stronger. Ready?`;
            }
            return `${base}\n\nI'm here to challenge your thinking and find the weak spots before they become problems. Don't worry - tough questions lead to better outcomes. What's the idea?`;
        },
        responses: [
            "Devil's advocate time: What if {challenge}?\n\nNot saying it's wrong - but how would you respond to a skeptic?",
            "Let's pressure test this:\n\n- **Best case:** {best}\n- **Worst case:** {worst}\n- **Most likely:** {likely}\n\nAre you prepared for all three?",
            "Honest question: {question}\n\nI ask because {reason}. What's your thinking?",
            "I see the potential, but consider:\n\n1. {objection1}\n2. {objection2}\n\nHow do you address these? Having clear answers will make this stronger."
        ]
    }
};

// ===== Helper Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveState() {
    localStorage.setItem('synth_projects', JSON.stringify(state.projects));
}

function getCurrentProject() {
    return state.projects.find(p => p.id === state.currentProjectId);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== Render Functions =====
function renderProjectsList() {
    const html = state.projects.map(project => `
        <li class="project-item ${project.id === state.currentProjectId ? 'active' : ''}"
            data-id="${project.id}">
            <span class="project-item-icon">📁</span>
            <span class="project-item-name">${escapeHtml(project.name)}</span>
        </li>
    `).join('');

    elements.projectsList.innerHTML = html;

    // Add click listeners
    document.querySelectorAll('.project-item').forEach(item => {
        item.addEventListener('click', () => {
            openProject(item.dataset.id);
        });
    });
}

function renderMessages() {
    const project = getCurrentProject();
    if (!project) return;

    const html = project.messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">${msg.role === 'user' ? 'U' : 'S'}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${msg.role === 'user' ? 'You' : 'Synth'}</span>
                    ${msg.mode ? `<span class="message-mode">${msg.mode}</span>` : ''}
                    ${msg.isOffline ? '<span class="message-offline">offline</span>' : ''}
                </div>
                <div class="message-text">${formatMessageText(msg.text)}</div>
                ${msg.role === 'ai' && msg.suggestions ? renderSuggestions(msg.suggestions) : ''}
            </div>
        </div>
    `).join('');

    elements.messages.innerHTML = html;
    elements.messages.scrollTop = elements.messages.scrollHeight;

    // Add click listeners to suggestion buttons
    document.querySelectorAll('.message-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleSuggestionClick(btn.dataset.action, btn.dataset.value);
        });
    });
}

function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return '';

    return `
        <div class="message-actions">
            ${suggestions.map(s => `
                <button class="message-action-btn" data-action="${s.action}" data-value="${escapeHtml(s.value)}">
                    ${escapeHtml(s.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderNotes() {
    const project = getCurrentProject();
    if (!project) return;

    if (project.notes.length === 0) {
        elements.notesList.innerHTML = `
            <div class="empty-notes">
                <h4>No notes yet</h4>
                <p>Add notes to capture important ideas and insights.</p>
            </div>
        `;
        return;
    }

    const html = project.notes.map(note => `
        <div class="note-item" data-id="${note.id}">
            <input class="note-title" value="${escapeHtml(note.title)}" placeholder="Note title..." data-field="title">
            <textarea class="note-content" placeholder="Write your note..." data-field="content">${escapeHtml(note.content)}</textarea>
            <div class="note-footer">
                <span class="note-date">${formatDate(note.updatedAt)}</span>
                <button class="note-delete-btn" data-id="${note.id}">Delete</button>
            </div>
        </div>
    `).join('');

    elements.notesList.innerHTML = html;

    // Add event listeners
    document.querySelectorAll('.note-item input, .note-item textarea').forEach(el => {
        el.addEventListener('input', (e) => {
            const noteId = e.target.closest('.note-item').dataset.id;
            const field = e.target.dataset.field;
            updateNote(noteId, field, e.target.value);
        });
    });

    document.querySelectorAll('.note-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteNote(btn.dataset.id));
    });
}

function renderTasks() {
    const project = getCurrentProject();
    if (!project) return;

    if (project.tasks.length === 0) {
        elements.tasksList.innerHTML = `
            <div class="empty-tasks">
                <h4>No tasks yet</h4>
                <p>Add tasks to track your progress.</p>
            </div>
        `;
        return;
    }

    const html = project.tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox" data-id="${task.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="task-content">
                <input class="task-text" value="${escapeHtml(task.text)}" placeholder="Task description...">
                <div class="task-meta">
                    ${task.aiSuggested ? '<span class="task-tag ai-suggested">AI suggested</span>' : ''}
                </div>
            </div>
            <button class="task-delete-btn" data-id="${task.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');

    elements.tasksList.innerHTML = html;

    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => toggleTask(checkbox.dataset.id));
    });

    document.querySelectorAll('.task-text').forEach(input => {
        input.addEventListener('input', (e) => {
            const taskId = e.target.closest('.task-item').dataset.id;
            updateTask(taskId, e.target.value);
        });
    });

    document.querySelectorAll('.task-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTask(btn.dataset.id));
    });
}

// ===== Text Formatting =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageText(text) {
    // Convert markdown-like syntax to HTML
    let html = escapeHtml(text);

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Lists (simple)
    html = html.replace(/^- (.*?)(<br>|$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.*?)(<br>|$)/gm, '<li>$1</li>');

    // Blockquotes
    html = html.replace(/^&gt; (.*?)(<br>|$)/gm, '<blockquote>$1</blockquote>');

    return `<p>${html}</p>`;
}

// ===== Project Functions =====
function createProject(name, description = '') {
    const project = {
        id: generateId(),
        name: name || 'Untitled Project',
        description,
        mode: 'brainstormer',
        messages: [],
        notes: [],
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    state.projects.unshift(project);
    saveState();

    openProject(project.id);

    // Send initial AI greeting
    setTimeout(() => {
        const greeting = aiResponses[project.mode].greeting(project.name, project.description);
        addAIMessage(greeting, generateSuggestions('greeting'));
    }, 500);
}

function openProject(projectId) {
    state.currentProjectId = projectId;
    const project = getCurrentProject();

    if (!project) return;

    // Update mode
    state.currentMode = project.mode;

    // Update UI
    elements.emptyState.style.display = 'none';
    elements.workspace.style.display = 'flex';
    elements.projectTitle.textContent = project.name;

    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === project.mode);
    });

    // Render content
    renderProjectsList();
    renderMessages();
    renderNotes();
    renderTasks();

    // Switch to chat tab
    switchTab('chat');
}

function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
        return;
    }

    state.projects = state.projects.filter(p => p.id !== projectId);
    saveState();

    if (state.currentProjectId === projectId) {
        state.currentProjectId = null;
        elements.workspace.style.display = 'none';
        elements.emptyState.style.display = 'flex';
    }

    renderProjectsList();
}

function updateProjectTitle(title) {
    const project = getCurrentProject();
    if (!project) return;

    project.name = title || 'Untitled Project';
    project.updatedAt = new Date().toISOString();
    saveState();
    renderProjectsList();
}

// ===== Message Functions =====
function addUserMessage(text) {
    const project = getCurrentProject();
    if (!project) return;

    project.messages.push({
        id: generateId(),
        role: 'user',
        text,
        timestamp: new Date().toISOString()
    });

    project.updatedAt = new Date().toISOString();
    saveState();
    renderMessages();
}

function addAIMessage(text, suggestions = [], isOffline = false) {
    const project = getCurrentProject();
    if (!project) return;

    project.messages.push({
        id: generateId(),
        role: 'ai',
        text,
        mode: state.currentMode,
        suggestions,
        isOffline,
        timestamp: new Date().toISOString()
    });

    project.updatedAt = new Date().toISOString();
    saveState();
    renderMessages();
}

function generateAIResponse(userMessage) {
    const project = getCurrentProject();
    if (!project) return '';

    // Daily Focus mode: shorter, more actionable responses in planner mode
    if (state.dailyFocusEnabled && state.currentMode === 'planner') {
        return generateDailyFocusResponse(userMessage);
    }

    const templates = aiResponses[state.currentMode].responses;
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate contextual placeholders based on user message
    const words = userMessage.split(' ').filter(w => w.length > 3);
    const topic = words.slice(0, 3).join(' ') || 'this concept';

    // Simple template filling (in a real app, this would be AI-generated)
    let response = template
        .replace('{idea}', `exploring how ${topic} could evolve`)
        .replace('{variation1}', `A minimal version focused on ${words[0] || 'core'} users`)
        .replace('{variation2}', `An expanded scope including ${words[1] || 'additional'} features`)
        .replace('{variation3}', `A pivot toward ${words[2] || 'adjacent'} markets`)
        .replace('{element1}', words[0] || 'simplicity')
        .replace('{element2}', words[1] || 'innovation')
        .replace('{bold}', 'the ambitious vision')
        .replace('{safe}', 'proven fundamentals')
        .replace('{wildcard}', 'a completely different approach')
        .replace('{phase1}', `Research and validate ${topic}`)
        .replace('{phase2}', 'Build and test core features')
        .replace('{phase3}', 'Launch and iterate')
        .replace('{priority1}', 'Define the core value proposition')
        .replace('{priority2}', 'Identify your first 10 users')
        .replace('{priority3}', 'Polish the experience')
        .replace('{task1}', 'defining scope')
        .replace('{task2}', 'building features')
        .replace('{task3}', 'user research')
        .replace('{must}', 'The essential feature set')
        .replace('{should}', 'Improvements that add value')
        .replace('{could}', 'Nice-to-haves for later')
        .replace('{improved}', userMessage.substring(0, 50) + '...')
        .replace('{changes}', 'tightened language, clearer structure')
        .replace('{opening}', 'Lead with the key insight')
        .replace('{structure}', 'Group related ideas together')
        .replace('{closing}', 'End with a clear call to action')
        .replace('{suggestion1}', 'Consider starting with your strongest point')
        .replace('{suggestion2}', 'The middle section could be more concise')
        .replace('{suggestion3}', 'Add a specific example to ground the abstract')
        .replace('{before}', 'The original phrasing')
        .replace('{after}', 'A clearer alternative')
        .replace('{challenge}', `${topic} doesn't actually solve the problem`)
        .replace('{best}', 'Everything clicks and you 10x your target')
        .replace('{worst}', 'The market shifts and you need to pivot')
        .replace('{likely}', 'Moderate success with room to grow')
        .replace('{question}', `Who else has tried ${topic} and why did they fail?`)
        .replace('{reason}', 'understanding past attempts helps us avoid their mistakes')
        .replace('{objection1}', 'The market might be smaller than expected')
        .replace('{objection2}', 'Execution complexity could be higher');

    // Add auto-followup
    const modeFollowUps = followUps[state.currentMode];
    const followUp = modeFollowUps[Math.floor(Math.random() * modeFollowUps.length)];
    response += `\n\n**Next:** ${followUp}`;

    return response;
}

// ===== Daily Focus Mode =====
function generateDailyFocusResponse(userMessage) {
    const words = userMessage.split(' ').filter(w => w.length > 3);
    const topic = words.slice(0, 2).join(' ') || 'this';

    const focusTemplates = [
        `**Focus for today:**\n\n- Define ${topic} scope\n- Identify blockers\n- Ship one thing\n\n**Do this now:** Start with the smallest piece.`,
        `**3 priorities:**\n\n- ${words[0] || 'Core'} first\n- Then ${words[1] || 'secondary'} items\n- Everything else waits\n\n**Do this now:** Block 30 min for priority #1.`,
        `**Today's target:**\n\n- Complete ${topic}\n- Document progress\n- Clear one blocker\n\n**Do this now:** Write down what "done" looks like.`
    ];

    return focusTemplates[Math.floor(Math.random() * focusTemplates.length)];
}

function toggleDailyFocus() {
    state.dailyFocusEnabled = !state.dailyFocusEnabled;
    const status = state.dailyFocusEnabled ? 'ON' : 'OFF';
    addAIMessage(`**Daily Focus mode: ${status}**\n\n${state.dailyFocusEnabled ?
        'Responses will be shorter and end with "Do this now." Perfect for execution days.' :
        'Back to normal responses. Good for exploration and planning.'}`);
}

function generateSuggestions(context) {
    const project = getCurrentProject();
    if (!project) return [];

    const suggestionSets = {
        greeting: [
            { label: 'Share my idea', action: 'prompt', value: 'Here\'s what I\'m thinking about...' },
            { label: 'Ask for help', action: 'prompt', value: 'I need help with...' }
        ],
        general: [
            { label: 'Extract tasks', action: 'extractTasks', value: '' },
            { label: 'Save as note', action: 'extractNote', value: '' },
            { label: 'Dig deeper', action: 'prompt', value: 'Can you elaborate on that?' }
        ]
    };

    return suggestionSets[context] || suggestionSets.general;
}

// ===== One-Click Extraction =====
function extractFromLastAI() {
    const project = getCurrentProject();
    if (!project || project.messages.length === 0) {
        addAIMessage("No messages to extract from yet. Start a conversation first!");
        return;
    }

    const lastAI = [...project.messages].reverse().find(m => m.role === 'ai');
    if (!lastAI) {
        addAIMessage("No AI messages found to extract from.");
        return;
    }

    extractTasksFromText(lastAI.text);
}

function extractTasksFromText(text) {
    const project = getCurrentProject();
    if (!project) return;

    // Extract bullet points, numbered items, and bold items as tasks
    const patterns = [
        /^[-•]\s*(.+)$/gm,           // Bullet points
        /^\d+\.\s*(.+)$/gm,          // Numbered lists
        /\*\*([^*]+)\*\*/g,          // Bold text
        /Do this now:\s*(.+)$/gm     // Daily focus actions
    ];

    const extractedTasks = new Set();

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const task = match[1].trim()
                .replace(/\*\*/g, '')
                .replace(/<[^>]+>/g, '');
            if (task.length > 5 && task.length < 100) {
                extractedTasks.add(task);
            }
        }
    });

    if (extractedTasks.size === 0) {
        // Fallback: create a single task from the first sentence
        const firstSentence = text.split(/[.!?]/)[0].trim();
        if (firstSentence) {
            extractedTasks.add(`Review: ${firstSentence.substring(0, 50)}...`);
        }
    }

    // Limit to 5 tasks max
    const tasksArray = Array.from(extractedTasks).slice(0, 5);

    tasksArray.forEach(taskText => {
        addTask(taskText, true);
    });

    switchTab('tasks');
    addAIMessage(`Extracted **${tasksArray.length} tasks** from our conversation. Check them out in the Tasks tab!`);
}

function extractNoteFromLastAI() {
    const project = getCurrentProject();
    if (!project || project.messages.length === 0) return;

    const lastAI = [...project.messages].reverse().find(m => m.role === 'ai');
    if (!lastAI) return;

    // Create note from AI message
    const note = {
        id: generateId(),
        title: `Insight from ${new Date().toLocaleDateString()}`,
        content: lastAI.text.replace(/\*\*/g, '').replace(/\n\n/g, '\n'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    project.notes.unshift(note);
    project.updatedAt = new Date().toISOString();
    saveState();
    renderNotes();
    switchTab('notes');
    addAIMessage("Saved that insight as a note! You can find it in the Notes tab.");
}

// ===== Memory Summary =====
function generateMemorySummary() {
    const project = getCurrentProject();
    if (!project) return;

    const messageCount = project.messages.length;
    const userMessages = project.messages.filter(m => m.role === 'user');
    const taskCount = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.completed).length;
    const noteCount = project.notes.length;

    // Extract key topics from user messages
    const allUserText = userMessages.map(m => m.text).join(' ');
    const words = allUserText.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4)
        .filter(w => !['about', 'would', 'could', 'should', 'think', 'want', 'need', 'have', 'this', 'that', 'with', 'from', 'what', 'when', 'where', 'which'].includes(w));

    const wordFreq = {};
    words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);
    const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

    // Get modes used
    const modesUsed = [...new Set(project.messages.filter(m => m.mode).map(m => m.mode))];

    // Build summary
    let summary = `**Project Memory: ${project.name}**\n\n`;
    summary += `**Started:** ${new Date(project.createdAt).toLocaleDateString()}\n`;
    summary += `**Conversations:** ${messageCount} messages\n`;
    summary += `**Tasks:** ${completedTasks}/${taskCount} completed\n`;
    summary += `**Notes:** ${noteCount}\n\n`;

    if (topWords.length > 0) {
        summary += `**Key themes:** ${topWords.join(', ')}\n\n`;
    }

    if (modesUsed.length > 0) {
        summary += `**Modes used:** ${modesUsed.join(', ')}\n\n`;
    }

    if (project.description) {
        summary += `**Original goal:** "${project.description}"\n\n`;
    }

    summary += `**What I remember:** We've been working on ${topWords[0] || 'your project'} together. ${taskCount > 0 ? `You have ${taskCount - completedTasks} tasks remaining.` : 'No tasks created yet.'} ${noteCount > 0 ? `${noteCount} notes captured.` : ''}`;

    // Store summary in project
    project.memorySummary = summary;
    project.updatedAt = new Date().toISOString();
    saveState();

    addAIMessage(summary);
}

// ===== Slash Command Functions =====
function processSlashCommand(input) {
    const trimmed = input.trim().toLowerCase();

    for (const [cmd, config] of Object.entries(slashCommands)) {
        if (trimmed === cmd || trimmed.startsWith(cmd + ' ')) {
            config.action();
            return true;
        }
    }

    // Partial match suggestions
    if (trimmed.startsWith('/')) {
        const matches = Object.keys(slashCommands).filter(cmd => cmd.startsWith(trimmed));
        if (matches.length > 0 && matches.length <= 3) {
            addAIMessage(`Did you mean: ${matches.join(', ')}?\n\nType **/help** to see all commands.`);
            return true;
        }
    }

    return false;
}

function showCommandHelp() {
    let helpText = "**Available Commands:**\n\n";

    for (const [cmd, config] of Object.entries(slashCommands)) {
        helpText += `**${cmd}** - ${config.description}\n`;
    }

    helpText += "\n*Type any command to use it. Example: /focus*";

    addAIMessage(helpText);
}

function clearChat() {
    const project = getCurrentProject();
    if (!project) return;

    if (confirm('Clear all chat messages? Notes and tasks will be kept.')) {
        project.messages = [];
        project.updatedAt = new Date().toISOString();
        saveState();
        renderMessages();
        addAIMessage(`Chat cleared. Fresh start! Your ${project.notes.length} notes and ${project.tasks.length} tasks are still here.`);
    }
}

function handleSuggestionClick(action, value) {
    switch (action) {
        case 'prompt':
            elements.chatInput.value = value;
            elements.chatInput.focus();
            updateSendButton();
            break;
        case 'addNote':
            addNote();
            switchTab('notes');
            break;
        case 'addTask':
            addTask();
            switchTab('tasks');
            break;
        case 'extractTasks':
            extractFromLastAI();
            break;
        case 'extractNote':
            extractNoteFromLastAI();
            break;
    }
}

// ===== Note Functions =====
function addNote() {
    const project = getCurrentProject();
    if (!project) return;

    const note = {
        id: generateId(),
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    project.notes.unshift(note);
    project.updatedAt = new Date().toISOString();
    saveState();
    renderNotes();

    // Focus the new note title
    const firstNote = elements.notesList.querySelector('.note-title');
    if (firstNote) firstNote.focus();
}

function updateNote(noteId, field, value) {
    const project = getCurrentProject();
    if (!project) return;

    const note = project.notes.find(n => n.id === noteId);
    if (!note) return;

    note[field] = value;
    note.updatedAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    saveState();
}

function deleteNote(noteId) {
    const project = getCurrentProject();
    if (!project) return;

    project.notes = project.notes.filter(n => n.id !== noteId);
    project.updatedAt = new Date().toISOString();
    saveState();
    renderNotes();
}

// ===== Task Functions =====
function addTask(text = '', aiSuggested = false) {
    const project = getCurrentProject();
    if (!project) return;

    const task = {
        id: generateId(),
        text,
        completed: false,
        aiSuggested,
        createdAt: new Date().toISOString()
    };

    project.tasks.unshift(task);
    project.updatedAt = new Date().toISOString();
    saveState();
    renderTasks();

    // Focus the new task input
    const firstTask = elements.tasksList.querySelector('.task-text');
    if (firstTask) firstTask.focus();
}

function updateTask(taskId, text) {
    const project = getCurrentProject();
    if (!project) return;

    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.text = text;
    project.updatedAt = new Date().toISOString();
    saveState();
}

function toggleTask(taskId) {
    const project = getCurrentProject();
    if (!project) return;

    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    project.updatedAt = new Date().toISOString();
    saveState();
    renderTasks();
}

function deleteTask(taskId) {
    const project = getCurrentProject();
    if (!project) return;

    project.tasks = project.tasks.filter(t => t.id !== taskId);
    project.updatedAt = new Date().toISOString();
    saveState();
    renderTasks();
}

// ===== UI Functions =====
function switchTab(tabName) {
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    elements.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });
}

function switchMode(mode) {
    state.currentMode = mode;

    const project = getCurrentProject();
    if (project) {
        project.mode = mode;
        project.updatedAt = new Date().toISOString();
        saveState();
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Notify user of mode change
    addAIMessage(`Switched to **${mode.charAt(0).toUpperCase() + mode.slice(1)}** mode. ${getModeDescription(mode)}`);
}

function getModeDescription(mode) {
    const descriptions = {
        brainstormer: "Let's explore ideas freely and build on each other's thoughts.",
        planner: "I'll help you structure your thinking into actionable steps.",
        editor: "I'll help you refine and polish your work with specific feedback.",
        challenger: "I'll ask tough questions to strengthen your thinking."
    };
    return descriptions[mode] || '';
}

function showModal() {
    elements.modalOverlay.style.display = 'flex';
    elements.projectNameInput.value = '';
    elements.projectDescInput.value = '';
    setTimeout(() => elements.projectNameInput.focus(), 100);
}

function hideModal() {
    elements.modalOverlay.style.display = 'none';
}

function updateSendButton() {
    elements.sendBtn.disabled = !elements.chatInput.value.trim();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

async function sendMessage() {
    const text = elements.chatInput.value.trim();
    if (!text) return;

    // Check for slash commands first
    if (text.startsWith('/')) {
        elements.chatInput.value = '';
        updateSendButton();
        autoResizeTextarea(elements.chatInput);

        if (processSlashCommand(text)) {
            return;
        }
        // If command not recognized, show help
        addAIMessage(`Unknown command: **${text}**\n\nType **/help** to see available commands.`);
        return;
    }

    // Add user message
    addUserMessage(text);
    elements.chatInput.value = '';
    updateSendButton();
    autoResizeTextarea(elements.chatInput);

    // Show typing indicator
    elements.typingIndicator.style.display = 'flex';
    elements.messages.scrollTop = elements.messages.scrollHeight;

    // Try real AI first, fallback to templates
    let response;
    let usedFallback = false;

    if (config.useRealAI && !state.isOffline) {
        try {
            response = await fetchAIResponse(text);
        } catch (error) {
            console.warn('AI API unavailable, using fallback:', error.message);
            usedFallback = true;
            state.isOffline = true;
            updateOfflineIndicator();
        }
    }

    // Fallback to template response
    if (!response) {
        usedFallback = true;
        // Small delay to simulate thinking for fallback
        const thinkTime = state.dailyFocusEnabled ? 500 + Math.random() * 500 : 1000 + Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, thinkTime));
        response = generateAIResponse(text);
    }

    // Hide typing indicator
    elements.typingIndicator.style.display = 'none';

    // Add AI response with offline badge if using fallback
    addAIMessage(response, generateSuggestions('general'), usedFallback);

    // Occasionally suggest a task based on conversation
    if (Math.random() > 0.7) {
        setTimeout(() => {
            const project = getCurrentProject();
            if (project && state.currentMode === 'planner') {
                addTask('Follow up on: ' + text.substring(0, 30) + '...', true);
            }
        }, 500);
    }
}

// ===== AI API Integration =====
async function fetchAIResponse(userMessage) {
    const project = getCurrentProject();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.apiTimeout);

    try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                mode: state.currentMode,
                provider: config.aiProvider,
                projectContext: project ? {
                    name: project.name,
                    description: project.description,
                    memorySummary: project.memorySummary
                } : null
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json();
            if (error.fallback) {
                throw new Error('Fallback requested');
            }
            throw new Error(error.error || 'API request failed');
        }

        const data = await response.json();

        // If we were offline and now connected, update state
        if (state.isOffline) {
            state.isOffline = false;
            updateOfflineIndicator();
        }

        return data.response;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

function updateOfflineIndicator() {
    const existingBadge = document.querySelector('.offline-badge');

    if (state.isOffline && !existingBadge) {
        // Add offline badge to header
        const badge = document.createElement('span');
        badge.className = 'offline-badge';
        badge.innerHTML = '&#x26A0; Offline Mode';
        badge.title = 'Using template responses. Click to retry connection.';
        badge.onclick = retryConnection;

        const header = document.querySelector('.workspace-header .project-info');
        if (header) {
            header.appendChild(badge);
        }
    } else if (!state.isOffline && existingBadge) {
        existingBadge.remove();
    }
}

async function retryConnection() {
    state.isOffline = false;
    updateOfflineIndicator();

    // Test connection with a simple message
    try {
        await fetchAIResponse('test');
        addAIMessage("**Connection restored!** Back to full AI mode.");
    } catch {
        state.isOffline = true;
        updateOfflineIndicator();
        addAIMessage("Still offline. Using smart templates for now. I'll keep trying!");
    }
}

function exportProject() {
    const project = getCurrentProject();
    if (!project) return;

    const exportData = {
        name: project.name,
        description: project.description,
        exportedAt: new Date().toISOString(),
        messages: project.messages.map(m => ({
            role: m.role,
            text: m.text,
            mode: m.mode,
            timestamp: m.timestamp
        })),
        notes: project.notes,
        tasks: project.tasks
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Event Listeners =====
function initEventListeners() {
    // New project buttons
    elements.newProjectBtn.addEventListener('click', showModal);
    elements.emptyStateNewProject.addEventListener('click', showModal);

    // Modal
    elements.modalClose.addEventListener('click', hideModal);
    elements.modalCancel.addEventListener('click', hideModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) hideModal();
    });
    elements.modalCreate.addEventListener('click', () => {
        const name = elements.projectNameInput.value.trim();
        const description = elements.projectDescInput.value.trim();
        createProject(name, description);
        hideModal();
    });
    elements.projectNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.modalCreate.click();
        }
    });

    // Project title
    elements.projectTitle.addEventListener('blur', () => {
        updateProjectTitle(elements.projectTitle.textContent);
    });
    elements.projectTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.projectTitle.blur();
        }
    });

    // Delete project
    elements.deleteProjectBtn.addEventListener('click', () => {
        deleteProject(state.currentProjectId);
    });

    // Export
    elements.exportBtn.addEventListener('click', exportProject);

    // Mode selector
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchMode(btn.dataset.mode);
        });
    });

    // Tabs
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Chat input
    elements.chatInput.addEventListener('input', () => {
        updateSendButton();
        autoResizeTextarea(elements.chatInput);
    });
    elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    elements.sendBtn.addEventListener('click', sendMessage);

    // Notes
    elements.addNoteBtn.addEventListener('click', addNote);

    // Tasks
    elements.addTaskBtn.addEventListener('click', () => addTask());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + N for new project
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            showModal();
        }
        // Escape to close modal
        if (e.key === 'Escape') {
            hideModal();
        }
    });
}

// ===== Initialize =====
function init() {
    initEventListeners();
    renderProjectsList();

    // Show empty state or last project
    if (state.projects.length > 0) {
        openProject(state.projects[0].id);
    } else {
        elements.emptyState.style.display = 'flex';
        elements.workspace.style.display = 'none';
    }
}

// Start the app
init();
