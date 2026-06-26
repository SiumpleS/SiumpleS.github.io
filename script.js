// =================================================================
// Notification Studio – komplette Logik mit Kontextmenü
// =================================================================

// --- DOM-Referenzen ---
const rawText = document.getElementById('rawText');
const previewContainer = document.getElementById('previewContainer');
const previewNotification = document.getElementById('previewNotification');
const contextMenu = document.getElementById('contextMenu');

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

// --- State für Kontextmenü ---
let activeSelection = null;      // { startIndex, endIndex, text, tagType, tagContent }
let activeTagElement = null;

// ------------------------------------------------------------
// PARSER – wandelt rohen Text in HTML um (rekursiv)
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// VORSCHAU RENDERN (mit Data-Attributen für Tags)
// ------------------------------------------------------------
function renderPreview() {
    const text = rawText.value;
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
        previewNotification.innerHTML = `<span class="placeholder">Gib Text ein – die Vorschau erscheint hier</span>`;
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

    // Data-Attribute für alle getaggten Elemente setzen
    const tagSelectors = '.rainbow-text, .shake, .jump, .wave, .gradient-text, [style*="color"], strong, em, u, del';
    const tagElements = previewNotification.querySelectorAll(tagSelectors);
    tagElements.forEach(el => {
        // Wir versuchen, den entsprechenden Tag im rohen Text zu finden
        const raw = rawText.value;
        const tagMatch = raw.match(/&(\w+):([^&]*)&/);
        if (tagMatch) {
            el.dataset.tagType = tagMatch[1];
            el.dataset.tagContent = tagMatch[2];
        }
        el.style.cursor = 'context-menu';
    });
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ------------------------------------------------------------
// KONTEXTMENÜ – Rechtsklick in der Vorschau
// ------------------------------------------------------------
function setupContextMenu() {
    previewContainer.addEventListener('contextmenu', function(e) {
        e.preventDefault();

        // Prüfen, ob eine Textselektion existiert
        const sel = window.getSelection();
        const selectedText = sel.toString().trim();

        // Prüfen, ob die Selektion innerhalb eines getaggten Elements liegt
        let tagElement = null;
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            let node = range.startContainer;
            while (node && node !== previewNotification) {
                if (node.nodeType === 1 && node.matches && node.matches('.rainbow-text, .shake, .jump, .wave, .gradient-text, [style*="color"], strong, em, u, del')) {
                    tagElement = node;
                    break;
                }
                node = node.parentNode;
            }
        }

        if (tagElement) {
            // Rechtsklick auf einem bestehenden Tag
            const tagType = tagElement.dataset.tagType || 'unknown';
            const tagContent = tagElement.dataset.tagContent || tagElement.textContent;
            activeTagElement = tagElement;
            activeSelection = { text: selectedText, tagType, tagContent, element: tagElement };
            // Menü anzeigen mit allen Optionen
            showContextMenu(e.clientX, e.clientY, 'tag');
        } else if (selectedText.length > 0) {
            // Rechtsklick auf markierten Text (ohne Tag)
            activeSelection = { text: selectedText, tagType: null, tagContent: null, element: null };
            showContextMenu(e.clientX, e.clientY, 'selection');
        } else {
            // Keine Selektion – nichts tun
            contextMenu.style.display = 'none';
            return;
        }
    });

    // Menü-Einträge
    document.getElementById('ctxAdd').addEventListener('click', function() {
        if (!activeSelection) return;
        if (activeSelection.element) {
            // Tag bearbeiten – wir fragen nach neuem Tag-Typ und Inhalt
            const newType = prompt('Neuer Tag-Typ (z.B. wave, shake, rainbow, bold, color, gradient, icon):', activeSelection.tagType || 'wave');
            if (newType) {
                const newContent = prompt('Neuer Inhalt für den Tag:', activeSelection.tagContent || activeSelection.text);
                if (newContent !== null) {
                    const oldTag = `&${activeSelection.tagType}:${activeSelection.tagContent}&`;
                    const newTag = `&${newType}:${newContent}&`;
                    rawText.value = rawText.value.replace(oldTag, newTag);
                    updateAll();
                }
            }
        } else {
            // Neuen Tag um die Selektion herum einfügen
            const tagType = prompt('Tag-Typ (z.B. wave, shake, rainbow, bold, color, gradient, icon):', 'wave');
            if (tagType) {
                const tag = `&${tagType}:${activeSelection.text}&`;
                // Ersetze den selektierten Text im rohen Text
                const pos = rawText.value.indexOf(activeSelection.text);
                if (pos !== -1) {
                    rawText.value = rawText.value.substring(0, pos) + tag + rawText.value.substring(pos + activeSelection.text.length);
                    updateAll();
                }
            }
        }
        contextMenu.style.display = 'none';
    });

    document.getElementById('ctxEdit').addEventListener('click', function() {
        if (!activeSelection || !activeSelection.element) return;
        const newContent = prompt('Neuen Inhalt für den Tag eingeben:', activeSelection.tagContent || activeSelection.text);
        if (newContent !== null) {
            const oldTag = `&${activeSelection.tagType}:${activeSelection.tagContent}&`;
            const newTag = `&${activeSelection.tagType}:${newContent}&`;
            rawText.value = rawText.value.replace(oldTag, newTag);
            updateAll();
        }
        contextMenu.style.display = 'none';
    });

    document.getElementById('ctxDelete').addEventListener('click', function() {
        if (!activeSelection || !activeSelection.element) return;
        const oldTag = `&${activeSelection.tagType}:${activeSelection.tagContent}&`;
        rawText.value = rawText.value.replace(oldTag, '');
        updateAll();
        contextMenu.style.display = 'none';
    });

    document.getElementById('ctxWrap').addEventListener('click', function() {
        if (!activeSelection || !activeSelection.element) return;
        // Umschließen: neuen Tag um den bestehenden herum
        const newType = prompt('Tag-Typ für die Umschließung (z.B. wave, shake, rainbow):', 'wave');
        if (newType) {
            const oldTag = `&${activeSelection.tagType}:${activeSelection.tagContent}&`;
            const newTag = `&${newType}:${oldTag}&`;
            rawText.value = rawText.value.replace(oldTag, newTag);
            updateAll();
        }
        contextMenu.style.display = 'none';
    });

    // Klick außerhalb schließt Menü
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });
}

function showContextMenu(x, y, mode) {
    // Alle Menüpunkte anzeigen, aber je nach Modus deaktivieren/aktivieren
    const add = document.getElementById('ctxAdd');
    const edit = document.getElementById('ctxEdit');
    const del = document.getElementById('ctxDelete');
    const wrap = document.getElementById('ctxWrap');

    if (mode === 'tag') {
        add.textContent = 'Tag ändern';
        edit.style.display = 'flex';
        del.style.display = 'flex';
        wrap.style.display = 'flex';
    } else {
        add.textContent = 'Tag hinzufügen';
        edit.style.display = 'none';
        del.style.display = 'none';
        wrap.style.display = 'none';
    }

    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

// ------------------------------------------------------------
// TOOLBAR – Platzhalter einfügen
// ------------------------------------------------------------
function setupToolbar() {
    document.querySelectorAll('.toolbar button[data-tag]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tag = this.dataset.tag;
            const placeholder = prompt(`Gib den Text für den ${tag}-Tag ein:`, 'Text');
            if (placeholder !== null) {
                const tagString = `&${tag}:${placeholder}&`;
                insertAtCursor(rawText, tagString);
                updateAll();
            }
        });
    });

    document.querySelectorAll('.toolbar button[data-var]').forEach(btn => {
        btn.addEventListener('click', function() {
            insertAtCursor(rawText, this.dataset.var);
            updateAll();
        });
    });

    document.getElementById('btnColor').addEventListener('click', function() {
        const hex = prompt('Hex-Farbe (z.B. FF0000):', 'FF5555');
        if (!hex) return;
        const text = prompt('Text für diese Farbe:', 'Text');
        if (text !== null) {
            insertAtCursor(rawText, ` &color:${hex.replace('#','')}:${text}&`);
            updateAll();
        }
    });

    document.getElementById('btnGradient').addEventListener('click', function() {
        const c1 = prompt('Startfarbe:', 'FF0000');
        if (!c1) return;
        const c2 = prompt('Endfarbe:', '00FF00');
        if (!c2) return;
        const text = prompt('Text für den Verlauf:', 'Text');
        if (text !== null) {
            insertAtCursor(rawText, ` &gradient:${c1.replace('#','')}:${c2.replace('#','')}:${text}&`);
            updateAll();
        }
    });

    document.getElementById('btnIcon').addEventListener('click', function() {
        const id = prompt('Roblox Asset-ID:', '10845341253');
        if (id) {
            insertAtCursor(rawText, ` &icon:${id}&`);
            updateAll();
        }
    });
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    textarea.value = val.substring(0, start) + text + val.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

// ------------------------------------------------------------
// CODE-GENERIERUNG (Lua, Console, JSON)
// ------------------------------------------------------------
function generateCode() {
    const raw = rawText.value;
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

    // Lua
    let luaLines = [];
    luaLines.push('local NotificationSystem = require(game:GetService("ServerScriptService"):WaitForChild("NotificationSystem"))');
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
    } else luaLines.push(`    strokeEnabled = false,`);
    if (textStrokeEn) {
        luaLines.push(`    textStrokeEnabled = true,`);
        if (textStrokeCol !== '000000') luaLines.push(`    textStrokeColorHex = "${textStrokeCol}",`);
        if (textStrokeTh !== 2) luaLines.push(`    textStrokeThickness = ${textStrokeTh},`);
    } else luaLines.push(`    textStrokeEnabled = false,`);
    if (imageId) luaLines.push(`    imageId = "${imageId}",`);
    let last = luaLines[luaLines.length-1];
    if (last.endsWith(',')) luaLines[luaLines.length-1] = last.slice(0, -1);
    luaLines.push('}');
    luaLines.push('NotificationSystem.send(config)');
    luaLines.push('print("✅ Gesendet!")');
    const luaCode = luaLines.join('\n');

    // Console
    let cLines = [];
    cLines.push(`local NotificationSystem = require(game:GetService("ServerScriptService"):WaitForChild("NotificationSystem"))`);
    cLines.push(`NotificationSystem.send({`);
    cLines.push(`    target = ${targetLua},`);
    cLines.push(`    sender = "${sender}",`);
    cLines.push(`    text = "${luaText}",`);
    if (duration !== 8) cLines.push(`    duration = ${duration},`);
    if (pos !== 'Bottom') cLines.push(`    screenPosition = "${pos}",`);
    cLines.push(`    anonymous = ${anon},`);
    cLines.push(`    isCountdown = ${isCountdown},`);
    if (isCountdown) cLines.push(`    targetTimestamp = os.time() + ${duration},`);
    if (bgColor !== '111116') cLines.push(`    backgroundColorHex = "${bgColor}",`);
    if (transparency !== 0.25) cLines.push(`    backgroundTransparency = ${transparency},`);
    cLines.push(`    strokeEnabled = ${strokeEn},`);
    if (strokeCol !== '00FFCC') cLines.push(`    strokeColorHex = "${strokeCol}",`);
    if (strokeTh !== 2) cLines.push(`    strokeThickness = ${strokeTh},`);
    cLines.push(`    textStrokeEnabled = ${textStrokeEn},`);
    if (textStrokeCol !== '000000') cLines.push(`    textStrokeColorHex = "${textStrokeCol}",`);
    if (textStrokeTh !== 2) cLines.push(`    textStrokeThickness = ${textStrokeTh},`);
    if (imageId) cLines.push(`    imageId = "${imageId}",`);
    let lastC = cLines[cLines.length-1];
    if (lastC.endsWith(',')) cLines[cLines.length-1] = lastC.slice(0, -1);
    cLines.push('})');
    const consoleCode = cLines.join('\n');

    // JSON
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
    if (targetType === 'Specific' && playersInput.value.trim()) {
        jsonObj.players = playersInput.value.split(',').map(s => s.trim());
    }
    Object.keys(jsonObj).forEach(k => {
        if (jsonObj[k] === undefined) delete jsonObj[k];
    });
    const jsonCode = JSON.stringify(jsonObj, null, 2);

    luaOutput.textContent = luaCode;
    consoleOutput.textContent = consoleCode;
    jsonOutput.textContent = jsonCode;
}

// ------------------------------------------------------------
// UPDATE ALLES
// ------------------------------------------------------------
function updateAll() {
    renderPreview();
    generateCode();
}

// ------------------------------------------------------------
// COPY-BUTTONS
// ------------------------------------------------------------
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
                setTimeout(() => { this.innerHTML = old; this.style.backgroundColor = ''; }, 1200);
            }).catch(() => alert('Fehler beim Kopieren.'));
        });
    });
}

// ------------------------------------------------------------
// ZIEL-AUSWAHL (target)
// ------------------------------------------------------------
function setupTarget() {
    targetSelect.addEventListener('change', function() {
        const val = this.value;
        if (val === 'Specific') {
            playersInput.disabled = false;
            playersInput.style.opacity = '1';
        } else {
            playersInput.disabled = true;
            playersInput.style.opacity = '0.5';
        }
        updateAll();
    });
    playersInput.addEventListener('input', updateAll);
}

// ------------------------------------------------------------
// EINSTELLUNGEN: alle Inputs lösen Update aus
// ------------------------------------------------------------
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
    rawText.addEventListener('input', updateAll);
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
function init() {
    setupToolbar();
    setupContextMenu();
    setupCopy();
    setupTarget();
    setupSettings();
    updateAll();
}

document.addEventListener('DOMContentLoaded', init);
