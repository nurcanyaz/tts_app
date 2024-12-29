const textarea = document.querySelector("textarea"),
languageSelect = document.querySelector(".language-select"),
voiceSelect = document.querySelector(".voice-select"),
speedInput = document.querySelector(".speed-input"),
speedValue = document.querySelector(".speed-value"),
pitchInput = document.querySelector(".pitch-input"),
pitchValue = document.querySelector(".pitch-value"),
convertBtn = document.querySelector(".convert-btn"),
conversionForm = document.getElementById("conversion-form"),
conversionResult = document.getElementById("conversion-result"),
languageButtons = document.querySelector(".language-buttons");

let synth = window.speechSynthesis;
let voices = [];
let currentUtterance = null;
let wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#A8A8A8',
    progressColor: '#6C63FF',
    cursorColor: '#6C63FF',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 100,
    barGap: 3,
    responsive: true,
    normalize: true
});

// URL'den dil kodunu al
function getLanguageFromURL() {
    const path = window.location.pathname.substring(1); // Remove leading slash
    return path || 'en-US'; // Default to English if no language specified
}

// Sesleri yükle
function loadVoices() {
    voices = synth.getVoices();
    
    // Dilleri grupla
    const languageGroups = {};
    voices.forEach(voice => {
        if (!languageGroups[voice.lang]) {
            languageGroups[voice.lang] = voice.lang;
        }
    });
    
    // Dil seçeneklerini oluştur
    languageSelect.innerHTML = Object.keys(languageGroups)
        .sort()
        .map(lang => {
            const langName = new Intl.DisplayNames(['en'], {type: 'language'}).of(lang.split('-')[0]);
            const countryCode = lang.split('-')[1];
            const countryName = countryCode ? new Intl.DisplayNames(['en'], {type: 'region'}).of(countryCode) : '';
            return `<option value="${lang}">${langName}${countryName ? ` (${countryName})` : ''}</option>`;
        })
        .join('');

    // Popüler dil butonlarını oluştur
    createLanguageButtons(languageGroups);
    
    // URL'den dili al ve seç
    const urlLanguage = getLanguageFromURL();
    const matchingLang = Object.keys(languageGroups).find(lang => 
        lang.toLowerCase().startsWith(urlLanguage.toLowerCase())
    );
    if (matchingLang) {
        languageSelect.value = matchingLang;
    }
    
    updateVoices();
}

// Popüler dil butonlarını oluştur
function createLanguageButtons(languageGroups) {
    // Mevcut dilleri al ve formatla
    const availableLanguages = Object.keys(languageGroups).map(langCode => {
        const baseLang = langCode.split('-')[0];
        const langName = new Intl.DisplayNames(['en'], {type: 'language'}).of(baseLang);
        
        // Dil için uygun bayrak emojisini belirle
        const countryCode = langCode.split('-')[1] || baseLang.toUpperCase();
        const flagEmoji = getFlagEmoji(countryCode);
        
        return {
            code: baseLang,
            name: langName,
            icon: flagEmoji,
            fullCode: langCode
        };
    });

    // Benzersiz dilleri filtrele (aynı dil koduna sahip olanlardan ilkini al)
    const uniqueLanguages = Array.from(
        new Map(availableLanguages.map(lang => [lang.code, lang])).values()
    );

    // Dil butonlarını oluştur
    languageButtons.innerHTML = uniqueLanguages
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(lang => `
            <a href="/${lang.code}" class="language-button ${getLanguageFromURL() === lang.code ? 'active' : ''}">
                <span>${lang.icon}</span>
                ${lang.name}
            </a>
        `)
        .join('');
}

// Bayrak emojisi oluşturmak için yardımcı fonksiyon
function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Dil değiştiğinde sesleri güncelle
function updateVoices() {
    const selectedLang = languageSelect.value;
    const availableVoices = voices.filter(voice => voice.lang.startsWith(selectedLang.split('-')[0]));
    
    // Sesleri direkt olarak listele (grupsuz)
    voiceSelect.innerHTML = availableVoices
        .map(voice => `<option value="${voice.name}">${voice.name}</option>`)
        .join('');
    
    // Eğer ses seçeneği yoksa bilgi mesajı göster
    if (voiceSelect.options.length === 0) {
        voiceSelect.innerHTML = '<option value="">No voices available for this language</option>';
    }
}

// Sayfa yüklendiğinde ve sesler hazır olduğunda sesleri yükle
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Dil değiştiğinde sesleri güncelle
languageSelect.addEventListener('change', updateVoices);

// Hız değeri değiştiğinde göstergeyi güncelle
speedInput.addEventListener('input', function() {
    speedValue.textContent = this.value + 'x';
});

// Pitch değeri değiştiğinde göstergeyi güncelle
pitchInput.addEventListener('input', function() {
    pitchValue.textContent = this.value + 'x';
});

// Karakter sayacını güncelle
textarea.addEventListener("input", function() {
    const maxChars = 1000;
    const remainingChars = maxChars - this.value.length;
    document.querySelector(".character-info span").textContent = remainingChars;
});

// Dönüştürme işlemi
convertBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
        alert("Please enter some text!");
        return;
    }

    try {
        // Form verilerini hazırla
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', languageSelect.value);
        formData.append('voice', voiceSelect.value);
        formData.append('speed', speedInput.value);
        formData.append('pitch', pitchInput.value);

        // Dönüştürme isteğini gönder
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Conversion failed');
        }

        // Ses dosyasını al
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Sonuç ekranını göster
        conversionForm.style.display = "none";
        conversionResult.style.display = "block";

        // WaveSurfer ile ses dalgasını göster
        wavesurfer.load(audioUrl);

        // Download butonu için URL'i sakla
        document.querySelector('.download-btn').dataset.audioUrl = audioUrl;

    } catch (error) {
        console.error('Error during conversion:', error);
        alert('An error occurred during conversion. Please try again.');
    }
});

// Audio playback controls
const playBtn = document.querySelector('.play-btn');
const currentTimeSpan = document.querySelector('.current-time');
const durationSpan = document.querySelector('.duration');
let isPlaying = false;

// Update time displays
wavesurfer.on('audioprocess', function() {
    updateTime();
});

wavesurfer.on('ready', function() {
    updateTime();
    playBtn.style.display = 'block';
});

wavesurfer.on('finish', function() {
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    isPlaying = false;
});

// Play/Pause
playBtn.addEventListener('click', function() {
    wavesurfer.playPause();
    isPlaying = !isPlaying;
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
});

// Format time
function formatTime(seconds) {
    seconds = Math.floor(seconds);
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// Update time displays
function updateTime() {
    let current = wavesurfer.getCurrentTime();
    let duration = wavesurfer.getDuration();
    currentTimeSpan.textContent = formatTime(current);
    durationSpan.textContent = formatTime(duration);
}

// Download button functionality
document.querySelector('.download-btn').addEventListener('click', function() {
    const audioUrl = this.dataset.audioUrl;
    if (audioUrl) {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = 'voice_' + Date.now() + '.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
