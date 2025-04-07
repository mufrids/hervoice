console.log("✅ script.js loaded");

document.addEventListener('DOMContentLoaded', () => {
  const micButton = document.getElementById("micButton");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const audio = document.getElementById("audioReply");
  const wave = document.getElementById("voiceWave");

  let mediaRecorder;
  let audioChunks = [];
  let isRunning = false;
  let isPaused = false;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎤 Mic access granted");
  
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];
  
      mediaRecorder.onstart = () => {
        console.log("⏺️ Recording started...");
      };
  
      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };
  
      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped, preparing upload...");
  
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', blob, 'input.wav');
  
        try {
          console.log("📡 Sending request to server...");
          const res = await fetch('http://localhost:3001/api/ask', {
            method: 'POST',
            body: formData
          });
  
          const mp3Blob = await res.blob();
          console.log("📥 Got response from server! Blob size:", mp3Blob.size);
  
          const audioURL = URL.createObjectURL(mp3Blob);
          audio.src = audioURL;
          audio.play();
  
          wave.classList.add("inactive");
  
          audio.onended = () => {
            if (isRunning && !isPaused) {
              wave.classList.remove("inactive");
              startRecording(); // 🔁 Repeat after response ends
            }
          };
        } catch (err) {
          console.error("❌ Upload/response error:", err);
          isRunning = false;
        }
      };
  
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("⏹️ Force-stopping after 5s...");
          mediaRecorder.stop();
        }
      }, 4000);
  
      wave.classList.remove("inactive");
    } catch (err) {
      console.error("❌ Error accessing mic:", err);
    }
  }
  

  micButton.onclick = () => {
    console.log("🎙 Mic button clicked!");

    if (!isRunning) {
      isRunning = true;
      navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log("🎤 Mic access granted"))
  .catch(err => console.error("❌ Mic access error:", err));

      isPaused = false;
      wave.classList.remove("inactive");
      startRecording();
    }
  };

  pauseBtn.onclick = () => {
    isPaused = true;
    isRunning = false;
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    wave.classList.add("inactive");
  };

  stopBtn.onclick = () => {
    isPaused = true;
    isRunning = false;
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    audio.src = "";
    wave.classList.add("inactive");
  };
});