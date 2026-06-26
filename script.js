// ================================================================
// Notification Studio – Hauptlogik
// Live-Vorschau, Tag-Bearbeitung, Code-Generierung
// ================================================================

// --- DOM-Referenzen ---
const previewContainer = document.getElementById('previewContainer');
const previewNotification = document.getElementById('previewNotification');
const textInput = document.getElementById('textInput'); // versteckt
const tagList = document.getElementById('tagList');

// Einstellungen
const senderInput = document.getElementById('senderInput');
const posInput = document.getElementById('posInput');
const durationInput = document.getElementById('durationInput');
const imageIdInput = document.getElementById('imageIdInput');
const bgColorInput = document.getElementById('bgColorInput');
const transparencyInput = document.getElementById('transparencyInput');
const anonInput = document.getElementById('anonInput');
const countdownInput = document.getElementById('countdownInput');
const strokeEnabled = document.getElementById('strokeEnabled');
const strokeColor = document.getElementById('strokeColor');
const strokeThick = document.getElementById('strokeThick');
const textStrokeEnabled = document.getElementById('textStrokeEnabled');
const textStrokeColor = document.getElementById('textStrokeColor');
const textStrokeThick = document.getElementById('textStrokeThick');
const targetSelect = document.getElementById('targetSelect');
const playersInput = document.getElementById('playersInput');

// Code-Outputs
const luaOutput = document.getElementById('luaOutput');
const consoleOutput = document.getElementById('consoleOutput');
const jsonOutput = document.getElementById('jsonOutput');

// --- State ---
let currentText = 'Willkommen &wave:&displayname&&!'; // Standard

// --- Hilfsfunktionen: Tags parsen (rekursiv) ---
function parseTags(text) {
    const placeholders = {
        '&displayname&': '<span style="color:#ffaa00; font-weight:bold;">[Displayname]</span>',
        '&playername&': '<span style="color:#ffaa00; font-weight:bold;">[Username]</span>',
        '&countdown&': '<span style="color:#ff6666; font-weight:bold;">[Countdown]</span>'
    };
    for (let [key, val] of Object.entries(placeholders)) {
        text = text.replaceAll(key, val);
    }
    let previous;
    do {
        previous = text;
        text = text.replace(/&(\w+):([^&]*)&/g, (match, tag, content) => {
            return applyTag(tag, content);
        });
    } while (text !== previous);
    return text;
}

function applyTag(tag, content) {
    switch(tag) {
        case 'bold': return `<strong>${content}</strong>`;
        case 'italic': return `<em>${content}</em>`;
        case 'underline': return `<u>${content}</u>`;
        case 'strikethrough': return `<del>${content}</del>`;
        case 'color': {
            const parts = content.split(':');
            if (parts.length >= 1) {
                const color = parts[0];
                const text = parts.slice(1).join(':');
                return `<span style="color:#${color};">${text}</span>`;
            }
            return content;
        }
        case 'gradient': {
            const parts = content.split(':');
            if (parts.length >= 2) {
                const c1 = parts[0], c2 = parts[1];
                const text = parts.slice(2).join(':');
                return `<span class="gradient-text" style="background:linear-gradient(90deg,#${c1},#${c2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${text}</span>`;
            }
            return content;
        }
        case 'rainbow': return `<span class="rainbow-text">${content}</span>`;
        case 'shake': return `<span class="shake">${content}</span>`;
        case 'jump': return `<span class="jump">${content}</span>`;
        case 'wave': return `<span class="wave">${content}</span>`;
        case 'icon': {
            return `<img src="https://www.roblox.com/asset/?id=${content}" class="inline-icon" alt="icon">`;
        }
        default: return content;
    }
}

// --- Tags aus Text extrahieren ---
function extractTags(text) {
    const tags = [];
    const regex = /&(\w+):([^&]*)&/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        tags.push({ full: match[0], type: match[1], content: match[2] });
    }
    return tags;
}

// --- Tag-Liste rendern ---
function renderTagList(text) {
    const tags = extractTags(text);
    if (tags.length === 0) {
        tagList.innerHTML = '<span class="tag-list-empty">Keine Tags erkannt</span>';
        return;
    }
    let html = '';
    tags.forEach((tag, idx) => {
        let display = tag.full;
        if (tag.type === 'icon') display = `🖼️ ${tag.content}`;
        else if (tag.type === 'color') display = `🎨 #${tag.content}`;
        else if (tag.type === 'gradient') display = `🌈 Verlauf`;
        else display = `${tag.type}:${tag.content}`;
        html += `<div class="tag-item">
                    <span class="tag-name">${display}</span>
                    <span class="tag-remove" data-index="${idx}"><i class="fas fa-times"></i></span>
                </div>`;
    });
    tagList.innerHTML = html;
    // Event-Listener für Löschen
    tagList.querySelectorAll('.tag-remove').forEach(el => {
        el.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeTagByIndex(index);
        });
    });
}

// --- Tag entfernen ---
function removeTagByIndex(index) {
    const tags = extractTags(currentText);
    if (index < tags.length) {
        const toRemove = tags[index].full;
        // Ersetze das erste Vorkommen (nach Index)
        let found = 0;
        let newText = currentText.replace(/&(\w+):([^&]*)&/g, function(match) {
            if (found === index) { found++; return ''; }
            found++;
            return match;
        });
        currentText = newText;
        updateAll();
    }
}

// --- Vorschau rendern (komplette Notification) ---
function renderPreview(text) {
    const sender = senderInput.value || 'System';
    const isAnon = anonInput.checked;
    const imageId = imageIdInput.value.trim();
    const bgColor = bgColorInput.value;
    const trans = parseFloat(transparencyInput.value) || 0.25;
    const strokeEn = strokeEnabled.checked;
    const strokeCol = strokeColor.value;
    const strokeTh = parseInt(strokeThick.value) || 2;
    const textStrokeEn = textStrokeEnabled.checked;
    const textStrokeCol = textStrokeColor.value;
    const textStrokeTh = parseInt(textStrokeThick.value) || 2;
    const isCountdown = countdownInput.checked;
    const duration = parseInt(durationInput.value) || 8;

    if (!text.trim()) {
        previewNotification.innerHTML = `<span class="preview-placeholder">⬅️ Klicke hier, um zu schreiben</span>`;
        previewNotification.style.cssText = '';
        return;
    }

    let parsed = parseTags(text);
    if (isCountdown) {
        parsed = parsed.replace(/\[Countdown\]/g, `<span style="color:#ff6666; font-weight:bold;">${duration}s</span>`);
    }

    let senderHtml = '';
    if (!isAnon && sender) senderHtml = `<span class="sender">${sender}</span>`;

    let iconHtml = '';
    if (imageId) {
        iconHtml = `<img src="https://www.roblox.com/asset/?id=${imageId}" class="icon-img" alt="icon">`;
    }

    const contentHtml = `
        ${iconHtml}
        <div class="content">
            ${senderHtml}
            <div class="message">${parsed}</div>
        </div>
    `;

    // Hintergrund & Rahmen
    const bgRgba = hexToRgba(bgColor, trans);
    let styles = `
        background: ${bgRgba};
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        backdrop-filter: blur(4px);
        font-size: 15px;
        line-height: 1.6;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        color: #f0f4ff;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    `;
    if (strokeEn) {
        styles += `border: ${strokeTh}px solid ${strokeCol};`;
    } else {
        styles += `border: none;`;
    }

    // Text-Outline via CSS
    let styleTag = document.getElementById('previewMessageStyle');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'previewMessageStyle';
        document.head.appendChild(styleTag);
    }
    if (textStrokeEn) {
        let shadows = [];
        for (let i = 0; i < textStrokeTh; i++) {
            const off = i + 1;
            shadows.push(`${off}px ${off}px 0 ${textStrokeCol}`);
            shadows.push(`-${off}px ${off}px 0 ${textStrokeCol}`);
            shadows.push(`${off}px -${off}px 0 ${textStrokeCol}`);
            shadows.push(`-${off}px -${off}px 0 ${textStrokeCol}`);
        }
        styleTag.textContent = `
            #previewNotification .message {
                text-shadow: ${shadows.join(', ')};
            }
        `;
    } else {
        styleTag.textContent = '';
    }

    previewNotification.innerHTML = contentHtml;
    previewNotification.style.cssText = styles;

    // --- Interaktivität in der Vorschau: Klick auf getaggte Teile ---
    // Wir machen die .message-Elemente editierbar, aber nur für den Text (nicht für Icons)
    // Wir fügen einen globalen Click-Handler für die Vorschau hinzu
}

// --- Hex zu RGBA ---
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Vorschau bearbeitbar machen (inline editing) ---
function makePreviewEditable() {
    // Wir fügen einen Event-Listener auf das .message-Element, um Klicks abzufangen
    // und den entsprechenden Tag zu bearbeiten.
    // Da wir die Vorschau dynamisch rendern, nutzen wir Event-Delegation.
    previewNotification.addEventListener('click', function(e) {
        const target = e.target.closest('.message');
        if (!target) return;
        // Prüfen, ob der geklickte Teil ein getaggtes Element ist
        // Wir suchen nach einem Elternelement, das eine Klasse wie .rainbow-text, .shake, etc. hat
        const taggedEl = target.querySelector('.rainbow-text, .shake, .jump, .wave, .gradient-text, [style*="color"]');
        if (taggedEl) {
            // Wir öffnen ein kleines Overlay zum Bearbeiten/Löschen
            const tagText = taggedEl.textContent;
            const action = confirm(`Möchtest du den Tag "${tagText}" bearbeiten? (OK = bearbeiten, Abbrechen = löschen)`);
            if (action) {
                const newText = prompt('Neuer Text für diesen Tag:', tagText);
                if (newText !== null) {
                    // Ersetze den Text innerhalb des Tags – wir müssen den gesamten Tag ersetzen
                    // Dazu müssen wir den genauen Tag im aktuellen Text finden
                    // Vereinfachung: Wir ersetzen den ersten Vorkommen des Tag-Inhalts
                    // Besser: Wir verwenden die Tag-Liste und bearbeiten den entsprechenden Tag
                    // Wir finden den Tag über den Inhalt
                    const tags = extractTags(currentText);
                    for (let t of tags) {
                        if (t.content === tagText) {
                            // Ersetze den Tag mit neuem Inhalt
                            const oldTag = t.full;
                            const newTag = `&${t.type}:${newText}&`;
                            currentText = currentText.replace(oldTag, newTag);
                            updateAll();
                            break;
                        }
                    }
                }
            } else {
                // Löschen: Tag entfernen (wir suchen den Tag über den Inhalt)
                const tags = extractTags(currentText);
                for (let i = 0; i < tags.length; i++) {
                    if (tags[i].content === tagText) {
                        removeTagByIndex(i);
                        break;
                    }
                }
            }
        } else {
            // Normales Editieren: Wir machen das .message-Element contenteditable
            // Aber nur für den Text, nicht für Icons.
            // Wir setzen ein contenteditable auf den Text, aber das ist komplex.
            // Stattdessen öffnen wir ein Prompt für den gesamten Text.
            const newText = prompt('Bearbeite den gesamten Text:', currentText);
            if (newText !== null) {
                currentText = newText;
                updateAll();
            }
        }
    });
}

// --- Code-Generierung (Lua, Console, JSON) ---
function generateCode() {
    const raw = currentText;
    const luaText = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const jsonText = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    const sender = senderInput.value.replace(/"/g, '\\"');
    const pos = posInput.value;
    const duration = parseInt(durationInput.value) || 8;
    const imageId = imageIdInput.value.trim();
    const bgColor = bgColorInput.value.replace('#', '').toUpperCase();
    const transparency = parseFloat(transparencyInput.value) || 0.25;
    const anon = anonInput.checked;
    const isCountdown = countdownInput.checked;
    const strokeEn = strokeEnabled.checked;
    const strokeCol = strokeColor.value.replace('#', '').toUpperCase();
    const strokeTh = parseInt(strokeThick.value) || 2;
    const textStrokeEn = textStrokeEnabled.checked;
    const textStrokeCol = textStrokeColor.value.replace('#', '').toUpperCase();
    const textStrokeTh = parseInt(textStrokeThick.value) || 2;

    const targetType = targetSelect.value;
    let targetLua = '"All"';
    if (targetType === 'Server') targetLua = '"Server"';
    else if (targetType === 'Specific') {
        const players = playersInput.value.trim();
        targetLua = players ? '{' + players + '}' : '"All"';
    }

    // --- LUA ---
    let luaLines = [];
    luaLines.push('local NotificationSystem = require(game:GetService("ServerScriptService"):WaitForChild("NotificationSystem"))');
    luaLines.push('');
    luaLines.push('local config = {');
    luaLines.push(`    target = ${targetLua},`);
    luaLines.push(`    sender = "${sender}",`);
    luaLines.push(`    text = "${luaText}",`);
    if (duration !== 8) luaLines.push(`    duration = ${duration},`);
    if (pos !== 'Bottom') luaLines.push(`    screenPosition = "${pos}",`);
    luaLines.push(`    anonymous = ${anon},`);
    luaLines.push(`    isCountdown = ${isCountdown},`);
    if (isCountdown) luaLines.push(`    targetTimestamp = os.time() + ${duration},`);
    if (bgColor !== '111116') luaLines.push(`    backgroundColorHex = "${bgColor}",`);
    if (transparency !== 0.25) luaLines.push(`    backgroundTransparency = ${transparency},`);
    if (strokeEn) {
        luaLines.push(`    strokeEnabled = true,`);
        if (strokeCol !== '00FFCC') luaLines.push(`    strokeColorHex = "${strokeCol}",`);
        if (strokeTh !== 2) luaLines.push(`    strokeThickness = ${strokeTh},`);
    } else {
        luaLines.push(`    strokeEnabled = false,`);
    }
    if (textStrokeEn) {
        luaLines.push(`    textStrokeEnabled = true,`);
        if (textStrokeCol !== '000000') luaLines.push(`    textStrokeColorHex = "${textStrokeCol}",`);
        if (textStrokeTh !== 2) luaLines.push(`    textStrokeThickness = ${textStrokeTh},`);
    } else {
        luaLines.push(`    textStrokeEnabled = false,`);
    }
    if (imageId) luaLines.push(`    imageId = "${imageId}",`);
    let last = luaLines[luaLines.length-1];
    if (last.endsWith(',')) luaLines[luaLines.length-1] = last.slice(0, -1);
    luaLines.push('}');
    luaLines.push('');
    luaLines.push('NotificationSystem.send(config)');
    luaLines.push('print("✅ Notification gesendet!")');
    const luaCode = luaLines.join('\n');

    // --- CONSOLE ---
    let consoleParts = [];
    consoleParts.push(`local NotificationSystem = require(game:GetService("ServerScriptService"):WaitForChild("NotificationSystem"))`);
    consoleParts.push(`NotificationSystem.send({`);
    consoleParts.push(`    target = ${targetLua},`);
    consoleParts.push(`    sender = "${sender}",`);
    consoleParts.push(`    text = "${luaText}",`);
    if (duration !== 8) consoleParts.push(`    duration = ${duration},`);
    if (pos !== 'Bottom') consoleParts.push(`    screenPosition = "${pos}",`);
    consoleParts.push(`    anonymous = ${anon},`);
    consoleParts.push(`    isCountdown = ${isCountdown},`);
    if (isCountdown) consoleParts.push(`    targetTimestamp = os.time() + ${duration},`);
    if (bgColor !== '111116') consoleParts.push(`    backgroundColorHex = "${bgColor}",`);
    if (transparency !== 0.25) consoleParts.push(`    backgroundTransparency = ${transparency},`);
    consoleParts.push(`    strokeEnabled = ${strokeEn},`);
    if (strokeCol !== '00FFCC') consoleParts.push(`    strokeColorHex = "${strokeCol}",`);
    if (strokeTh !== 2) consoleParts.push(`    strokeThickness = ${strokeTh},`);
    consoleParts.push(`    textStrokeEnabled = ${textStrokeEn},`);
    if (textStrokeCol !== '000000') consoleParts.push(`    textStrokeColorHex = "${textStrokeCol}",`);
    if (textStrokeTh !== 2) consoleParts.push(`    textStrokeThickness = ${textStrokeTh},`);
    if (imageId) consoleParts.push(`    imageId = "${imageId}",`);
    let lastConsole = consoleParts[consoleParts.length-1];
    if (lastConsole.endsWith(',')) consoleParts[consoleParts.length-1] = lastConsole.slice(0, -1);
    consoleParts.push('})');
    const consoleCode = consoleParts.join('\n');

    // --- JSON ---
    let jsonObj = {
        target: targetType === 'All' ? 'All' : (targetType === 'Server' ? 'Server' : 'Specific'),
        sender: senderInput.value,
        text: raw,
        anonymous: anon,
        isCountdown: isCountdown,
        screenPosition: pos,
        backgroundColorHex: bgColor,
        backgroundTransparency: transparency,
        strokeEnabled: strokeEn,
        strokeColorHex: strokeCol,
        strokeThickness: strokeTh,
        textStrokeEnabled: textStrokeEn,
        textStrokeColorHex: textStrokeCol,
        textStrokeThickness: textStrokeTh
    };
    if (duration !== 8) jsonObj.duration = duration;
    if (isCountdown) jsonObj.targetTimestamp = `os.time() + ${duration}`;
    if (imageId) jsonObj.imageId = imageId;
    if (targetType === 'Specific') {
        const players = playersInput.value.trim();
        if (players) jsonObj.players = players.split(',').map(s => s.trim());
    }
    Object.keys(jsonObj).forEach(k => {
        if (jsonObj[k] === undefined) delete jsonObj[k];
    });
    const jsonCode = JSON.stringify(jsonObj, null, 2);

    luaOutput.textContent = luaCode;
    consoleOutput.textContent = consoleCode;
    jsonOutput.textContent = jsonCode;
}

// --- Alles aktualisieren ---
function updateAll() {
    renderPreview(currentText);
    renderTagList(currentText);
    generateCode();
    // Textarea synchron halten (optional)
    textInput.value = currentText;
}

// --- Toolbar-Buttons: Tags einfügen ---
function setupToolbar() {
    // Effekt-Buttons
    document.querySelectorAll('.toolbar button[data-tag]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tag = this.dataset.tag;
            const selected = window.getSelection().toString();
            if (selected) {
                // Wenn Text markiert ist, diesen umschließen
                const newText = currentText.replace(selected, `&${tag}:${selected}&`);
                currentText = newText;
                updateAll();
            } else {
                // Sonst: Tag mit Platzhalter einfügen
                const placeholder = 'Text';
                const insertion = `&${tag}:${placeholder}&`;
                // Füge an Cursor-Position ein – wir verwenden einen einfachen Prompt
                const pos = prompt(`Gib den Text für den ${tag}-Tag ein:`, placeholder);
                if (pos !== null) {
                    const newText = currentText + ` &${tag}:${pos}&`;
                    currentText = newText;
                    updateAll();
                }
            }
        });
    });

    // Platzhalter-Buttons (Displayname, Countdown)
    document.querySelectorAll('.toolbar button[data-var]').forEach(btn => {
        btn.addEventListener('click', function() {
            const v = this.dataset.var;
            currentText += ' ' + v;
            updateAll();
        });
    });

    // Farbe
    document.getElementById('btnColor').addEventListener('click', function() {
        const hex = prompt('Gib eine Hex-Farbe ein (z.B. FF0000):', 'FF5555');
        if (!hex) return;
        const selected = window.getSelection().toString() || 'Text';
        const tag = `&color:${hex.replace('#','')}:${selected}&`;
        if (window.getSelection().toString()) {
            currentText = currentText.replace(selected, tag);
        } else {
            currentText += ' ' + tag;
        }
        updateAll();
    });

    // Verlauf
    document.getElementById('btnGradient').addEventListener('click', function() {
        const c1 = prompt('Startfarbe (Hex):', 'FF0000');
        if (!c1) return;
        const c2 = prompt('Endfarbe (Hex):', '00FF00');
        if (!c2) return;
        const selected = window.getSelection().toString() || 'Text';
        const tag = `&gradient:${c1.replace('#','')}:${c2.replace('#','')}:${selected}&`;
        if (window.getSelection().toString()) {
            currentText = currentText.replace(selected, tag);
        } else {
            currentText += ' ' + tag;
        }
        updateAll();
    });

    // Icon
    document.getElementById('btnIcon').addEventListener('click', function() {
        const id = prompt('Gib die Roblox Asset-ID ein:', '10845341253');
        if (!id) return;
        currentText += ` &icon:${id}&`;
        updateAll();
    });
}

// --- Ziel-Auswahl (target) ---
function setupTarget() {
    targetSelect.addEventListener('change', function() {
        const val = this.value;
        if (val === 'Specific') {
            playersInput.disabled = false;
            playersInput.style.opacity = '1';
            document.getElementById('playersLabel').style.opacity = '1';
        } else {
            playersInput.disabled = true;
            playersInput.style.opacity = '0.5';
            document.getElementById('playersLabel').style.opacity = '0.5';
        }
        updateAll();
    });
    playersInput.addEventListener('input', updateAll);
}

// --- Copy-Buttons ---
function setupCopy() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const pre = document.getElementById(targetId);
            const text = pre.textContent;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const old = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Kopiert!';
                this.style.backgroundColor = '#3aaa7a';
                setTimeout(() => {
                    this.innerHTML = old;
                    this.style.backgroundColor = '';
                }, 1200);
            }).catch(() => alert('Fehler beim Kopieren.'));
        });
    });
}

// --- Einstellungen: Alle Inputs lösen Update aus ---
function setupSettings() {
    const inputs = [
        senderInput, posInput, durationInput, imageIdInput,
        bgColorInput, transparencyInput, anonInput, countdownInput,
        strokeEnabled, strokeColor, strokeThick,
        textStrokeEnabled, textStrokeColor, textStrokeThick
    ];
    inputs.forEach(el => {
        el.addEventListener('input', updateAll);
        el.addEventListener('change', updateAll);
    });
}

// --- Initialisierung ---
function init() {
    // Standard-Text setzen
    currentText = 'Willkommen &wave:&displayname&&!';
    textInput.value = currentText;

    setupToolbar();
    setupTarget();
    setupCopy();
    setupSettings();

    // Vorschau editierbar machen
    makePreviewEditable();

    // Erstes Rendering
    updateAll();

    // Klick auf Vorschau-Container: Fokus setzen
    previewContainer.addEventListener('click', function(e) {
        // Wenn nicht auf einen Button oder Tag geklickt wurde, öffne Prompt für neuen Text
        if (!e.target.closest('.toolbar') && !e.target.closest('.tag-item')) {
            const newText = prompt('Gib deine Nachricht ein:', currentText);
            if (newText !== null) {
                currentText = newText;
                updateAll();
            }
        }
    });
}

// Starten, wenn DOM bereit
document.addEventListener('DOMContentLoaded', init);
