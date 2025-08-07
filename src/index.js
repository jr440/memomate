// MemoMate - ADHD Memory Support Tool
// Cloudflare Worker with KV Storage

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname.startsWith('/api/')) {
        return await handleAPI(request, env, url);
      }
      
      // Serve HTML interface
      return new Response(getHTML(), {
        headers: { 
          'content-type': 'text/html',
          ...corsHeaders 
        },
      });
      
    } catch (error) {
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: corsHeaders 
      });
    }
  },
};

// API Handler
async function handleAPI(request, env, url) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (url.pathname === '/api/memories') {
    if (request.method === 'GET') {
      // Get all memories
      const memories = await env.MEMOMATE_KV.get('memories');
      return new Response(memories || '[]', { headers: corsHeaders });
    }
    
    if (request.method === 'POST') {
      // Add new memory
      const body = await request.json();
      const memories = JSON.parse(await env.MEMOMATE_KV.get('memories') || '[]');
      
      const newMemory = {
        id: Date.now().toString(),
        text: body.text,
        timestamp: new Date().toISOString(),
        tags: body.tags || [],
        priority: body.priority || 'normal'
      };
      
      memories.unshift(newMemory); // Add to beginning for newest first
      await env.MEMOMATE_KV.put('memories', JSON.stringify(memories));
      
      return new Response(JSON.stringify(newMemory), { headers: corsHeaders });
    }
    
    if (request.method === 'DELETE') {
      // Delete memory by ID
      const memoryId = url.searchParams.get('id');
      if (!memoryId) {
        return new Response('Memory ID required', { status: 400, headers: corsHeaders });
      }
      
      const memories = JSON.parse(await env.MEMOMATE_KV.get('memories') || '[]');
      const filteredMemories = memories.filter(m => m.id !== memoryId);
      await env.MEMOMATE_KV.put('memories', JSON.stringify(filteredMemories));
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }
  }
  
  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

// HTML Interface
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MemoMate - ADHD Memory Support</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 40px;
            font-style: italic;
            font-size: 1.1em;
        }
        .input-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            border: 2px solid #e9ecef;
        }
        .input-row {
            display: flex;
            gap: 15px;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        textarea { 
            flex: 1;
            padding: 15px; 
            border: 2px solid #ddd; 
            border-radius: 8px; 
            font-size: 16px;
            min-height: 120px;
            resize: vertical;
            font-family: inherit;
        }
        textarea:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .priority-select {
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            background: white;
            min-width: 120px;
        }
        .priority-select:focus {
            border-color: #667eea;
            outline: none;
        }
        .btn-primary { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px;
            font-weight: bold;
            transition: transform 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-primary:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .btn-danger {
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .memory-item { 
            background: white; 
            border: 1px solid #eee; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
            transition: all 0.2s;
            position: relative;
        }
        .memory-item:hover {
            transform: translateX(5px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        .memory-item.priority-high {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        .memory-item.priority-medium {
            border-left-color: #ffc107;
            background: #fffdf0;
        }
        .memory-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .memory-text { 
            font-size: 16px; 
            line-height: 1.6; 
            margin-bottom: 10px; 
            white-space: pre-wrap;
        }
        .memory-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #666;
        }
        .memory-time { 
            color: #888; 
            font-size: 14px; 
        }
        .priority-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .priority-high { background: #dc3545; color: white; }
        .priority-medium { background: #ffc107; color: #000; }
        .priority-normal { background: #6c757d; color: white; }
        .status { 
            padding: 12px; 
            border-radius: 8px; 
            margin: 15px 0; 
            text-align: center;
            font-weight: bold;
            display: none;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .loading { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .memories-section h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .memory-count {
            font-size: 0.8em;
            color: #666;
            font-weight: normal;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        .search-box {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .search-box:focus {
            border-color: #667eea;
            outline: none;
        }
        @media (max-width: 768px) {
            .input-row {
                flex-direction: column;
            }
            .priority-select {
                min-width: auto;
            }
            .container {
                padding: 20px;
                margin: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 MemoMate</h1>
        <p class="subtitle">Your ADHD Memory Support Companion</p>
        
        <div class="input-section">
            <div class="input-row">
                <textarea id="memoryInput" placeholder="What do you want to remember? Write down your thoughts, tasks, or important information..."></textarea>
                <select id="prioritySelect" class="priority-select">
                    <option value="normal">📝 Normal</option>
                    <option value="medium">⚠️ Medium</option>
                    <option value="high">🚨 High</option>
                </select>
            </div>
            <button class="btn-primary" onclick="addMemory()">
                💾 Save Memory
            </button>
        </div>
        
        <div id="status" class="status"></div>
        
        <div class="memories-section">
            <h2>
                📚 Your Memories 
                <span class="memory-count" id="memoryCount">0 memories</span>
            </h2>
            <input type="text" id="searchBox" class="search-box" placeholder="🔍 Search your memories..." oninput="filterMemories()">
            <div id="memories"></div>
        </div>
    </div>

    <script>
        let allMemories = [];
        
        // Load memories on page load
        window.onload = loadMemories;

        async function addMemory() {
            const input = document.getElementById('memoryInput');
            const prioritySelect = document.getElementById('prioritySelect');
            const text = input.value.trim();
            const priority = prioritySelect.value;
            
            if (!text) {
                showStatus('Please enter some text to remember!', 'error');
                return;
            }

            showStatus('Saving memory...', 'loading');

            try {
                const response = await fetch('/api/memories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, priority })
                });

                if (response.ok) {
                    input.value = '';
                    prioritySelect.value = 'normal';
                    showStatus('Memory saved successfully! 🎉', 'success');
                    loadMemories();
                } else {
                    throw new Error('Failed to save memory');
                }
            } catch (error) {
                showStatus('Error saving memory: ' + error.message, 'error');
            }
        }

        async function loadMemories() {
            try {
                const response = await fetch('/api/memories');
                const memories = await response.json();
                allMemories = memories;
                displayMemories(memories);
                updateMemoryCount(memories.length);
            } catch (error) {
                showStatus('Error loading memories: ' + error.message, 'error');
            }
        }

        async function deleteMemory(id) {
            if (!confirm('Are you sure you want to delete this memory?')) return;

            try {
                const response = await fetch('/api/memories?id=' + id, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showStatus('Memory deleted successfully', 'success');
                    loadMemories();
                } else {
                    throw new Error('Failed to delete memory');
                }
            } catch (error) {
                showStatus('Error deleting memory: ' + error.message, 'error');
            }
        }

        function displayMemories(memories) {
            const container = document.getElementById('memories');
            
            if (memories.length === 0) {
                container.innerHTML = '<div class="empty-state">No memories yet. Add your first memory above! 🌟</div>';
                return;
            }

            container.innerHTML = memories.map(memory => {
                const date = new Date(memory.timestamp);
                const timeAgo = getTimeAgo(date);
                
                return \`
                    <div class="memory-item priority-\${memory.priority}">
                        <div class="memory-header">
                            <span class="priority-badge priority-\${memory.priority}">\${memory.priority}</span>
                            <button class="btn-danger" onclick="deleteMemory('\${memory.id}')">🗑️</button>
                        </div>
                        <div class="memory-text">\${escapeHtml(memory.text)}</div>
                        <div class="memory-meta">
                            <span class="memory-time">💭 \${timeAgo}</span>
                            <span class="memory-time">\${date.toLocaleString()}</span>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function filterMemories() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const filtered = allMemories.filter(memory => 
                memory.text.toLowerCase().includes(searchTerm)
            );
            displayMemories(filtered);
            updateMemoryCount(filtered.length, allMemories.length);
        }

        function updateMemoryCount(showing, total = null) {
            const countElement = document.getElementById('memoryCount');
            if (total && showing !== total) {
                countElement.textContent = \`Showing \${showing} of \${total} memories\`;
            } else {
                countElement.textContent = \`\${showing} \${showing === 1 ? 'memory' : 'memories'}\`;
            }
        }

        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + type;
            status.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            }
        }

        function getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return \`\${Math.floor(diffInSeconds / 60)} minutes ago\`;
            if (diffInSeconds < 86400) return \`\${Math.floor(diffInSeconds / 3600)} hours ago\`;
            if (diffInSeconds < 604800) return \`\${Math.floor(diffInSeconds / 86400)} days ago\`;
            return \`\${Math.floor(diffInSeconds / 604800)} weeks ago\`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Allow Enter key to save (Ctrl+Enter for new line)
        document.getElementById('memoryInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                addMemory();
            }
        });
    </script>
</body>
</html>`;
}