class EnhancedToolbar {
    constructor(editor) {
        this.editor = editor;
        this.buttons = {};
        this.init();
    }

    init() {
        this.createToolbar();
        this.setupEventListeners();
        this.setupDropdowns();
    }

    createToolbar() {
        const toolbar = this.editor.container.querySelector('#toolbar');
        if (!toolbar) return;

        toolbar.innerHTML = `
            <!-- Группа форматирования текста -->
            <div class="toolbar-group">
                <select class="toolbar-select format-select">
                    <option value="p">Абзац</option>
                    <option value="h1">Заголовок 1</option>
                    <option value="h2">Заголовок 2</option>
                    <option value="h3">Заголовок 3</option>
                    <option value="h4">Заголовок 4</option>
                    <option value="h5">Заголовок 5</option>
                    <option value="h6">Заголовок 6</option>
                    <option value="pre">Код</option>
                </select>
                
                <select class="toolbar-select font-family">
                    <option value="">Шрифт</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                </select>
                
                <select class="toolbar-select font-size">
                    <option value="">Размер</option>
                    <option value="12px">Мелкий</option>
                    <option value="14px">Обычный</option>
                    <option value="18px">Средний</option>
                    <option value="24px">Крупный</option>
                    <option value="32px">Огромный</option>
                </select>
            </div>

            <!-- Группа стилей текста -->
            <div class="toolbar-group">
                <button class="toolbar-btn" data-command="bold" title="Жирный (Ctrl+B)">
                    <strong>B</strong>
                </button>
                <button class="toolbar-btn" data-command="italic" title="Курсив (Ctrl+I)">
                    <em>I</em>
                </button>
                <button class="toolbar-btn" data-command="underline" title="Подчёркивание (Ctrl+U)">
                    <u>U</u>
                </button>
                <button class="toolbar-btn" data-command="strikeThrough" title="Зачёркивание">
                    <s>S</s>
                </button>
                
                <div class="dropdown">
                    <button class="toolbar-btn dropdown-toggle" title="Цвет текста">
                        🎨
                    </button>
                    <div class="dropdown-menu color-picker">
                        <div class="color-grid">
                            <div class="color-option" data-color="#000000" style="background: #000000"></div>
                            <div class="color-option" data-color="#ff0000" style="background: #ff0000"></div>
                            <div class="color-option" data-color="#00ff00" style="background: #00ff00"></div>
                            <div class="color-option" data-color="#0000ff" style="background: #0000ff"></div>
                            <div class="color-option" data-color="#ffff00" style="background: #ffff00"></div>
                            <div class="color-option" data-color="#ff00ff" style="background: #ff00ff"></div>
                            <div class="color-option" data-color="#00ffff" style="background: #00ffff"></div>
                            <div class="color-option" data-color="#ffffff" style="background: #ffffff; border: 1px solid #ccc"></div>
                        </div>
                        <input type="color" class="custom-color">
                    </div>
                </div>
            </div>

            <!-- Группа выравнивания -->
            <div class="toolbar-group">
                <button class="toolbar-btn" data-command="justifyLeft" title="По левому краю">
                    ⬅
                </button>
                <button class="toolbar-btn" data-command="justifyCenter" title="По центру">
                    ↔
                </button>
                <button class="toolbar-btn" data-command="justifyRight" title="По правому краю">
                    ➡
                </button>
                <button class="toolbar-btn" data-command="justifyFull" title="По ширине">
                    ⇄
                </button>
            </div>

            <!-- Группа списков -->
            <div class="toolbar-group">
                <button class="toolbar-btn" data-command="insertUnorderedList" title="Маркированный список">
                    • List
                </button>
                <button class="toolbar-btn" data-command="insertOrderedList" title="Нумерованный список">
                    1. List
                </button>
                <button class="toolbar-btn" data-command="outdent" title="Уменьшить отступ">
                    ←
                </button>
                <button class="toolbar-btn" data-command="indent" title="Увеличить отступ">
                    →
                </button>
            </div>

            <!-- Группа вставки -->
            <div class="toolbar-group">
                <button class="toolbar-btn" data-command="createLink" title="Вставить ссылку (Ctrl+K)">
                    🔗
                </button>
                <button class="toolbar-btn image-upload-btn" title="Вставить изображение">
                    🖼️
                </button>
                <button class="toolbar-btn" data-command="insertHorizontalRule" title="Горизонтальная линия">
                    ―
                </button>
            </div>

            <!-- Группа отмены/повтора -->
            <div class="toolbar-group">
                <button class="toolbar-btn" data-command="undo" title="Отменить (Ctrl+Z)">
                    ↶
                </button>
                <button class="toolbar-btn" data-command="redo" title="Повторить (Ctrl+Y)">
                    ↷
                </button>
                <button class="toolbar-btn" data-command="removeFormat" title="Очистить форматирование">
                    🧹
                </button>
            </div>

            <!-- Группа экспорта -->
            <div class="toolbar-group export-group">
                <button class="toolbar-btn export-html" title="Копировать HTML">
                    HTML
                </button>
                <button class="toolbar-btn export-bbcode" title="Копировать BBCode">
                    BB
                </button>
                <button class="toolbar-btn save-btn" title="Сохранить">
                    💾
                </button>
            </div>

            <!-- Переключатель режимов -->
            <div class="toolbar-group mode-switcher">
                <button class="mode-btn active" data-mode="visual">Визуальный</button>
                <button class="mode-btn" data-mode="html">HTML</button>
                <button class="mode-btn" data-mode="bbcode">BBCode</button>
            </div>
        `;

        this.cacheButtons();
    }

    cacheButtons() {
        const toolbar = this.editor.container.querySelector('#toolbar');
        this.buttons = {
            bold: toolbar.querySelector('[data-command="bold"]'),
            italic: toolbar.querySelector('[data-command="italic"]'),
            underline: toolbar.querySelector('[data-command="underline"]'),
            undo: toolbar.querySelector('[data-command="undo"]'),
            redo: toolbar.querySelector('[data-command="redo"]')
        };
    }

    setupEventListeners() {
        const toolbar = this.editor.container.querySelector('#toolbar');
        
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-command]');
            if (btn) {
                this.handleCommand(btn.dataset.command);
            }

            const modeBtn = e.target.closest('[data-mode]');
            if (modeBtn) {
                this.editor.switchMode(modeBtn.dataset.mode);
            }

            const exportBtn = e.target.closest('.export-html');
            if (exportBtn) {
                this.editor.copyToClipboard('html');
            }

            const exportBBCodeBtn = e.target.closest('.export-bbcode');
            if (exportBBCodeBtn) {
                this.editor.copyToClipboard('bbcode');
            }

            const saveBtn = e.target.closest('.save-btn');
            if (saveBtn) {
                this.editor.save();
            }

            const imageBtn = e.target.closest('.image-upload-btn');
            if (imageBtn) {
                this.handleImageUpload();
            }
        });

        toolbar.addEventListener('change', (e) => {
            const select = e.target.closest('.format-select');
            if (select) {
                this.editor.execCommand('formatBlock', select.value);
            }

            const fontFamily = e.target.closest('.font-family');
            if (fontFamily && fontFamily.value) {
                this.editor.execCommand('fontName', fontFamily.value);
            }

            const fontSize = e.target.closest('.font-size');
            if (fontSize && fontSize.value) {
                this.editor.execCommand('fontSize', fontSize.value);
            }
        });

        document.addEventListener('selectionchange', this.updateButtonStates.bind(this));
        this.editor.commandManager.on('historyChange', this.updateHistoryButtons.bind(this));
    }

    setupDropdowns() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });

        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = toggle.nextElementSibling;
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
        });

        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.editor.execCommand('foreColor', color);
                e.target.closest('.dropdown-menu').style.display = 'none';
            });
        });

        document.querySelectorAll('.custom-color').forEach(input => {
            input.addEventListener('change', (e) => {
                this.editor.execCommand('foreColor', e.target.value);
                e.target.closest('.dropdown-menu').style.display = 'none';
            });
        });
    }

    handleCommand(command) {
        switch (command) {
            case 'createLink':
                this.createLink();
                break;
            case 'insertImage':
                this.handleImageUpload();
                break;
            default:
                this.editor.execCommand(command);
        }
    }

    createLink() {
        const url = prompt('Введите URL ссылки:');
        if (url) {
            this.editor.execCommand('createLink', url);
        }
    }

    handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.editor.addImage(file, 'file');
            }
        };
        
        input.click();
    }

    updateButtonStates() {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
        commands.forEach(command => {
            const btn = this.buttons[command];
            if (btn) {
                try {
                    const isActive = document.queryCommandState(command);
                    btn.classList.toggle('active', isActive);
                } catch (e) {
                }
            }
        });

        this.updateFormatSelect();
    }

    updateFormatSelect() {
        const formatSelect = this.editor.container.querySelector('.format-select');
        if (!formatSelect) return;

        const blockElements = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'PRE', 'BLOCKQUOTE'];
        let currentBlock = 'p';
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let node = selection.anchorNode;
            while (node && node.nodeType === Node.TEXT_NODE) {
                node = node.parentNode;
            }
            
            if (node && blockElements.includes(node.tagName)) {
                currentBlock = node.tagName.toLowerCase();
            }
        }

        formatSelect.value = currentBlock;
    }

    updateHistoryButtons() {
        const { canUndo, canRedo } = this.editor.commandManager;
        
        if (this.buttons.undo) {
            this.buttons.undo.disabled = !canUndo;
        }
        if (this.buttons.redo) {
            this.buttons.redo.disabled = !canRedo;
        }
    }
}
