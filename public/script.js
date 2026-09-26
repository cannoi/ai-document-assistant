document.getElementById('providerSelect').addEventListener('change', (e) => {
  const val = e.target.value;
  const endpointGroup = document.getElementById('endpointGroup');
  const modelInput = document.getElementById('modelInput');
  if (val === 'ollama') {
    endpointGroup.style.display = 'block';
    document.getElementById('customEndpoint').value = 'http://localhost:11434';
    modelInput.value = 'llama3';
  } else if (val === 'custom') {
    endpointGroup.style.display = 'block';
    document.getElementById('customEndpoint').value = '';
    modelInput.value = '';
  } else {
    endpointGroup.style.display = 'none';
    if (val === 'deepseek') modelInput.value = 'deepseek-chat';
    if (val === 'openai') modelInput.value = 'gpt-4o';
    if (val === 'anthropic') modelInput.value = 'claude-3-5-sonnet-20241022';
  }
});

document.getElementById('uploadButton').addEventListener('click', async () => {
  const fileInput = document.getElementById('documentUpload');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file to upload.');
    return;
  }

  const formData = new FormData();
  formData.append('document', file);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    currentDocumentId = result.id;
    alert(`Document uploaded successfully with ID: ${result.id}`);
  } catch (error) {
    console.error('Error uploading document:', error);
    alert('Error uploading document.');
  }
});

let currentDocumentId = null;

function getSettings() {
  return {
    provider: document.getElementById('providerSelect').value,
    endpoint: document.getElementById('customEndpoint').value,
    apiKey: document.getElementById('apiKeyInput').value,
    model: document.getElementById('modelInput').value
  };
}

document.getElementById('summarizeButton').addEventListener('click', async () => {
  if (!currentDocumentId) {
    alert('Please upload a document first.');
    return;
  }

  const settings = getSettings();
  document.getElementById('result').innerText = 'Đang xử lý...';

  try {
    const response = await fetch('/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentId: currentDocumentId, settings })
    });
    const result = await response.json();
    document.getElementById('result').innerText = result.summary || JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Error summarizing document:', error);
    alert('Error summarizing document.');
  }
});

document.getElementById('answerButton').addEventListener('click', async () => {
  if (!currentDocumentId) {
    alert('Please upload a document first.');
    return;
  }

  const question = prompt('Enter your question:');
  if (!question) return;

  const settings = getSettings();
  document.getElementById('result').innerText = 'Đang trả lời...';

  try {
    const response = await fetch('/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentId: currentDocumentId, question, settings })
    });
    const result = await response.json();
    document.getElementById('result').innerText = result.answer || JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Error answering question:', error);
    alert('Error answering question.');
  }
});

document.getElementById('searchButton').addEventListener('click', async () => {
  if (!currentDocumentId) {
    alert('Please upload a document first.');
    return;
  }

  const query = prompt('Enter your search query:');
  if (!query) return;

  const settings = getSettings();
  document.getElementById('result').innerText = 'Đang tìm kiếm...';

  try {
    const response = await fetch('/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentId: currentDocumentId, query, settings })
    });
    const result = await response.json();
    document.getElementById('result').innerText = Array.isArray(result.results) ? result.results.join('\n') : JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Error searching information:', error);
    alert('Error searching information.');
  }
});