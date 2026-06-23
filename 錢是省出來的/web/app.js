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
    comprehensionAnswers: Array(21).fill(null),
    shuffledOptions: []
  }
};

// --- Static Vocab Definitions for Common Words ---
const commonVocabDetails = {
  "口袋": { zhuyin: "ㄎㄡˇ ㄉㄞˋ", definition: "衣服上裝東西的小袋子。", example: "阿公的手帕放在長褲的口袋裡。" },
  "柔軟": { zhuyin: "ㄖㄨㄢˇ ㄖㄨㄛˊ", definition: "摸起來軟軟的、很舒服，一點也不堅硬。", example: "這條洗乾淨的手帕摸起來非常柔軟。" },
  "衛生紙": { zhuyin: "ㄨㄟˋ ㄕㄥ  ㄓˇ", definition: "擦乾淨髒汙或鼻涕用的薄紙張。", example: "我們可以用手帕來省下很多衛生紙。" },
  "節儉": { zhuyin: "ㄐㄧㄝˊ ㄐㄧㄢˇ", definition: "不亂花錢，懂得省錢與珍惜東西。", example: "阿公非常節儉，一塊肥皂可以用好幾年。" },
  "毛巾": { zhuyin: "ㄇㄠˊ ㄐㄧㄣ", definition: "用來擦乾臉上或身上水分的吸水棉布。", example: "阿公的洗臉毛巾用到破爛了才肯換新的。" },
  "肥皂": { zhuyin: "ㄈㄟˊ ㄗㄠˋ", definition: "洗手或洗澡時用來洗掉髒汙、清潔身體的香皂。", example: "浴室裡放著一塊黑色的黑砂糖肥皂。" },
  "漂亮": { zhuyin: "ㄆㄧㄠˋ ㄌㄧㄤˋ", definition: "好看、美麗，讓人感覺很欣賞、很喜歡的樣子。", example: "阿媽的衣櫃裡有很多包裝漂亮的昂貴香皂。" },
  "衣服": { zhuyin: "ㄧ  ㄈㄨˊ", definition: "穿在身上用來保暖和遮蔽身體的衣物。", example: "我是家裡的老大，小時候常穿哥哥留下來的衣服。" },
  "失望": { zhuyin: "ㄕ  ㄨㄤˋ", definition: "希望的事情沒有達成，心裡覺得難過、氣餒。", example: "小明沒有拿到玩具，臉上露出失望的表情。" },
  "修理": { zhuyin: "ㄒㄧㄡ  ㄌㄧˇ", definition: "把壞掉、磨損的東西補好，讓它能再次使用。", example: "拖鞋開口笑了，大人用強力膠把它修理好。" },
  "長大": { zhuyin: "ㄓㄤˇ ㄉㄚˋ", definition: "身體長高、年紀變大，變成大人的過程。", example: "等我長大以後，市面上開始流行三層衛生紙。" },
  "浪費": { zhuyin: "ㄌㄤˋ ㄈㄟˋ", definition: "不珍惜東西，亂花錢或隨便丟棄還能用的物品。", example: "衛生紙一次抽太多是浪費的行為。" }
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
  0: ["口袋", "柔軟"],
  1: ["衛生紙", "節儉", "毛巾", "山窮水盡"],
  2: ["肥皂", "高雅", "漂亮", "土裡土氣"],
  3: ["衣服", "克己", "將就"],
  4: ["修理", "開口笑", "自卑"],
  5: ["長大", "浪費"],
  6: ["不合時宜", "失望"]
};

// --- Answers Database mapping ---
const answerKeys = {
  fillblank: ["山窮水盡", "高雅", "土裡土氣", "克己", "將就", "開口笑", "自卑", "不合時宜"],
  concept: ["自卑", "開口笑", "不合時宜", "山窮水盡", "將就", "克己", "土裡土氣", "高雅"],
  blank: ["開口笑", "高雅", "自卑", "將就", "不合時宜", "克己", "山窮水盡", "土裡土氣"],
  comprehension: [
    "手帕", "他的手帕", "摸起來特別柔軟", "因為手帕和鈔票常放在同一個口袋",
    "衛生紙", "破爛到隨便一扯就掉下來",
    "糖廠的福利社", "蜂王黑砂糖香皂", "佳美香皂", "因為怕被阿公念",
    "交代家人幫他改褲頭", "拿塊廢布從裡面補上", "因為大人生活克己儉省，都讓小孩穿舊衣服", "一條紅短褲", "因為過幾年還可以留給弟弟穿",
    "竹片和鐵絲", "鞋底從前面脫落下來裂開了", "用強力膠黏回去並壓在重物下", "覺得很自卑",
    "因為會想到阿公節儉的眼神，覺得太浪費", "並不討厭"
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
    const sentences = paraText.split(/(?<=[。！？])/g).filter(s => s.trim().length > 0);
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
    readParaBtn.innerHTML = '<span>🔊</span> 讀此段';
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
    elements.readerVisualAids.innerHTML = '<p style="grid-column: span 3; text-align: center; color: var(--text-light);">本段無新詞彙</p>';
    elements.vocabDetailBox.classList.add('hide');
    return;
  }
  
  vocabs.forEach(word => {
    const card = document.createElement('div');
    card.className = 'visual-aid-thumb';
    card.innerHTML = `
      <img src="images/${word}.png" onerror="this.src='images/肥皂.png'" alt="${word}">
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
    elements.vocabDetailImg.onerror = function() { this.src = 'images/肥皂.png'; };
    elements.vocabDetailDef.innerHTML = `<strong>詞義：</strong>${info.definition}`;
    
    if (info.example_sentence || info.example) {
      elements.vocabDetailExample.classList.remove('hide');
      elements.vocabDetailExample.innerHTML = `<strong>例句：</strong>${info.example_sentence || info.example}`;
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
          <div class="card-hint-click">🖱️ 點選看詞義</div>
        </div>
        <!-- Back -->
        <div class="flip-card-back">
          <div class="card-word-title">${v.word}</div>
          <img class="card-back-img" src="images/${v.word}.png" onerror="this.src='images/肥皂.png'" alt="${v.word}">
          <div class="card-def-text"><strong>解釋：</strong>${v.definition}</div>
          <div class="card-example-text"><strong>例句：</strong>${v.example_sentence}</div>
          <button class="card-speak-btn" title="聽發音">🔊</button>
        </div>
      </div>
    `;
    
    // Flip Card Click Action
    cardContainer.addEventListener('click', (e) => {
      // If clicked the speak button on the back
      if (e.target.classList.contains('card-speak-btn')) {
        e.stopPropagation();
        speakText(`${v.word}。解釋：${v.definition}。例句：${v.example_sentence}`);
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
    card.innerHTML = `<img src="images/${word}.png" onerror="this.src='images/肥皂.png'" alt="${word}">`;
    
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
          showSummary("你太厲害了！配對遊戲全部答對！");
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
  elements.btnFillblankHint.innerText = '💡 顯示提示';
  
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
    elements.fillblankAnswerSlot.innerText = '點擊下方詞卡填入';
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
    elements.btnFillblankHint.innerText = '📖 收合提示';
    const hint = elements.fillblankHintText.innerText;
    speakText(hint);
  } else {
    elements.fillblankHintText.classList.add('hide');
    elements.btnFillblankHint.innerText = '💡 顯示提示';
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
    alert("請先從下方語詞銀行選取一個詞牌喔！");
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
        showSummary("太棒了！填充大挑戰 8 題全部完成了！");
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
    elements.quizTitle.innerText = '📊 語詞概念選擇題';
  } else {
    elements.btnQuizModeConcept.classList.remove('active');
    elements.btnQuizModeComprehension.classList.add('active');
    elements.quizTitle.innerText = '📖 閱讀理解選擇題';
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
  elements.btnQuizHint.innerText = '💡 顯示提示';
  
  // Get Question data
  let questionData = null;
  if (isConcept) {
    // Combine 8 blank MCQs and 8 concept MCQs
    if (currentIdx < 8) {
      questionData = lessonData.mcqs_blank[currentIdx];
      elements.quizSectionTag.classList.remove('hide');
      elements.quizSectionTag.innerText = '【挖空填充選擇】';
    } else {
      questionData = lessonData.mcqs_concept[currentIdx - 8];
      elements.quizSectionTag.classList.remove('hide');
      elements.quizSectionTag.innerText = '【語詞概念選擇】';
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
    elements.quizFeedbackIcon.innerText = '✔️';
    elements.quizFeedbackText.innerText = '回答正確！你太棒了！';
  } else {
    elements.quizFeedback.className = 'quiz-feedback-box wrong-feedback';
    elements.quizFeedbackIcon.innerText = '❌';
    elements.quizFeedbackText.innerText = `答錯囉，正確答案是【${correctAnswer}】。再接再厲！`;
  }
  
  speakText(elements.quizFeedbackText.innerText);
}

function toggleQuizHint() {
  const isHidden = elements.quizHintText.classList.contains('hide');
  if (isHidden) {
    elements.quizHintText.classList.remove('hide');
    elements.btnQuizHint.innerText = '📖 收合提示';
    speakText(elements.quizHintText.innerText);
  } else {
    elements.quizHintText.classList.add('hide');
    elements.btnQuizHint.innerText = '💡 顯示提示';
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
        showSummary(isConcept ? "太神奇了！你完成了 16 題語詞概念大賽！" : "恭喜通關！你完成了 21 題課文理解大挑戰！");
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
