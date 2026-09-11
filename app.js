const $ = (selector) => document.querySelector(selector);
const chat = $('#chat');
const promptBox = $('#prompt');
const composer = $('#composer');
const dialog = $('#settingsDialog');
const input = $('#imageInput');
const preview = $('#attachmentPreview');
const welcome = $('#welcomeState');
const DEFAULT_BACKEND = 'https://nazifa-android.vercel.app';
let history = JSON.parse(localStorage.getItem('nazifaHistory') || '[]');
let pendingImage = null;

function setWelcomeVisible(visible) {
  if (welcome) welcome.hidden = !visible;
}

function addMessage(role, text, save = true, imageUrl = '') {
  if (save) setWelcomeVisible(false);
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.className = 'message-image';
    bubble.append(image);
  }
  if (text) {
    const content = document.createElement('div');
    content.textContent = text;
    bubble.append(content);
  }
  wrapper.append(bubble);
  chat.append(wrapper);
  chat.scrollTop = chat.scrollHeight;
  if (save) {
    history.push({ role, content: text });
    localStorage.setItem('nazifaHistory', JSON.stringify(history.slice(-30)));
  }
  return wrapper;
}

history.forEach((message) => addMessage(message.role, message.content, false));
setWelcomeVisible(history.length === 0);

function clearAttachment() {
  pendingImage = null;
  input.value = '';
  preview.hidden = true;
  $('#previewImage').src = '';
}

$('#attachBtn').onclick = () => input.click();
$('#removeImage').onclick = clearAttachment;
input.onchange = () => {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return addMessage('assistant', 'Please choose an image file.');
  if (file.size > 8 * 1024 * 1024) {
    clearAttachment();
    return addMessage('assistant', 'Please choose an image smaller than 8 MB.');
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = { name: file.name, type: file.type, data: reader.result.split(',')[1] };
    $('#previewImage').src = reader.result;
    $('#previewName').textContent = file.name;
    preview.hidden = false;
  };
  reader.readAsDataURL(file);
};

async function askAI(message, image) {
  const base = (localStorage.getItem('nazifaBackend') || DEFAULT_BACKEND).replace(/\/$/, '');
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message || 'Please analyze this image.', image, sessionId: localStorage.getItem('nazifaSessionId') })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Connection failed');
  if (data.sessionId) localStorage.setItem('nazifaSessionId', data.sessionId);
  return data.message;
}

composer.onsubmit = async (event) => {
  event.preventDefault();
  const text = promptBox.value.trim();
  const image = pendingImage;
  if (!text && !image) return;
  const displayImage = image ? $('#previewImage').src : '';
  promptBox.value = '';
  clearAttachment();
  addMessage('user', text || 'Analyze this image', true, displayImage);
  const thinking = addMessage('assistant', 'Thinking…', false);
  try {
    const answer = await askAI(text, image);
    thinking.remove();
    addMessage('assistant', answer);
  } catch (error) {
    thinking.remove();
    addMessage('assistant', error.message);
  }
};

document.querySelectorAll('.suggestions button').forEach((button) => {
  button.onclick = () => {
    if (button.textContent.includes('image')) input.click();
    else promptBox.value = button.textContent;
  };
});

$('#settingsBtn').onclick = () => {
  $('#backendUrl').value = localStorage.getItem('nazifaBackend') || DEFAULT_BACKEND;
  dialog.showModal();
};
$('#saveBtn').onclick = () => {
  localStorage.setItem('nazifaBackend', $('#backendUrl').value.trim() || DEFAULT_BACKEND);
  dialog.close();
};
$('#clearBtn').onclick = () => {
  localStorage.clear();
  location.reload();
};
