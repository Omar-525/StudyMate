// ---------- التخزين الدائم ----------
const DB_KEY_LECTURES = "studymate_lectures";
const DB_KEY_NOTES = "studymate_notes";

function loadLectures() { return JSON.parse(localStorage.getItem(DB_KEY_LECTURES) || "[]"); }
function saveLectures(arr) { localStorage.setItem(DB_KEY_LECTURES, JSON.stringify(arr)); }
function loadNotes() { return JSON.parse(localStorage.getItem(DB_KEY_NOTES) || "[]"); }
function saveNotes(arr) { localStorage.setItem(DB_KEY_NOTES, JSON.stringify(arr)); }

let lectures = loadLectures();
let notes = loadNotes();
let selectedColor = 0;

// ---------- التاريخ والترحيب ----------
const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const now = new Date();
document.getElementById("dateText").textContent = "مفكرتي الدراسية";
document.getElementById("greetingText").textContent =
  "أهلًا بك 👋  " + days[now.getDay()] + "، اليوم لديك تنظيم رائع بانتظارك";

// ---------- التنقل بين الشاشات ----------
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("screen-" + btn.dataset.screen).classList.add("active");
  });
});

// ================= الجدول =================
const lecturesList = document.getElementById("lecturesList");
const emptyLectures = document.getElementById("emptyLectures");

function renderLectures() {
  lecturesList.innerHTML = "";
  if (lectures.length === 0) { emptyLectures.classList.add("show"); return; }
  emptyLectures.classList.remove("show");

  lectures.forEach(l => {
    const card = document.createElement("div");
    card.className = "lecture-card";
    card.innerHTML = `
      <div class="stripe c${l.color}"></div>
      <div class="info">
        <div class="title">${escapeHtml(l.title)}</div>
        <div class="meta">${l.day} • ${l.time || "--:--"}</div>
        <div class="meta">${escapeHtml(l.location || "")}</div>
      </div>
      <button class="del-btn" data-id="${l.id}">✕</button>
    `;
    lecturesList.appendChild(card);
  });

  lecturesList.querySelectorAll(".del-btn").forEach(b => {
    b.addEventListener("click", () => {
      lectures = lectures.filter(x => x.id !== b.dataset.id);
      saveLectures(lectures);
      renderLectures();
    });
  });
}

document.getElementById("btnAddLecture").addEventListener("click", () => {
  document.getElementById("lectureModalOverlay").classList.add("show");
});
document.getElementById("btnCancelLecture").addEventListener("click", closeLectureModal);

function closeLectureModal() {
  document.getElementById("lectureModalOverlay").classList.remove("show");
  document.getElementById("inpTitle").value = "";
  document.getElementById("inpLocation").value = "";
  document.getElementById("inpTime").value = "";
}

document.querySelectorAll(".color-dot").forEach(dot => {
  dot.addEventListener("click", () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
    dot.classList.add("selected");
    selectedColor = Number(dot.dataset.c);
  });
});

document.getElementById("btnSaveLecture").addEventListener("click", () => {
  const title = document.getElementById("inpTitle").value.trim();
  if (!title) return;
  lectures.push({
    id: crypto.randomUUID(),
    title,
    day: document.getElementById("inpDay").value,
    time: document.getElementById("inpTime").value,
    location: document.getElementById("inpLocation").value.trim(),
    color: selectedColor
  });
  saveLectures(lectures);
  renderLectures();
  closeLectureModal();
});

// ================= الملاحظات =================
const notesList = document.getElementById("notesList");
const emptyNotes = document.getElementById("emptyNotes");
const audioPlayer = document.getElementById("audioPlayer");

function timeAgo(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) + " - " +
    d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function renderNotes() {
  const textVoice = notes.filter(n => n.type !== "photo");
  notesList.innerHTML = "";
  if (textVoice.length === 0) { emptyNotes.classList.add("show"); }
  else { emptyNotes.classList.remove("show"); }

  textVoice.forEach(n => {
    const card = document.createElement("div");
    card.className = "note-card";
    if (n.type === "text") {
      card.innerHTML = `
        <div class="note-icon">📝</div>
        <div style="flex:1">
          <div class="note-text">${escapeHtml(n.text)}</div>
          <div class="note-time">${timeAgo(n.ts)}</div>
        </div>
        <button class="del-btn" data-id="${n.id}">✕</button>
      `;
    } else {
      card.innerHTML = `
        <button class="play" data-audio="${n.audio}">▶</button>
        <div style="flex:1">
          <div class="note-text">ملاحظة صوتية</div>
          <div class="note-time">${timeAgo(n.ts)}</div>
        </div>
        <button class="del-btn" data-id="${n.id}">✕</button>
      `;
    }
    notesList.appendChild(card);
  });

  notesList.querySelectorAll(".play").forEach(b => {
    b.addEventListener("click", () => {
      audioPlayer.src = b.dataset.audio;
      audioPlayer.play();
    });
  });
  notesList.querySelectorAll(".del-btn").forEach(b => {
    b.addEventListener("click", () => {
      notes = notes.filter(x => x.id !== b.dataset.id);
      saveNotes(notes);
      renderNotes();
    });
  });
}

document.getElementById("btnSendText").addEventListener("click", addTextNote);
document.getElementById("textNoteInput").addEventListener("keypress", e => {
  if (e.key === "Enter") addTextNote();
});
function addTextNote() {
  const input = document.getElementById("textNoteInput");
  const val = input.value.trim();
  if (!val) return;
  notes.unshift({ id: crypto.randomUUID(), type: "text", text: val, ts: Date.now() });
  saveNotes(notes);
  input.value = "";
  renderNotes();
}

// ---------- التسجيل الصوتي ----------
let mediaRecorder, audioChunks = [], isRecording = false, stream;
const recordBtn = document.getElementById("btnRecord");
const waveform = document.getElementById("waveform");

for (let i = 0; i < 24; i++) { const s = document.createElement("span"); waveform.appendChild(s); }

recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert("يرجى السماح بالوصول إلى الميكروفون");
      return;
    }
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        notes.unshift({ id: crypto.randomUUID(), type: "voice", audio: reader.result, ts: Date.now() });
        saveNotes(notes);
        renderNotes();
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add("recording");
    document.getElementById("recordLabel").textContent = "إيقاف التسجيل";
    animateWave(true);
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.classList.remove("recording");
    document.getElementById("recordLabel").textContent = "تسجيل ملاحظة صوتية";
    animateWave(false);
  }
});

let waveInterval;
function animateWave(active) {
  clearInterval(waveInterval);
  const bars = waveform.querySelectorAll("span");
  if (active) {
    waveInterval = setInterval(() => {
      bars.forEach(b => b.style.height = (4 + Math.random() * 22) + "px");
    }, 120);
  } else {
    bars.forEach(b => b.style.height = "6px");
  }
}

// ================= التصوير =================
const cameraInput = document.getElementById("cameraInput");
const pendingBox = document.getElementById("pendingPhotoBox");
const pendingImg = document.getElementById("pendingPhotoImg");
let pendingPhotoData = null;

document.getElementById("btnOpenCamera").addEventListener("click", () => cameraInput.click());

cameraInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    pendingPhotoData = reader.result;
    pendingImg.src = pendingPhotoData;
    pendingBox.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
  cameraInput.value = "";
});

document.getElementById("btnCancelPhoto").addEventListener("click", () => {
  pendingBox.classList.add("hidden");
  document.getElementById("photoNoteInput").value = "";
  pendingPhotoData = null;
});

document.getElementById("btnSavePhoto").addEventListener("click", () => {
  if (!pendingPhotoData) return;
  const noteText = document.getElementById("photoNoteInput").value.trim();
  notes.unshift({ id: crypto.randomUUID(), type: "photo", image: pendingPhotoData, text: noteText, ts: Date.now() });
  saveNotes(notes);
  pendingBox.classList.add("hidden");
  document.getElementById("photoNoteInput").value = "";
  pendingPhotoData = null;
  renderPhotos();
});

const photosList = document.getElementById("photosList");
const emptyPhotos = document.getElementById("emptyPhotos");

function renderPhotos() {
  const photos = notes.filter(n => n.type === "photo");
  photosList.innerHTML = "";
  if (photos.length === 0) { emptyPhotos.classList.add("show"); }
  else { emptyPhotos.classList.remove("show"); }

  photos.forEach(p => {
    const item = document.createElement("div");
    item.className = "photo-item";
    item.innerHTML = `
      <img src="${p.image}">
      <div class="cap">
        <p>${escapeHtml(p.text || "بدون ملاحظة")}</p>
        <button class="del-btn" data-id="${p.id}">حذف</button>
      </div>
    `;
    photosList.appendChild(item);
  });

  photosList.querySelectorAll(".del-btn").forEach(b => {
    b.addEventListener("click", () => {
      notes = notes.filter(x => x.id !== b.dataset.id);
      saveNotes(notes);
      renderPhotos();
    });
  });
}

// ---------- أدوات مساعدة ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- بدء التشغيل ----------
renderLectures();
renderNotes();
renderPhotos();