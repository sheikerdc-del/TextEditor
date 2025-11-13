class ImageManager {
    constructor(editor) {
        this.editor = editor;
        this.images = new Map();
        this.activeImage = null;
        this.dragState = null;
        this.resizeState = null;
        
        this.init();
    }

    init() {
        this.setupDropZone();
        this.setupPasteHandler();
        this.setupImageHandlers();
    }

    setupDropZone() {
        this.editor.visualEditor.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.editor.visualEditor.classList.add('drag-over');
        });

        this.editor.visualEditor.addEventListener('dragleave', (e) => {
            if (!this.editor.visualEditor.contains(e.relatedTarget)) {
                this.editor.visualEditor.classList.remove('drag-over');
            }
        });

        this.editor.visualEditor.addEventListener('drop', (e) => {
            e.preventDefault();
            this.editor.visualEditor.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            
            files.forEach(file => this.handleImageFile(file));
        });
    }

    setupPasteHandler() {
        this.editor.visualEditor.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) this.handleImageFile(file);
                } else if (item.type === 'text/plain') {
                    item.getAsString((text) => {
                        if (this.isImageURL(text)) {
                            e.preventDefault();
                            this.insertImageFromURL(text);
                        }
                    });
                }
            }
        });
    }

    setupImageHandlers() {
        this.editor.visualEditor.addEventListener('click', (e) => {
            const img = e.target.closest('img[data-image-id]');
            if (img) {
                this.selectImage(img);
            } else {
                this.deselectImage();
            }
        });

        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    async handleImageFile(file) {
        try {
            const imageId = this.generateImageId();
            const objectURL = URL.createObjectURL(file);
            
            await this.insertImage(objectURL, {
                id: imageId,
                originalFile: file,
                alt: file.name,
                title: file.name
            });
            
            this.editor.emit('imageAdded', { id: imageId, file, objectURL });
        } catch (error) {
            console.error('Error handling image file:', error);
            this.editor.emit('error', { type: 'image_upload', error });
        }
    }

    async insertImageFromURL(url) {
        if (!this.isImageURL(url)) {
            this.editor.emit('error', { 
                type: 'invalid_image_url', 
                message: 'Некорректный URL изображения' 
            });
            return;
        }

        try {
            await this.validateImageURL(url);
            
            const imageId = this.generateImageId();
            await this.insertImage(url, {
                id: imageId,
                src: url,
                alt: 'Изображение',
                title: 'Изображение'
            });
            
            this.editor.emit('imageAdded', { id: imageId, url });
        } catch (error) {
            console.error('Error inserting image from URL:', error);
            this.editor.emit('error', { type: 'image_load', error });
        }
    }

    async insertImage(src, metadata = {}) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const imageId = metadata.id || this.generateImageId();
                const maxWidth = 800;
                
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                const imageHTML = this.createImageHTML(src, {
                    ...metadata,
                    id: imageId,
                    width: Math.round(width),
                    height: Math.round(height),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                });
                
                this.insertAtCursor(imageHTML);
                this.images.set(imageId, {
                    element: this.editor.visualEditor.querySelector(`[data-image-id="${imageId}"]`),
                    metadata: { ...metadata, src, width, height }
                });
                
                resolve(imageId);
            };
            
            img.onerror = () => {
                throw new Error('Не удалось загрузить изображение');
            };
            
            img.src = src;
        });
    }

    createImageHTML(src, metadata) {
        const { id, width, height, alt, title, style = {} } = metadata;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.setAttribute('data-image-id', id);
        wrapper.setAttribute('contenteditable', 'false');
        
        wrapper.innerHTML = `
            <img src="${src}" 
                 alt="${alt || ''}" 
                 title="${title || ''}"
                 style="width: ${width}px; height: ${height}px; ${this.styleObjectToString(style)}"
                 draggable="false">
            <div class="image-resize-handle"></div>
            <div class="image-toolbar">
                <button class="image-btn" data-action="left" title="Выравнивание по левому краю">←</button>
                <button class="image-btn" data-action="center" title="Выравнивание по центру">↔</button>
                <button class="image-btn" data-action="right" title="Выравнивание по правому краю">→</button>
                <button class="image-btn" data-action="delete" title="Удалить изображение">×</button>
            </div>
        `;
        
        return wrapper.outerHTML;
    }

    insertAtCursor(html) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const div = document.createElement('div');
        div.innerHTML = html;
        
        while (div.firstChild) {
            range.insertNode(div.firstChild);
        }
        
        range.setStartAfter(range.endContainer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.editor.markDirty();
    }

    selectImage(imgElement) {
        this.deselectImage();
        
        const wrapper = imgElement.closest('.image-wrapper');
        if (!wrapper) return;
        
        wrapper.classList.add('selected');
        this.activeImage = wrapper;
        
        this.showImageToolbar(wrapper);
        this.editor.emit('imageSelected', { 
            element: wrapper, 
            metadata: this.images.get(wrapper.dataset.imageId) 
        });
    }

    deselectImage() {
        if (this.activeImage) {
            this.activeImage.classList.remove('selected');
            this.hideImageToolbar(this.activeImage);
            this.activeImage = null;
        }
    }

    showImageToolbar(wrapper) {
        const toolbar = wrapper.querySelector('.image-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
            
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('.image-btn');
                if (btn) {
                    this.handleImageAction(btn.dataset.action);
                }
            });
        }
    }

    hideImageToolbar(wrapper) {
        const toolbar = wrapper.querySelector('.image-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    handleImageAction(action) {
        if (!this.activeImage) return;
        
        const img = this.activeImage.querySelector('img');
        if (!img) return;
        
        switch (action) {
            case 'left':
                this.setImageAlignment('left');
                break;
            case 'center':
                this.setImageAlignment('center');
                break;
            case 'right':
                this.setImageAlignment('right');
                break;
            case 'delete':
                this.deleteImage(this.activeImage);
                break;
        }
        
        this.editor.markDirty();
    }

    setImageAlignment(alignment) {
        if (!this.activeImage) return;
        
        const wrapper = this.activeImage;
        const currentAlign = wrapper.style.float || wrapper.style.display;
        
        wrapper.style.float = '';
        wrapper.style.display = '';
        wrapper.style.margin = '';
        wrapper.style.textAlign = '';
        
        switch (alignment) {
            case 'left':
                wrapper.style.float = 'left';
                wrapper.style.margin = '0 1em 1em 0';
                break;
            case 'right':
                wrapper.style.float = 'right';
                wrapper.style.margin = '0 0 1em 1em';
                break;
            case 'center':
                wrapper.style.display = 'block';
                wrapper.style.margin = '1em auto';
                wrapper.style.textAlign = 'center';
                break;
        }
    }

    deleteImage(wrapper) {
        const imageId = wrapper.dataset.imageId;
        wrapper.remove();
        this.images.delete(imageId);
        this.activeImage = null;
        this.editor.emit('imageDeleted', { id: imageId });
    }

    handleMouseDown(e) {
        if (!this.activeImage) return;
        
        const handle = e.target.closest('.image-resize-handle');
        if (handle) {
            e.preventDefault();
            this.startResize(e);
            return;
        }
        
        if (e.target.closest('.image-wrapper') === this.activeImage) {
            e.preventDefault();
            this.startDrag(e);
        }
    }

    handleMouseMove(e) {
        if (this.resizeState) {
            this.doResize(e);
        } else if (this.dragState) {
            this.doDrag(e);
        }
    }

    handleMouseUp() {
        if (this.resizeState) {
            this.endResize();
        } else if (this.dragState) {
            this.endDrag();
        }
    }

    startResize(e) {
        const img = this.activeImage.querySelector('img');
        this.resizeState = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: parseInt(img.style.width) || img.offsetWidth,
            startHeight: parseInt(img.style.height) || img.offsetHeight,
            aspectRatio: img.offsetWidth / img.offsetHeight
        };
    }

    doResize(e) {
        if (!this.resizeState || !this.activeImage) return;
        
        const img = this.activeImage.querySelector('img');
        const deltaX = e.clientX - this.resizeState.startX;
        const deltaY = e.clientY - this.resizeState.startY;
        
        let newWidth = this.resizeState.startWidth + deltaX;
        let newHeight = this.resizeState.startHeight + deltaY;
        
        newHeight = newWidth / this.resizeState.aspectRatio;
        
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);
        
        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
    }

    endResize() {
        if (this.resizeState && this.activeImage) {
            const imageId = this.activeImage.dataset.imageId;
            const img = this.activeImage.querySelector('img');
            
            this.images.get(imageId).metadata.width = parseInt(img.style.width);
            this.images.get(imageId).metadata.height = parseInt(img.style.height);
            
            this.editor.markDirty();
        }
        this.resizeState = null;
    }

    startDrag(e) {
        this.dragState = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: this.activeImage.offsetLeft,
            startTop: this.activeImage.offsetTop
        };
        
        this.activeImage.style.position = 'relative';
        this.activeImage.style.zIndex = '1000';
    }

    doDrag(e) {
        if (!this.dragState || !this.activeImage) return;
        
        const deltaX = e.clientX - this.dragState.startX;
        const deltaY = e.clientY - this.dragState.startY;
        
        this.activeImage.style.left = `${this.dragState.startLeft + deltaX}px`;
        this.activeImage.style.top = `${this.dragState.startTop + deltaY}px`;
    }

    endDrag() {
        if (this.activeImage) {
            this.activeImage.style.zIndex = '';
        }
        this.dragState = null;
        this.editor.markDirty();
    }

    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        const handle = target.closest('.image-resize-handle');
        if (handle && this.activeImage) {
            e.preventDefault();
            this.startResize({ clientX: touch.clientX, clientY: touch.clientY });
            return;
        }
        
        const wrapper = target.closest('.image-wrapper');
        if (wrapper === this.activeImage) {
            e.preventDefault();
            this.startDrag({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleTouchMove(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        if (this.resizeState) {
            this.doResize({ clientX: touch.clientX, clientY: touch.clientY });
        } else if (this.dragState) {
            this.doDrag({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleTouchEnd() {
        if (this.resizeState) {
            this.endResize();
        } else if (this.dragState) {
            this.endDrag();
        }
    }

    isImageURL(url) {
        return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url) || 
               /^data:image\//.test(url);
    }

    async validateImageURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
            img.src = url;
        });
    }

    generateImageId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    styleObjectToString(styleObj) {
        return Object.entries(styleObj)
            .map(([key, value]) => `${key}: ${value};`)
            .join(' ');
    }

    addImageFromFile(file) {
        return this.handleImageFile(file);
    }

    addImageFromURL(url) {
        return this.insertImageFromURL(url);
    }

    getImageMetadata(imageId) {
        return this.images.get(imageId)?.metadata;
    }

    getAllImages() {
        return Array.from(this.images.values()).map(item => item.metadata);
    }
}
