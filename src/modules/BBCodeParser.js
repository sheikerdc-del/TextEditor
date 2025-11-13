class BBCodeParser {
    constructor() {
        this.tags = {
            'b': {
                html: (content) => `<strong>${content}</strong>`,
                bbcode: (content) => `[b]${content}[/b]`
            },
            'i': {
                html: (content) => `<em>${content}</em>`,
                bbcode: (content) => `[i]${content}[/i]`
            },
            'u': {
                html: (content) => `<span style="text-decoration: underline">${content}</span>`,
                bbcode: (content) => `[u]${content}[/u]`
            },
            's': {
                html: (content) => `<span style="text-decoration: line-through">${content}</span>`,
                bbcode: (content) => `[s]${content}[/s]`
            },
            'color': {
                html: (content, params) => {
                    const color = this.validateColor(params);
                    return `<span style="color:${color}">${content}</span>`;
                },
                bbcode: (content, color) => `[color=${color}]${content}[/color]`
            },
            'size': {
                html: (content, params) => {
                    const size = this.validateSize(params);
                    return `<span style="font-size:${size}">${content}</span>`;
                },
                bbcode: (content, size) => `[size=${size}]${content}[/size]`
            },
            'bg': {
                html: (content, params) => {
                    const color = this.validateColor(params);
                    return `<span style="background-color:${color}; padding: 0.2em 0.35em; border-radius: 0.35em">${content}</span>`;
                },
                bbcode: (content, color) => `[bg=${color}]${content}[/bg]`
            },
            'url': {
                html: (content, params) => {
                    const url = this.validateURL(params || content);
                    return `<a href="${url}" rel="noopener nofollow">${content}</a>`;
                },
                bbcode: (content, url) => url ? `[url=${url}]${content}[/url]` : `[url]${content}[/url]`
            },
            'img': {
                html: (content) => {
                    const src = this.validateURL(content);
                    return `<img src="${src}" alt="" style="max-width: 100%; height: auto;" />`;
                },
                bbcode: (content) => `[img]${content}[/img]`
            },
            'quote': {
                html: (content) => `<blockquote>${content}</blockquote>`,
                bbcode: (content) => `[quote]${content}[/quote]`
            },
            'code': {
                html: (content) => `<pre><code>${this.escapeHTML(content)}</code></pre>`,
                bbcode: (content) => `[code]${content}[/code]`
            },
            'center': {
                html: (content) => `<div style="text-align: center">${content}</div>`,
                bbcode: (content) => `[center]${content}[/center]`
            },
            'left': {
                html: (content) => `<div style="text-align: left">${content}</div>`,
                bbcode: (content) => `[left]${content}[/left]`
            },
            'right': {
                html: (content) => `<div style="text-align: right">${content}</div>`,
                bbcode: (content) => `[right]${content}[/right]`
            }
        };
    }

    toHTML(bbcode) {
        if (!bbcode) return '';
        
        let html = bbcode;
        
        html = this.escapeText(html);
        
        const tagOrder = ['code', 'img', 'url', 'quote', 'list', 'color', 'size', 'bg', 'b', 'i', 'u', 's', 'center', 'left', 'right'];
        
        tagOrder.forEach(tag => {
            if (this.tags[tag]) {
                const pattern = tag === 'img' || tag === 'url' ? 
                    `\\[${tag}\\](.*?)\\[\\/${tag}\\]` :
                    `\\[${tag}(?:=([^\\]]+))?\\](.*?)\\[\\/${tag}\\]`;
                
                const regex = new RegExp(pattern, 'g');
                html = html.replace(regex, (match, param, content) => {
                    return this.tags[tag].html(content || param, param);
                });
            }
        });
        
        html = this.processLists(html);
        
        html = html.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
        
        return html;
    }

    toBBCode(html) {
        if (!html) return '';
        
        let bbcode = html;
        
        Object.entries(this.tags).forEach(([tag, processor]) => {
            if (tag === 'img') {
                const imgRegex = /<img[^>]+src="([^"]*)"[^>]*>/g;
                bbcode = bbcode.replace(imgRegex, (match, src) => {
                    return `[img]${src}[/img]`;
                });
            } else if (tag === 'url') {
                const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/g;
                bbcode = bbcode.replace(linkRegex, (match, href, content) => {
                    return `[url=${href}]${content}[/url]`;
                });
            } else {
            }
        });
        
        bbcode = bbcode.replace(/<strong>(.*?)<\/strong>/g, '[b]$1[/b]');
        bbcode = bbcode.replace(/<em>(.*?)<\/em>/g, '[i]$1[/i]');
        bbcode = bbcode.replace(/<span style="text-decoration: underline">(.*?)<\/span>/g, '[u]$1[/u]');
        bbcode = bbcode.replace(/<blockquote>(.*?)<\/blockquote>/g, '[quote]$1[/quote]');
        bbcode = bbcode.replace(/<div style="text-align: center">(.*?)<\/div>/g, '[center]$1[/center]');
        
        bbcode = bbcode.replace(/<br\s*\/?>/g, '\n');
        
        return bbcode;
    }

    processLists(html) {
        let processed = html.replace(/\[list\](.*?)\[\/list\]/gs, (match, content) => {
            const items = content.split('[*]').filter(item => item.trim());
            const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
            return `<ul>${listItems}</ul>`;
        });
        
        processed = processed.replace(/\[list=([1a])\](.*?)\[\/list\]/gs, (match, type, content) => {
            const items = content.split('[*]').filter(item => item.trim());
            const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
            return `<ol type="${type}">${listItems}</ol>`;
        });
        
        return processed;
    }

    validateColor(color) {
        if (!color) return '#000000';
        
        if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return color;
        
        const colorNames = {
            'red': '#ff0000', 'green': '#008000', 'blue': '#0000ff',
            'black': '#000000', 'white': '#ffffff', 'yellow': '#ffff00'
        };
        
        return colorNames[color.toLowerCase()] || '#000000';
    }

    validateSize(size) {
        if (!size) return '14px';
        
        if (/^\d+(px|em|rem|%)$/.test(size)) return size;
        
        if (/^\d+$/.test(size)) return size + 'px';
        
        return '14px';
    }

    validateURL(url) {
        if (!url) return '#';
        
        try {
            if (url.startsWith('javascript:') || url.startsWith('data:')) {
                return '#';
            }
            return url;
        } catch {
            return '#';
        }
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeText(text) {
        const tokens = [];
        let current = 0;
        const tagRegex = /\[(\/)?([^=\]\s]+)(?:=([^\]]+))?\]/g;
        let match;
        
        while ((match = tagRegex.exec(text)) !== null) {
            if (match.index > current) {
                tokens.push({
                    type: 'text',
                    content: text.slice(current, match.index)
                });
            }
            
            tokens.push({
                type: 'tag',
                content: match[0],
                tag: match[2],
                isClosing: !!match[1],
                params: match[3]
            });
            
            current = match.index + match[0].length;
        }
        
        if (current < text.length) {
            tokens.push({
                type: 'text',
                content: text.slice(current)
            });
        }
        
        return tokens.map(token => {
            if (token.type === 'text') {
                return token.content
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;')
                    .replace(/\n/g, '\\n');
            }
            return token.content;
        }).join('');
    }
}
