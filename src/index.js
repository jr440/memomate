export default {
async fetch(request, env, ctx) {
  const url = new URL(request.url);
  
  // Handle API endpoints
  if (url.pathname === '/api/save-transcript') {
    return handleSaveTranscript(request, env);
  }
  
  if (url.pathname === '/api/get-transcripts') {
    return handleGetTranscripts(request, env);
  }
  
  if (url.pathname === '/api/summarize') {
    return handleSummarize(request, env);
  }
  
  // Serve the main HTML interface
  return new Response(getHTML(), {
    headers: {
      'Content-Type': 'text/html',
    },
  });
},
};

async function handleSaveTranscript(request, env) {
try {
  const { transcript, sessionId } = await request.json();
  
  // Store in Cloudflare KV (you'll need to set this up)
  const key = `transcript-${sessionId}-${Date.now()}`;
  await env.MEMOMATE_KV.put(key, JSON.stringify({
    transcript,
    timestamp: new Date().toISOString(),
    sessionId
  }));
  
  return new Response(JSON.stringify({ success: true, key }), {
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
}

async function handleGetTranscripts(request, env) {
try {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  // List all keys for this session
  const list = await env.MEMOMATE_KV.list({ prefix: `transcript-${sessionId}` });
  const transcripts = [];
  
  for (const key of list.keys) {
    const value = await env.MEMOMATE_KV.get(key.name);
    if (value) {
      transcripts.push(JSON.parse(value));
    }
  }
  
  return new Response(JSON.stringify(transcripts), {
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
}

async function handleSummarize(request, env) {
try {
  const { text } = await request.json();
  
  // You can either:
  // 1. Forward to your existing AI service at http://127.0.0.1:5000/summarize
  // 2. Use Cloudflare AI Workers (recommended for production)
  
  // For now, let's create a simple summary
  const wordCount = text.split(' ').length;
  const summary = `Summary of ${wordCount} words: ${text.substring(0, 200)}...`;
  
  return new Response(JSON.stringify({ summary }), {
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
}

function getHTML() {
return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MemoMate - Voice Memory Assistant</title>
  <style>
      * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
      }
      
      body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
      }
      
      .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }
      
      .header {
          text-align: center;
          margin-bottom: 30px;
      }
      
      .header h1 {
          color: #333;
          font-size: 2.5em;
          margin-bottom: 10px;
      }
      
      .header p {
          color: #666;
          font-size: 1.1em;
      }
      
      .controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 30px;
      }
      
      .btn {
          padding: 15px 30px;
          border: none;
          border-radius: 50px;
          font-size: 1.1em;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
      }
      
      .btn-primary {
          background: #4CAF50;
          color: white;
      }
      
      .btn-primary:hover {
          background: #45a049;
          transform: translateY(-2px);
      }
      
      .btn-danger {
          background: #f44336;
          color: white;
      }
      
      .btn-danger:hover {
          background: #da190b;
          transform: translateY(-2px);
      }
      
      .btn-secondary {
          background: #2196F3;
          color: white;
      }
      
      .btn-secondary:hover {
          background: #1976D2;
          transform: translateY(-2px);
      }
      
      .status {
          text-align: center;
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 10px;
          font-weight: 600;
      }
      
      .status.listening {
          background: #e8f5e8;
          color: #2e7d32;
          border: 2px solid #4caf50;
      }
      
      .status.stopped {
          background: #ffebee;
          color: #c62828;
          border: 2px solid #f44336;
      }
      
      .transcript-container {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
      }
      
      .transcript-text {
          line-height: 1.6;
          color: #333;
      }
      
      .summary-container {
          background: #e3f2fd;
          border-radius: 10px;
          padding: 20px;
          margin-top: 20px;
          border: 1px solid #2196f3;
      }
      
      .summary-title {
          color: #1976d2;
          font-weight: 600;
          margin-bottom: 10px;
      }
      
      .pulse {
          animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
      }
  </style>
</head>
<body>
  <div class="container">
      <div class="header">
          <h1>🎤 MemoMate</h1>
          <p>Your AI-powered voice memory assistant</p>
      </div>
      
      <div class="controls">
          <button id="startBtn" class="btn btn-primary">Start Listening</button>
          <button id="stopBtn" class="btn btn-danger" disabled>Stop Listening</button>
          <button id="summaryBtn" class="btn btn-secondary" disabled>Get Summary</button>
      </div>
      
      <div id="status" class="status stopped">
          Ready to start listening...
      </div>
      
      <div class="transcript-container">
          <div id="transcript" class="transcript-text">
              Your conversation will appear here...
          </div>
      </div>
      
      <div id="summaryContainer" class="summary-container" style="display: none;">
          <div class="summary-title">AI Summary:</div>
          <div id="summaryText"></div>
      </div>
  </div>

  <script>
      let recognition;
      let isListening = false;
      let fullTranscript = [];
      let sessionId = Date.now().toString();
      
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const summaryBtn = document.getElementById('summaryBtn');
      const status = document.getElementById('status');
      const transcript = document.getElementById('transcript');
      const summaryContainer = document.getElementById('summaryContainer');
      const summaryText = document.getElementById('summaryText');
      
      // Check if browser supports speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognition = new SpeechRecognition();
          
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          recognition.onstart = function() {
              isListening = true;
              startBtn.disabled = true;
              stopBtn.disabled = false;
              status.className = 'status listening pulse';
              status.textContent = '🎤 Listening... Speak now!';
          };
          
          recognition.onresult = function(event) {
              let interimTranscript = '';
              let finalTranscript = '';
              
              for (let i = event.resultIndex; i < event.results.length; i++) {
                  const transcriptPart = event.results[i][0].transcript;
                  if (event.results[i].isFinal) {
                      finalTranscript += transcriptPart;
                  } else {
                      interimTranscript += transcriptPart;
                  }
              }
              
              if (finalTranscript) {
                  fullTranscript.push(finalTranscript);
                  saveTranscript(finalTranscript);
              }
              
              // Update display
              const allText = fullTranscript.join(' ') + (interimTranscript ? ' ' + interimTranscript : '');
              transcript.textContent = allText || 'Your conversation will appear here...';
              
              // Auto-scroll to bottom
              transcript.parentElement.scrollTop = transcript.parentElement.scrollHeight;
          };
          
          recognition.onerror = function(event) {
              console.error('Speech recognition error:', event.error);
              status.textContent = 'Error: ' + event.error;
          };
          
          recognition.onend = function() {
              if (isListening) {
                  // Restart recognition if we're still supposed to be listening
                  recognition.start();
              }
          };
          
      } else {
          alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      }
      
      startBtn.addEventListener('click', function() {
          if (recognition) {
              recognition.start();
              summaryBtn.disabled = false;
          }
      });
      
      stopBtn.addEventListener('click', function() {
          isListening = false;
          if (recognition) {
              recognition.stop();
          }
          startBtn.disabled = false;
          stopBtn.disabled = true;
          status.className = 'status stopped';
          status.textContent = 'Stopped listening. Click "Start Listening" to resume.';
      });
      
      summaryBtn.addEventListener('click', async function() {
          if (fullTranscript.length === 0) {
              alert('No transcript to summarize yet!');
              return;
          }
          
          const fullText = fullTranscript.join(' ');
          
          try {
              const response = await fetch('/api/summarize', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ text: fullText })
              });
              
              const data = await response.json();
              summaryText.textContent = data.summary;
              summaryContainer.style.display = 'block';
          } catch (error) {
              console.error('Error getting summary:', error);
              alert('Error getting summary. Please try again.');
          }
      });
      
      async function saveTranscript(text) {
          try {
              await fetch('/api/save-transcript', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      transcript: text,
                      sessionId: sessionId
                  })
              });
          } catch (error) {
              console.error('Error saving transcript:', error);
          }
      }
  </script>
</body>
</html>
`;
}
