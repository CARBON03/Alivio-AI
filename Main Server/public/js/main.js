document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const chatBox = document.getElementById('chat-box');
    const symptomsInput = document.getElementById('symptoms-input');
    let recognition;
  
    function displayMessage(message, isUser = false) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
      messageDiv.textContent = message;
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  
    function sendSymptoms() {
      const symptoms = symptomsInput.value.trim();
      if (symptoms) {
        displayMessage(symptoms, true);
        socket.emit('send_symptoms', { symptoms });
        symptomsInput.value = '';
      }
    }
  
    window.startListening = () => {
      recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        symptomsInput.value = transcript;
        sendSymptoms();
      };
      
      recognition.start();
    };
  
    socket.on('receive_message', (data) => {
      if (data.error) {
        displayMessage(`Error: ${data.error}`);
      } else {
        displayMessage(data.reply);
        if (data.audio) {
          const audio = new Audio(data.audio);
          audio.play().catch(error => {
            console.log('Audio play failed:', error);
            alert('Click anywhere to allow audio playback');
          });
        }
      }
    });
  
    socket.on('processing', (data) => {
      if (data.status) {
        displayMessage('Analyzing your symptoms...');
      }
    });
  });