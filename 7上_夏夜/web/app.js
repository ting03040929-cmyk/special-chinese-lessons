// --- State Management ---
const state = {
  currentTab: 'reader',
  readerFontSize: 1.25, // rem
  speakingParagraphIdx: -1,
  activeParagraphIdx: 0,
  
  // Matching Game
  matching: {
    selectedWordCard: null,
    selectedImageCard: null,
    matchedPairs: new Set(),
    score: 0,
    activeVocabs: []
  },
  
  // Fill-in-the-blank
  fillblank: {
    currentIdx: 0,
    selectedAnswers: Array(8).fill(null), // 8 questions
    wordsInBank: []
  },
  
  // Quiz (MCQ)
  quiz: {
    mode: 'concept', // 'concept' (combines mcqs_blank & mcqs_concept) or 'comprehension'
    conceptIdx: 0, // 0-15 (8 blank + 8 concept)
    comprehensionIdx: 0, // 0-20 (21 questions)
    conceptAnswers: Array(16).fill(null),
    comprehensionAnswers: Array(20).fill(null),
    shuffledOptions: []
  }
};

// --- Static Vocab Definitions for Common Words ---
const commonVocabDetails = {
  "蜜糖": { zhuyin: "ㄇㄧˋ ㄊㄤˊ", definition: "蝴蝶和蜜蜂從花朵裡採集到的甜甜糖漿。", example: "蜜蜂忙著把花朵的蜜糖帶回家。" },
  "村莊": { zhuyin: "ㄘㄨㄣ  ㄓㄨㄤ", definition: "許多人居住在一起、有房屋和農田的鄉下聚落。", example: "晚上的時候，村莊裡的燈慢慢亮了。" },
  "夏夜": { zhuyin: "ㄒㄧㄚˋ ㄧㄝˋ", definition: "夏天涼爽的夜晚。", example: "美麗的夏夜有很多一閃一閃的螢火蟲。" },
  "街燈": { zhuyin: "ㄐㄧㄝ  ㄉㄥ", definition: "馬路邊在晚上會發亮、照亮道路的電燈。", example: "路旁的街燈亮了，照亮了晚上的馬路。" },
  "花園": { zhuyin: "ㄏㄨㄚ  ㄩㄢˊ", definition: "種植許多花草樹木，供人散步、觀賞的漂亮庭院。", example: "小妹妹夢到自己在美麗的大花園裡玩。" },
  "歌唱": { zhuyin: "ㄍㄜ  ㄔㄤˋ", definition: "用嘴巴發出好聽的聲音來唱歌。", example: "小河低聲歌唱，溜過彎彎的小橋。" },
  "告別": { zhuyin: "ㄍㄠˋ ㄅㄧㄝˊ", definition: "跟別人說再見、道別。", example: "小牛和羊群告別了草地回家睡覺。" },
  "迎接": { zhuyin: "ㄧㄥˊ ㄐㄧㄝ", definition: "開心地去大門口或路旁，等待並歡迎別人的到來。", example: "我們開心地迎接夏天的夜晚。" },
  "眼睛": { zhuyin: "ㄧㄢˇ ㄐㄧㄥ", definition: "臉上用來看東西、欣賞美景的器官。", example: "累了的時候，閉上眼睛很快就能睡著。" },
  "醒著": { zhuyin: "ㄒㄧㄥˇ ㄓㄜ", definition: "身體保持清醒，沒有睡著的狀態。", example: "大家都睡了，只有南瓜和夜風還醒著。" },
  "愉快": { zhuyin: "ㄩˊ ㄎㄨㄞˋ", definition: "心情非常好、很開心、很快樂的感覺。", example: "小弟弟和小妹妹在夢鄉裡愉快地玩耍。" },
  "旅行": { zhuyin: "ㄌㄩˇ ㄒㄧㄥˊ", definition: "到其他地方去走走、遊玩，欣賞不同的風景。", example: "夜風和螢火蟲在夏夜裡愉快地旅行。" }
};æ¨£å­ã", example: "é¿åª½çè¡£æ«è£¡æå¾å¤åè£æ¼äº®çæè²´é¦çã" },
  "è¡£æ": { zhuyin: "ã§  ãã¨Ë", definition: "ç©¿å¨èº«ä¸ç¨ä¾ä¿æåé®è½èº«é«çè¡£ç©ã", example: "ææ¯å®¶è£¡çèå¤§ï¼å°æåå¸¸ç©¿å¥å¥çä¸ä¾çè¡£æã" },
  "å¤±æ": { zhuyin: "ã  ã¨ã¤Ë", definition: "å¸æçäºææ²æéæï¼å¿è£¡è¦ºå¾é£éãæ°£é¤ã", example: "å°ææ²ææ¿å°ç©å·ï¼èä¸é²åºå¤±æçè¡¨æã" },
  "ä¿®ç": { zhuyin: "ãã§ã¡  ãã§Ë", definition: "æå£æãç£¨æçæ±è¥¿è£å¥½ï¼è®å®è½åæ¬¡ä½¿ç¨ã", example: "æééå£ç¬äºï¼å¤§äººç¨å¼·åè æå®ä¿®çå¥½ã" },
  "é·å¤§": { zhuyin: "ãã¤Ë ããË", definition: "èº«é«é·é«ãå¹´ç´è®å¤§ï¼è®æå¤§äººçéç¨ã", example: "ç­æé·å¤§ä»¥å¾ï¼å¸é¢ä¸éå§æµè¡ä¸å±¤è¡çç´ã" },
  "æµªè²»": { zhuyin: "ãã¤Ë ããË", definition: "ä¸çææ±è¥¿ï¼äºè±é¢æé¨ä¾¿ä¸æ£éè½ç¨çç©åã", example: "è¡çç´ä¸æ¬¡æ½å¤ªå¤æ¯æµªè²»çè¡çºã" }
};

// --- Text-to-Speech (TTS) Config ---
let currentUtterance = null;
const synth = window.speechSynthesis;

function speakText(text, onEndCallback = null) {
  if (synth.speaking) {
    synth.cancel();
  }
  
  // Use speech synthesis
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  utterance.rate = 0.85; // Slightly slower for special ed
  
  if (onEndCallback) {
    utterance.onend = onEndCallback;
  }
  
  currentUtterance = utterance;
  synth.speak(utterance);
}

function stopSpeaking() {
  if (synth.speaking) {
    synth.cancel();
  }
}

// --- Synthesized Sound Effects (AudioContext) ---
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'wrong') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(146.83, now); // D3
      osc.frequency.linearRampToValueAtTime(110.00, now + 0.25); // A2 buzz
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'victory') {
      osc.type = 'sine';
      // Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      });
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch (e) {
    console.warn("Audio Context sound error:", e);
  }
}

// --- Confetti celebration effect ---
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  } else {
    // Custom DOM-based fallback confetti
    for (let i = 0; i < 50; i++) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.zIndex = '9999';
      el.style.width = Math.random() * 8 + 8 + 'px';
      el.style.height = Math.random() * 8 + 8 + 'px';
      el.style.backgroundColor = ['#ff85a1', '#74c69d', '#2d6a4f', '#f4a261', '#e9c46a', '#457b9d'][Math.floor(Math.random() * 6)];
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = '-20px';
      el.style.borderRadius = '50%';
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(el);
      
      const duration = Math.random() * 1.8 + 1.2;
      el.style.transition = `transform ${duration}s linear, top ${duration}s linear, opacity ${duration}s ease`;
      
      setTimeout(() => {
        el.style.top = '105vh';
        el.style.transform = `translate(${Math.random() * 160 - 80}px, 0) rotate(${Math.random() * 720}deg)`;
        el.style.opacity = '0';
      }, 50);
      
      setTimeout(() => el.remove(), duration * 1000 + 100);
    }
  }
}

// --- Paragraph to Vocabulary Mapping for Reader Sidebar ---
const paragraphVocabs = {
  0: ["蜜糖", "告別", "田野", "街燈", "村莊", "夏夜"],
  1: ["迎接", "夏夜"],
  2: ["迎接", "樹梢"],
  3: ["珍珠"],
  4: ["夏夜", "涼爽"],
  5: ["眼睛", "夢鄉"],
  6: ["花園"],
  7: ["朦朧", "山巒", "田野", "醒著"],
  8: ["醒著", "藤蔓"],
  9: ["醒著", "歌唱"],
  10: ["醒著", "夏夜", "愉快", "旅行"]
};

// --- Answers Database mapping ---
const answerKeys = {
  fillblank: ["樹梢", "珍珠", "田野", "夢鄉", "朦朧", "山巒", "藤蔓", "涼爽"],
  blank: ["夢鄉", "涼爽", "樹梢", "田野", "朦朧", "山巒", "藤蔓", "珍珠"],
  concept: ["涼爽", "夢鄉", "樹梢", "田野", "朦朧、山巒", "藤蔓", "滿天的星星", "朦朧"],
  comprehension: [
    "蝴蝶和蜜蜂們", "寬廣的田野", "火輪子", "街燈", "輕輕地來了", "山坡上", "椰子樹", "珍珠", "月亮",
    "美麗、涼爽", "欄裡（圍欄）", "老祖母", "眼睛", "夢鄉", "一隻蝴蝶", "大花園裡", "藍色的大海裡",
    "南瓜", "彎彎的小橋", "提燈的螢火蟲"
  ]
};

// --- DOM elements cache ---
const elements = {
  navButtons: document.querySelectorAll('.nav-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Reader
  readerTextFlow: document.getElementById('reader-text-flow'),
  btnPlayAll: document.getElementById('btn-reader-play-all'),
  btnStopReader: document.getElementById('btn-reader-stop'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),
  readerVisualAids: document.getElementById('reader-visual-aids'),
  vocabDetailBox: document.getElementById('vocab-detail-box'),
  vocabDetailWord: document.getElementById('vocab-detail-word'),
  vocabDetailZhuyin: document.getElementById('vocab-detail-zhuyin'),
  vocabDetailImg: document.getElementById('vocab-detail-img'),
  vocabDetailDef: document.getElementById('vocab-detail-def'),
  vocabDetailExample: document.getElementById('vocab-detail-example'),
  
  // Flashcards
  flashcardsGrid: document.getElementById('flashcards-grid'),
  
  // Matching Game
  matchingWordsCol: document.getElementById('matching-words-col'),
  matchingImagesCol: document.getElementById('matching-images-col'),
  matchScore: document.getElementById('match-score'),
  btnResetMatching: document.getElementById('btn-reset-matching'),
  
  // Fill in Blank
  fillblankQuestion: document.getElementById('fillblank-question'),
  fillblankHintText: document.getElementById('fillblank-hint-text'),
  btnFillblankHint: document.getElementById('btn-fillblank-hint'),
  fillblankAnswerSlot: document.getElementById('fillblank-answer-slot'),
  fillblankWordBank: document.getElementById('fillblank-word-bank'),
  fillblankCurrentIdx: document.getElementById('fillblank-current-idx'),
  fillblankProgress: document.getElementById('fillblank-progress'),
  btnClearFillblank: document.getElementById('btn-clear-fillblank'),
  btnPrevFillblank: document.getElementById('btn-prev-fillblank'),
  btnSubmitFillblank: document.getElementById('btn-submit-fillblank'),
  btnNextFillblank: document.getElementById('btn-next-fillblank'),
  
  // Quiz
  btnQuizModeConcept: document.getElementById('btn-quiz-mode-concept'),
  btnQuizModeComprehension: document.getElementById('btn-quiz-mode-comprehension'),
  quizTitle: document.getElementById('quiz-title'),
  quizCurrentIdx: document.getElementById('quiz-current-idx'),
  quizTotalCount: document.getElementById('quiz-total-count'),
  quizSectionTag: document.getElementById('quiz-section-tag'),
  quizQuestion: document.getElementById('quiz-question'),
  quizHintContainer: document.getElementById('quiz-hint-container'),
  quizHintText: document.getElementById('quiz-hint-text'),
  btnQuizHint: document.getElementById('btn-quiz-hint'),
  quizOptionsContainer: document.getElementById('quiz-options-container'),
  quizFeedback: document.getElementById('quiz-feedback'),
  quizFeedbackIcon: document.getElementById('quiz-feedback-icon'),
  quizFeedbackText: document.getElementById('quiz-feedback-text'),
  btnPrevQuiz: document.getElementById('btn-prev-quiz'),
  btnNextQuiz: document.getElementById('btn-next-quiz'),
  
  // Modal
  summaryModal: document.getElementById('summary-modal'),
  summaryModalText: document.getElementById('summary-modal-text'),
  btnCloseModal: document.getElementById('btn-close-modal')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  initReader();
  initFlashcards();
  initMatchingGame();
  initFillblank();
  initQuiz();
  setupSummaryModal();
});

// --- Tab Routing ---
function setupNavigation() {
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;
  stopSpeaking();
  
  // Update nav buttons
  elements.navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update contents
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add('active-content');
    } else {
      content.classList.remove('active-content');
    }
  });
  
  // Special tab activation hooks
  if (tabId === 'matching') {
    initMatchingGame();
  }
}

// --- Module 1: Reader Controller ---
function initReader() {
  elements.readerTextFlow.innerHTML = '';
  
  lessonData.story.forEach((paraText, idx) => {
    const p = document.createElement('div');
    p.className = 'reader-paragraph';
    p.setAttribute('data-idx', idx);
    
    // Text container
    const textDiv = document.createElement('div');
    textDiv.className = 'paragraph-text';
    
    // Split paragraph into sentences (keeping punctuation)
    const sentences = paraText.split(/(?<=[ãï¼ï¼])/g).filter(s => s.trim().length > 0);
    sentences.forEach((sentenceText, sIdx) => {
      const span = document.createElement('span');
      span.className = 'reader-sentence';
      span.setAttribute('data-para-idx', idx);
      span.setAttribute('data-sent-idx', sIdx);
      span.innerHTML = highlightVocabs(sentenceText);
      
      // Click sentence to speak and activate
      span.addEventListener('click', (e) => {
        if (e.target.classList.contains('vocab-word')) {
          const word = e.target.getAttribute('data-word');
          showVocabDetail(word);
          e.stopPropagation();
        }
        activateSentence(idx, sIdx);
      });
      
      textDiv.appendChild(span);
    });
    
    // Create button to play the entire paragraph
    const readParaBtn = document.createElement('button');
    readParaBtn.className = 'btn-read-paragraph';
    readParaBtn.innerHTML = '<span>ð</span> è®æ­¤æ®µ';
    readParaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      readParagraphStory(idx);
    });
    
    p.appendChild(textDiv);
    p.appendChild(readParaBtn);
    elements.readerTextFlow.appendChild(p);
  });
  
  // Font adjusters
  elements.btnFontDec.addEventListener('click', () => adjustFontSize(-0.1));
  elements.btnFontInc.addEventListener('click', () => adjustFontSize(0.1));
  
  // TTS Play All
  elements.btnPlayAll.addEventListener('click', () => readFullStory());
  elements.btnStopReader.addEventListener('click', () => {
    stopSpeaking();
    resetReaderAudioState();
  });
  
  // Activate first sentence visually (no autoplay speaking on load)
  activateSentence(0, 0, false);
}

function adjustFontSize(delta) {
  state.readerFontSize = Math.min(2.0, Math.max(1.0, state.readerFontSize + delta));
  const paragraphs = document.querySelectorAll('.reader-paragraph');
  paragraphs.forEach(p => {
    p.style.fontSize = `${state.readerFontSize}rem`;
  });
}

function highlightVocabs(text) {
  let formatted = text;
  
  // Make a list of all words sorted by length descending (longer match priority)
  const wordsToHighlight = [];
  lessonData.difficult_vocabs.forEach(v => {
    wordsToHighlight.push({ word: v.word, type: 'difficult' });
  });
  lessonData.common_vocabs.forEach(v => {
    wordsToHighlight.push({ word: v, type: 'common' });
  });
  
  wordsToHighlight.sort((a, b) => b.word.length - a.word.length);
  
  // Simple replacement wrapper
  wordsToHighlight.forEach(item => {
    const regex = new RegExp(item.word, 'g');
    formatted = formatted.replace(regex, `##START##${item.type}##${item.word}##END##`);
  });
  
  // Replace markers with spans to avoid nested tags during parsing
  const markerRegex = /##START##(difficult|common)##([^#]+)##END##/g;
  formatted = formatted.replace(markerRegex, (match, type, word) => {
    return `<span class="vocab-word ${type}" data-word="${word}">${word}</span>`;
  });
  
  return formatted;
}

function activateSentence(paraIdx, sentIdx, shouldSpeak = true) {
  state.activeParagraphIdx = paraIdx;
  
  // Highlight active paragraph visually
  const paragraphs = document.querySelectorAll('.reader-paragraph');
  paragraphs.forEach((p, i) => {
    if (i === paraIdx) {
      p.classList.add('active-paragraph');
      p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      p.classList.remove('active-paragraph');
    }
  });
  
  // Highlight active sentence
  const allSentences = document.querySelectorAll('.reader-sentence');
  allSentences.forEach(s => s.classList.remove('speaking-sentence'));
  
  const activeSent = document.querySelector(`.reader-sentence[data-para-idx="${paraIdx}"][data-sent-idx="${sentIdx}"]`);
  if (activeSent) {
    activeSent.classList.add('speaking-sentence');
  }
  
  // Show vocabulary cards for this paragraph
  renderSidebarVocabs(paraIdx);
  
  // Speak the sentence if requested
  if (shouldSpeak && activeSent) {
    const textToSpeak = activeSent.innerText;
    elements.btnPlayAll.classList.add('hide');
    elements.btnStopReader.classList.remove('hide');
    
    speakText(textToSpeak, () => {
      activeSent.classList.remove('speaking-sentence');
      resetReaderAudioState();
    });
  }
}

function renderSidebarVocabs(paraIdx) {
  elements.readerVisualAids.innerHTML = '';
  const vocabs = paragraphVocabs[paraIdx] || [];
  
  if (vocabs.length === 0) {
    elements.readerVisualAids.innerHTML = '<p style="grid-column: span 3; text-align: center; color: var(--text-light);">æ¬æ®µç¡æ°è©å½</p>';
    elements.vocabDetailBox.classList.add('hide');
    return;
  }
  
  vocabs.forEach(word => {
    const card = document.createElement('div');
    card.className = 'visual-aid-thumb';
    card.innerHTML = `
      <img src="images/${word}.png" onerror="this.src='images/è¥ç.png'" alt="${word}">
      <span>${word}</span>
    `;
    card.addEventListener('click', () => showVocabDetail(word));
    elements.readerVisualAids.appendChild(card);
  });
  
  // Show first vocab details by default
  showVocabDetail(vocabs[0]);
}

function showVocabDetail(word) {
  elements.vocabDetailBox.classList.remove('hide');
  elements.vocabDetailWord.innerText = word;
  
  // Find definition
  let info = lessonData.difficult_vocabs.find(v => v.word === word);
  if (!info) {
    info = commonVocabDetails[word];
  }
  
  if (info) {
    // Removed Zhuyin display as requested
    elements.vocabDetailImg.src = `images/${word}.png`;
    elements.vocabDetailImg.onerror = function() { this.src = 'images/è¥ç.png'; };
    elements.vocabDetailDef.innerHTML = `<strong>è©ç¾©ï¼</strong>${info.definition}`;
    
    if (info.example_sentence || info.example) {
      elements.vocabDetailExample.classList.remove('hide');
      elements.vocabDetailExample.innerHTML = `<strong>ä¾å¥ï¼</strong>${info.example_sentence || info.example}`;
    } else {
      elements.vocabDetailExample.classList.add('hide');
    }
  }
}

function readFullStory() {
  const sentences = Array.from(document.querySelectorAll('.reader-sentence'));
  let sIdx = 0;
  
  elements.btnPlayAll.classList.add('hide');
  elements.btnStopReader.classList.remove('hide');
  
  function readNext() {
    if (sIdx < sentences.length) {
      const sent = sentences[sIdx];
      const pIdx = parseInt(sent.getAttribute('data-para-idx'));
      const sentNum = parseInt(sent.getAttribute('data-sent-idx'));
      
      activateSentence(pIdx, sentNum, false);
      
      const textToSpeak = sent.innerText;
      sent.classList.add('speaking-sentence');
      
      speakText(textToSpeak, () => {
        sent.classList.remove('speaking-sentence');
        sIdx++;
        readNext();
      });
    } else {
      resetReaderAudioState();
    }
  }
  
  readNext();
}

function readParagraphStory(paraIdx) {
  // Highlight active paragraph visually
  const paragraphs = document.querySelectorAll('.reader-paragraph');
  paragraphs.forEach((p, i) => {
    if (i === paraIdx) {
      p.classList.add('active-paragraph');
      p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      p.classList.remove('active-paragraph');
    }
  });
  renderSidebarVocabs(paraIdx);
  
  const sentences = Array.from(document.querySelectorAll(`.reader-sentence[data-para-idx="${paraIdx}"]`));
  let sIdx = 0;
  
  elements.btnPlayAll.classList.add('hide');
  elements.btnStopReader.classList.remove('hide');
  
  // Remove other highlights
  document.querySelectorAll('.reader-sentence').forEach(s => s.classList.remove('speaking-sentence'));
  
  function readNext() {
    if (sIdx < sentences.length) {
      const sent = sentences[sIdx];
      const textToSpeak = sent.innerText;
      sent.classList.add('speaking-sentence');
      
      speakText(textToSpeak, () => {
        sent.classList.remove('speaking-sentence');
        sIdx++;
        readNext();
      });
    } else {
      resetReaderAudioState();
    }
  }
  
  readNext();
}

function resetReaderAudioState() {
  elements.btnPlayAll.classList.remove('hide');
  elements.btnStopReader.classList.add('hide');
  const paragraphs = document.querySelectorAll('.reader-paragraph');
  paragraphs.forEach(p => p.classList.remove('speaking'));
  const sentences = document.querySelectorAll('.reader-sentence');
  sentences.forEach(s => s.classList.remove('speaking-sentence'));
}

// --- Module 2: Flashcards Controller ---
function initFlashcards() {
  elements.flashcardsGrid.innerHTML = '';
  
  lessonData.difficult_vocabs.forEach((v, idx) => {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'flip-card';
    
    cardContainer.innerHTML = `
      <div class="flip-card-inner">
        <!-- Front -->
        <div class="flip-card-front">
          <span class="card-num-tag">${idx + 1}</span>
          <div class="card-word-title" style="margin-top: 60px;">${v.word}</div>
          <div class="card-hint-click">ð±ï¸ é»é¸çè©ç¾©</div>
        </div>
        <!-- Back -->
        <div class="flip-card-back">
          <div class="card-word-title">${v.word}</div>
          <img class="card-back-img" src="images/${v.word}.png" onerror="this.src='images/è¥ç.png'" alt="${v.word}">
          <div class="card-def-text"><strong>è§£éï¼</strong>${v.definition}</div>
          <div class="card-example-text"><strong>ä¾å¥ï¼</strong>${v.example_sentence}</div>
          <button class="card-speak-btn" title="è½ç¼é³">ð</button>
        </div>
      </div>
    `;
    
    // Flip Card Click Action
    cardContainer.addEventListener('click', (e) => {
      // If clicked the speak button on the back
      if (e.target.classList.contains('card-speak-btn')) {
        e.stopPropagation();
        speakText(`${v.word}ãè§£éï¼${v.definition}ãä¾å¥ï¼${v.example_sentence}`);
        return;
      }
      
      cardContainer.classList.toggle('flipped');
      // Speak when flipped to the back
      if (cardContainer.classList.contains('flipped')) {
        speakText(v.word);
      }
    });
    
    elements.flashcardsGrid.appendChild(cardContainer);
  });
}

// --- Module 3: Matching Game Controller ---
function initMatchingGame() {
  state.matching.selectedWordCard = null;
  state.matching.selectedImageCard = null;
  state.matching.matchedPairs.clear();
  state.matching.score = 0;
  elements.matchScore.innerText = '0';
  
  // Pick 6 random vocabularies from 12 common + 8 difficult to keep cognitive load low
  const allVocabs = [
    ...lessonData.common_vocabs,
    ...lessonData.difficult_vocabs.map(v => v.word)
  ];
  
  // Shuffle all and pick first 6
  const shuffledList = [...allVocabs].sort(() => 0.5 - Math.random());
  state.matching.activeVocabs = shuffledList.slice(0, 6);
  
  renderMatchingCards();
}

function renderMatchingCards() {
  elements.matchingWordsCol.innerHTML = '';
  elements.matchingImagesCol.innerHTML = '';
  
  const words = [...state.matching.activeVocabs];
  const images = [...state.matching.activeVocabs];
  
  // Shuffle columns independently
  words.sort(() => 0.5 - Math.random());
  images.sort(() => 0.5 - Math.random());
  
  // Render Word cards
  words.forEach(word => {
    const card = document.createElement('div');
    card.className = 'matching-card word-card';
    card.setAttribute('data-word', word);
    card.innerText = word;
    
    card.addEventListener('click', () => handleMatchingSelect('word', card, word));
    elements.matchingWordsCol.appendChild(card);
  });
  
  // Render Image cards
  images.forEach(word => {
    const card = document.createElement('div');
    card.className = 'matching-card image-card';
    card.setAttribute('data-word', word);
    card.innerHTML = `<img src="images/${word}.png" onerror="this.src='images/è¥ç.png'" alt="${word}">`;
    
    card.addEventListener('click', () => handleMatchingSelect('image', card, word));
    elements.matchingImagesCol.appendChild(card);
  });
  
  // Reset Button
  elements.btnResetMatching.onclick = initMatchingGame;
}

function handleMatchingSelect(type, cardEl, word) {
  // If card is already matched, ignore
  if (cardEl.classList.contains('matched')) return;
  
  playSound('click');
  
  if (type === 'word') {
    // Toggle/set selection for word card
    const prevSelected = elements.matchingWordsCol.querySelector('.matching-card.selected');
    if (prevSelected) prevSelected.classList.remove('selected');
    
    if (state.matching.selectedWordCard === cardEl) {
      state.matching.selectedWordCard = null;
    } else {
      cardEl.classList.add('selected');
      state.matching.selectedWordCard = cardEl;
    }
  } else {
    // Toggle/set selection for image card
    const prevSelected = elements.matchingImagesCol.querySelector('.matching-card.selected');
    if (prevSelected) prevSelected.classList.remove('selected');
    
    if (state.matching.selectedImageCard === cardEl) {
      state.matching.selectedImageCard = null;
    } else {
      cardEl.classList.add('selected');
      state.matching.selectedImageCard = cardEl;
    }
  }
  
  // Check matching status
  if (state.matching.selectedWordCard && state.matching.selectedImageCard) {
    const wCard = state.matching.selectedWordCard;
    const iCard = state.matching.selectedImageCard;
    const wWord = wCard.getAttribute('data-word');
    const iWord = iCard.getAttribute('data-word');
    
    if (wWord === iWord) {
      // Match successful!
      playSound('correct');
      wCard.classList.remove('selected');
      iCard.classList.remove('selected');
      wCard.classList.add('correct');
      iCard.classList.add('correct');
      
      state.matching.matchedPairs.add(wWord);
      state.matching.score += 10;
      elements.matchScore.innerText = state.matching.score;
      
      setTimeout(() => {
        wCard.classList.replace('correct', 'matched');
        iCard.classList.replace('correct', 'matched');
      }, 500);
      
      // Clear selections
      state.matching.selectedWordCard = null;
      state.matching.selectedImageCard = null;
      
      // Check win state
      if (state.matching.matchedPairs.size === state.matching.activeVocabs.length) {
        setTimeout(() => {
          triggerConfetti();
          playSound('victory');
          showSummary("ä½ å¤ªå²å®³äºï¼éå°éæ²å¨é¨ç­å°ï¼");
        }, 800);
      }
    } else {
      // Match failed!
      playSound('wrong');
      wCard.classList.add('incorrect');
      iCard.classList.add('incorrect');
      
      setTimeout(() => {
        wCard.classList.remove('incorrect', 'selected');
        iCard.classList.remove('incorrect', 'selected');
      }, 500);
      
      state.matching.selectedWordCard = null;
      state.matching.selectedImageCard = null;
    }
  }
}

// --- Module 4: Fill-in-the-blank Controller ---
function initFillblank() {
  state.fillblank.currentIdx = 0;
  state.fillblank.selectedAnswers = Array(8).fill(null);
  
  elements.btnFillblankHint.onclick = toggleFillblankHint;
  elements.btnClearFillblank.onclick = clearFillblankAnswer;
  elements.btnPrevFillblank.onclick = () => navigateFillblank(-1);
  elements.btnNextFillblank.onclick = () => navigateFillblank(1);
  elements.btnSubmitFillblank.onclick = checkFillblankAnswer;
  
  renderFillblankQuestion();
}

function renderFillblankQuestion() {
  const currentQ = lessonData.fill_in_the_blanks[state.fillblank.currentIdx];
  
  // Hide hint text initially
  elements.fillblankHintText.classList.add('hide');
  elements.fillblankHintText.innerText = currentQ.hint;
  elements.btnFillblankHint.innerText = 'ð¡ é¡¯ç¤ºæç¤º';
  
  // Render question text
  elements.fillblankQuestion.innerText = currentQ.question;
  elements.fillblankCurrentIdx.innerText = state.fillblank.currentIdx + 1;
  
  // Progress bar
  const progressPercent = ((state.fillblank.currentIdx + 1) / 8) * 100;
  elements.fillblankProgress.style.width = `${progressPercent}%`;
  
  // Navigation arrows status
  elements.btnPrevFillblank.disabled = state.fillblank.currentIdx === 0;
  elements.btnNextFillblank.disabled = state.fillblank.selectedAnswers[state.fillblank.currentIdx] === null || state.fillblank.currentIdx === 7;
  
  // Render Word Bank Chips
  elements.fillblankWordBank.innerHTML = '';
  // Shuffle words for bank once, or show all 8 words
  const words = [...answerKeys.fillblank];
  words.forEach(word => {
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    
    // If word is selected as answer for current question
    const isSelectedForCurrent = state.fillblank.selectedAnswers[state.fillblank.currentIdx] === word;
    // If word is already used for OTHER questions (optional: we let them reuse, or mark them as used)
    const isUsedElsewhere = state.fillblank.selectedAnswers.some((ans, idx) => ans === word && idx !== state.fillblank.currentIdx);
    
    if (isSelectedForCurrent) {
      chip.classList.add('selected-chip');
    }
    
    chip.innerText = word;
    chip.addEventListener('click', () => selectFillblankWord(word));
    elements.fillblankWordBank.appendChild(chip);
  });
  
  // Fill answer slot
  const currentAnswer = state.fillblank.selectedAnswers[state.fillblank.currentIdx];
  if (currentAnswer) {
    elements.fillblankAnswerSlot.innerText = currentAnswer;
    elements.fillblankAnswerSlot.classList.add('filled');
  } else {
    elements.fillblankAnswerSlot.innerText = 'é»æä¸æ¹è©å¡å¡«å¥';
    elements.fillblankAnswerSlot.classList.remove('filled');
  }
}

function selectFillblankWord(word) {
  state.fillblank.selectedAnswers[state.fillblank.currentIdx] = word;
  speakText(word);
  renderFillblankQuestion();
}

function clearFillblankAnswer() {
  state.fillblank.selectedAnswers[state.fillblank.currentIdx] = null;
  renderFillblankQuestion();
}

function toggleFillblankHint() {
  const isHidden = elements.fillblankHintText.classList.contains('hide');
  if (isHidden) {
    elements.fillblankHintText.classList.remove('hide');
    elements.btnFillblankHint.innerText = 'ð æ¶åæç¤º';
    const hint = elements.fillblankHintText.innerText;
    speakText(hint);
  } else {
    elements.fillblankHintText.classList.add('hide');
    elements.btnFillblankHint.innerText = 'ð¡ é¡¯ç¤ºæç¤º';
    stopSpeaking();
  }
}

function navigateFillblank(direction) {
  state.fillblank.currentIdx = Math.min(7, Math.max(0, state.fillblank.currentIdx + direction));
  renderFillblankQuestion();
}

function checkFillblankAnswer() {
  const currentQIdx = state.fillblank.currentIdx;
  const userAnswer = state.fillblank.selectedAnswers[currentQIdx];
  const correctAnswer = answerKeys.fillblank[currentQIdx];
  
  if (!userAnswer) {
    alert("è«åå¾ä¸æ¹èªè©éè¡é¸åä¸åè©çåï¼");
    return;
  }
  
  if (userAnswer === correctAnswer) {
    playSound('correct');
    triggerConfetti();
    
    // Highlight answer slot
    elements.fillblankAnswerSlot.style.borderColor = 'var(--success-color)';
    elements.fillblankAnswerSlot.style.background = 'rgba(82, 183, 136, 0.1)';
    
    // Wait and advance
    setTimeout(() => {
      elements.fillblankAnswerSlot.style.borderColor = '';
      elements.fillblankAnswerSlot.style.background = '';
      
      if (currentQIdx < 7) {
        state.fillblank.currentIdx++;
        renderFillblankQuestion();
      } else {
        playSound('victory');
        showSummary("å¤ªæ£äºï¼å¡«åå¤§ææ° 8 é¡å¨é¨å®æäºï¼");
      }
    }, 1200);
  } else {
    playSound('wrong');
    elements.fillblankAnswerSlot.style.borderColor = 'var(--danger-color)';
    elements.fillblankAnswerSlot.style.background = 'rgba(230, 57, 70, 0.08)';
    elements.fillblankAnswerSlot.classList.add('incorrect');
    
    setTimeout(() => {
      elements.fillblankAnswerSlot.style.borderColor = '';
      elements.fillblankAnswerSlot.style.background = '';
      elements.fillblankAnswerSlot.classList.remove('incorrect');
    }, 600);
  }
}

// --- Module 5: Quiz Controller ---
function initQuiz() {
  state.quiz.mode = 'concept';
  state.quiz.conceptIdx = 0;
  state.quiz.comprehensionIdx = 0;
  state.quiz.conceptAnswers = Array(16).fill(null);
  state.quiz.comprehensionAnswers = Array(21).fill(null);
  
  // Modes switching
  elements.btnQuizModeConcept.onclick = () => setQuizMode('concept');
  elements.btnQuizModeComprehension.onclick = () => setQuizMode('comprehension');
  
  elements.btnQuizHint.onclick = toggleQuizHint;
  elements.btnPrevQuiz.onclick = () => navigateQuiz(-1);
  elements.btnNextQuiz.onclick = () => navigateQuiz(1);
  
  renderQuizQuestion();
}

function setQuizMode(mode) {
  state.quiz.mode = mode;
  stopSpeaking();
  
  if (mode === 'concept') {
    elements.btnQuizModeConcept.classList.add('active');
    elements.btnQuizModeComprehension.classList.remove('active');
    elements.quizTitle.innerText = 'ð èªè©æ¦å¿µé¸æé¡';
  } else {
    elements.btnQuizModeConcept.classList.remove('active');
    elements.btnQuizModeComprehension.classList.add('active');
    elements.quizTitle.innerText = 'ð é±è®çè§£é¸æé¡';
  }
  
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const isConcept = state.quiz.mode === 'concept';
  const currentIdx = isConcept ? state.quiz.conceptIdx : state.quiz.comprehensionIdx;
  const totalCount = isConcept ? 16 : 21;
  
  elements.quizCurrentIdx.innerText = currentIdx + 1;
  elements.quizTotalCount.innerText = totalCount;
  
  // Reset UI
  elements.quizFeedback.classList.add('hide');
  elements.quizHintText.classList.add('hide');
  elements.btnQuizHint.innerText = 'ð¡ é¡¯ç¤ºæç¤º';
  
  // Get Question data
  let questionData = null;
  if (isConcept) {
    // Combine 8 blank MCQs and 8 concept MCQs
    if (currentIdx < 8) {
      questionData = lessonData.mcqs_blank[currentIdx];
      elements.quizSectionTag.classList.remove('hide');
      elements.quizSectionTag.innerText = 'ãæç©ºå¡«åé¸æã';
    } else {
      questionData = lessonData.mcqs_concept[currentIdx - 8];
      elements.quizSectionTag.classList.remove('hide');
      elements.quizSectionTag.innerText = 'ãèªè©æ¦å¿µé¸æã';
    }
  } else {
    questionData = lessonData.reading_comprehension[currentIdx];
    if (questionData.section) {
      elements.quizSectionTag.classList.remove('hide');
      elements.quizSectionTag.innerText = questionData.section;
    } else {
      elements.quizSectionTag.classList.add('hide');
    }
  }
  
  elements.quizQuestion.innerText = questionData.question;
  
  // Hint container display
  if (questionData.hint) {
    elements.quizHintContainer.classList.remove('hide');
    elements.quizHintText.innerText = questionData.hint;
  } else {
    elements.quizHintContainer.classList.add('hide');
  }
  
  // Render options
  elements.quizOptionsContainer.innerHTML = '';
  
  const selectedAnswer = isConcept ? state.quiz.conceptAnswers[currentIdx] : state.quiz.comprehensionAnswers[currentIdx];
  const correctAnswer = getCorrectAnswerText(isConcept, currentIdx);
  
  questionData.options.forEach((optText, oIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `<span style="color: var(--primary-color); margin-right: 12px; font-size: 1.3rem;">(${['A', 'B', 'C', 'D'][oIdx]})</span> ${optText}`;
    
    // If question has already been answered
    if (selectedAnswer !== null) {
      btn.disabled = true;
      if (optText === correctAnswer) {
        btn.classList.add('correct-choice');
      } else if (optText === selectedAnswer) {
        btn.classList.add('wrong-choice');
      }
    } else {
      btn.addEventListener('click', () => handleQuizAnswer(optText, correctAnswer, btn));
    }
    
    elements.quizOptionsContainer.appendChild(btn);
  });
  
  // Show feedback if already answered
  if (selectedAnswer !== null) {
    showQuizFeedback(selectedAnswer === correctAnswer, correctAnswer);
  }
  
  // Arrows
  elements.btnPrevQuiz.disabled = currentIdx === 0;
  elements.btnNextQuiz.disabled = currentIdx === totalCount - 1 || selectedAnswer === null;
}

function getCorrectAnswerText(isConcept, idx) {
  if (isConcept) {
    if (idx < 8) {
      return answerKeys.blank[idx];
    } else {
      return answerKeys.concept[idx - 8];
    }
  } else {
    return answerKeys.comprehension[idx];
  }
}

function handleQuizAnswer(optText, correctAnswer, btnEl) {
  const isConcept = state.quiz.mode === 'concept';
  const currentIdx = isConcept ? state.quiz.conceptIdx : state.quiz.comprehensionIdx;
  
  // Save answer
  if (isConcept) {
    state.quiz.conceptAnswers[currentIdx] = optText;
  } else {
    state.quiz.comprehensionAnswers[currentIdx] = optText;
  }
  
  const isCorrect = optText === correctAnswer;
  
  // Visual effects
  const allButtons = elements.quizOptionsContainer.querySelectorAll('.quiz-option-btn');
  allButtons.forEach(btn => {
    btn.disabled = true;
    const text = btn.innerText.substring(4).strip(); // Remove (A) etc.
    const cleanOpt = optText.trim();
    const cleanCorrect = correctAnswer.trim();
    
    // Clean string compare helper
    const btnCleanText = btn.textContent.replace(/^\([A-D]\)\s*/, '').trim();
    if (btnCleanText === cleanCorrect) {
      btn.classList.add('correct-choice');
    } else if (btnCleanText === cleanOpt && !isCorrect) {
      btn.classList.add('wrong-choice');
    }
  });
  
  if (isCorrect) {
    playSound('correct');
    triggerConfetti();
  } else {
    playSound('wrong');
  }
  
  showQuizFeedback(isCorrect, correctAnswer);
  
  // Update arrow buttons
  const totalCount = isConcept ? 16 : 21;
  elements.btnNextQuiz.disabled = currentIdx === totalCount - 1;
}

function showQuizFeedback(isCorrect, correctAnswer) {
  elements.quizFeedback.classList.remove('hide');
  if (isCorrect) {
    elements.quizFeedback.className = 'quiz-feedback-box correct-feedback';
    elements.quizFeedbackIcon.innerText = 'âï¸';
    elements.quizFeedbackText.innerText = 'åç­æ­£ç¢ºï¼ä½ å¤ªæ£äºï¼';
  } else {
    elements.quizFeedback.className = 'quiz-feedback-box wrong-feedback';
    elements.quizFeedbackIcon.innerText = 'â';
    elements.quizFeedbackText.innerText = `ç­é¯åï¼æ­£ç¢ºç­æ¡æ¯ã${correctAnswer}ããåæ¥åå²ï¼`;
  }
  
  speakText(elements.quizFeedbackText.innerText);
}

function toggleQuizHint() {
  const isHidden = elements.quizHintText.classList.contains('hide');
  if (isHidden) {
    elements.quizHintText.classList.remove('hide');
    elements.btnQuizHint.innerText = 'ð æ¶åæç¤º';
    speakText(elements.quizHintText.innerText);
  } else {
    elements.quizHintText.classList.add('hide');
    elements.btnQuizHint.innerText = 'ð¡ é¡¯ç¤ºæç¤º';
    stopSpeaking();
  }
}

function navigateQuiz(direction) {
  const isConcept = state.quiz.mode === 'concept';
  if (isConcept) {
    state.quiz.conceptIdx = Math.min(15, Math.max(0, state.quiz.conceptIdx + direction));
  } else {
    state.quiz.comprehensionIdx = Math.min(20, Math.max(0, state.quiz.comprehensionIdx + direction));
  }
  
  renderQuizQuestion();
  
  // Check if completed last question
  const currentIdx = isConcept ? state.quiz.conceptIdx : state.quiz.comprehensionIdx;
  const totalCount = isConcept ? 16 : 21;
  const answers = isConcept ? state.quiz.conceptAnswers : state.quiz.comprehensionAnswers;
  
  // If we just completed the last question, show victory
  if (direction === 1 && currentIdx === totalCount - 1 && answers[currentIdx] !== null) {
    // Check if ALL questions in this mode are completed
    const allAnswered = answers.every(ans => ans !== null);
    if (allAnswered) {
      setTimeout(() => {
        playSound('victory');
        triggerConfetti();
        showSummary(isConcept ? "å¤ªç¥å¥äºï¼ä½ å®æäº 16 é¡èªè©æ¦å¿µå¤§è³½ï¼" : "æ­åééï¼ä½ å®æäº 21 é¡èª²æçè§£å¤§ææ°ï¼");
      }, 1000);
    }
  }
}

// --- Module 6: Summary Modal (Victory Overlay) ---
function setupSummaryModal() {
  elements.btnCloseModal.onclick = () => {
    elements.summaryModal.classList.add('hide');
    // Reload active tab state
    if (state.currentTab === 'matching') initMatchingGame();
    if (state.currentTab === 'fillblank') initFillblank();
    if (state.currentTab === 'quiz') initQuiz();
  };
}

function showSummary(message) {
  elements.summaryModal.classList.remove('hide');
  elements.summaryModalText.innerText = message;
}

// Helper to strip whitespaces
String.prototype.strip = function() {
  return this.replace(/^\s+|\s+$/g, '');
};
