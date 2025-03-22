/**
 * text-styling.js - Handles text formatting and styling in textarea elements
 */

class TextStyler {
  constructor(textareaSelector, toolbarSelector) {
    this.textarea = document.querySelector(textareaSelector);
    this.toolbar = document.querySelector(toolbarSelector);
    
    if (!this.textarea || !this.toolbar) {
      console.error('TextStyler: Required elements not found');
      return;
    }
    
    this.initToolbar();
    this.setupPreview();
  }
  
  initToolbar() {
    // Get all styling buttons
    const buttons = this.toolbar.querySelectorAll('.toolbar-btn');
    
    // Add click event to each button
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const style = button.getAttribute('data-style');
        this.applyStyle(style);
      });
    });
  }
  
  setupPreview() {
    // Create preview element if it doesn't exist
    if (!document.getElementById('formatted-preview')) {
      const previewContainer = document.createElement('div');
      previewContainer.className = 'formatted-preview-container';
      previewContainer.innerHTML = `
        <div class="preview-header">
          <h4>Preview</h4>
          <button type="button" class="btn btn-sm preview-toggle">Hide Preview</button>
        </div>
        <div id="formatted-preview" class="formatted-text"></div>
      `;
      
      // Insert preview after textarea
      this.textarea.parentNode.insertBefore(previewContainer, this.textarea.nextSibling);
      
      // Toggle preview visibility
      const toggleBtn = previewContainer.querySelector('.preview-toggle');
      const preview = previewContainer.querySelector('#formatted-preview');
      
      toggleBtn.addEventListener('click', () => {
        const isVisible = preview.style.display !== 'none';
        preview.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? 'Show Preview' : 'Hide Preview';
      });
    }
    
    // Update preview on text change
    this.textarea.addEventListener('input', () => {
      this.updatePreview();
    });
    
    // Initial preview update
    this.updatePreview();
  }
  
  updatePreview() {
    const preview = document.getElementById('formatted-preview');
    if (!preview) return;
    
    let content = this.textarea.value;
    
    // Process styling tags
    content = this.processText(content);
    
    // Update preview content
    preview.innerHTML = content;
  }
  
  processText(text) {
    // Process headings
    text = text.replace(/\[h1\](.*?)\[\/h1\]/g, '<h1>$1</h1>');
    text = text.replace(/\[h2\](.*?)\[\/h2\]/g, '<h2>$1</h2>');
    text = text.replace(/\[h3\](.*?)\[\/h3\]/g, '<h3>$1</h3>');
    
    // Process text formatting
    text = text.replace(/\[b\](.*?)\[\/b\]/g, '<span class="bold">$1</span>');
    text = text.replace(/\[i\](.*?)\[\/i\]/g, '<span class="italic">$1</span>');
    text = text.replace(/\[u\](.*?)\[\/u\]/g, '<span class="underline">$1</span>');
    text = text.replace(/\[s\](.*?)\[\/s\]/g, '<span class="strikethrough">$1</span>');
    
    // Process alignment
    text = text.replace(/\[center\](.*?)\[\/center\]/g, '<div class="text-center">$1</div>');
    text = text.replace(/\[right\](.*?)\[\/right\]/g, '<div class="text-right">$1</div>');
    text = text.replace(/\[left\](.*?)\[\/left\]/g, '<div class="text-left">$1</div>');
    
    // Process colors
    text = text.replace(/\[color-primary\](.*?)\[\/color-primary\]/g, '<span class="color-primary">$1</span>');
    text = text.replace(/\[color-success\](.*?)\[\/color-success\]/g, '<span class="color-success">$1</span>');
    text = text.replace(/\[color-danger\](.*?)\[\/color-danger\]/g, '<span class="color-danger">$1</span>');
    text = text.replace(/\[color-warning\](.*?)\[\/color-warning\]/g, '<span class="color-warning">$1</span>');
    
    // Process gradient text
    text = text.replace(/\[gradient\](.*?)\[\/gradient\]/g, '<span class="gradient-text">$1</span>');
    
    // Process quote
    text = text.replace(/\[quote\](.*?)\[\/quote\]/g, '<div class="quote">$1</div>');
    
    // Process divider
    text = text.replace(/\[divider\]/g, '<div class="divider"></div>');
    
    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }
  
  applyStyle(style) {
    // Get current selection
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    
    let replacement = '';
    
    // Determine tag based on style
    switch (style) {
      case 'h1':
        replacement = `[h1]${selectedText}[/h1]`;
        break;
      case 'h2':
        replacement = `[h2]${selectedText}[/h2]`;
        break;
      case 'h3':
        replacement = `[h3]${selectedText}[/h3]`;
        break;
      case 'bold':
        replacement = `[b]${selectedText}[/b]`;
        break;
      case 'italic':
        replacement = `[i]${selectedText}[/i]`;
        break;
      case 'underline':
        replacement = `[u]${selectedText}[/u]`;
        break;
      case 'strikethrough':
        replacement = `[s]${selectedText}[/s]`;
        break;
      case 'text-center':
        replacement = `[center]${selectedText}[/center]`;
        break;
      case 'text-right':
        replacement = `[right]${selectedText}[/right]`;
        break;
      case 'text-left':
        replacement = `[left]${selectedText}[/left]`;
        break;
      case 'color-primary':
        replacement = `[color-primary]${selectedText}[/color-primary]`;
        break;
      case 'color-success':
        replacement = `[color-success]${selectedText}[/color-success]`;
        break;
      case 'color-danger':
        replacement = `[color-danger]${selectedText}[/color-danger]`;
        break;
      case 'color-warning':
        replacement = `[color-warning]${selectedText}[/color-warning]`;
        break;
      case 'gradient-text':
        replacement = `[gradient]${selectedText}[/gradient]`;
        break;
      case 'quote':
        replacement = `[quote]${selectedText}[/quote]`;
        break;
      case 'divider':
        replacement = `[divider]`;
        break;
      default:
        replacement = selectedText;
    }
    
    // Replace selected text with styled version
    const newText = this.textarea.value.substring(0, start) + replacement + this.textarea.value.substring(end);
    this.textarea.value = newText;
    
    // Update cursor position
    const newCursorPos = start + replacement.length;
    this.textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update preview
    this.updatePreview();
    
    // Focus back on textarea
    this.textarea.focus();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Find textareas that should have formatting capabilities
  const formattableTextareas = document.querySelectorAll('.formattable-textarea');
  
  formattableTextareas.forEach((textarea, index) => {
    // Create a unique ID for each textarea if it doesn't have one
    if (!textarea.id) {
      textarea.id = `formattable-textarea-${index}`;
    }
    
    // Create toolbar for each textarea
    const toolbarId = `formatting-toolbar-${index}`;
    const toolbarHtml = document.querySelector('.text-styling-toolbar').outerHTML
      .replace('text-styling-toolbar', `text-styling-toolbar ${toolbarId}`);
    
    // Insert toolbar before textarea
    textarea.insertAdjacentHTML('beforebegin', toolbarHtml);
    
    // Initialize styler for this textarea
    new TextStyler(`#${textarea.id}`, `.${toolbarId}`);
  });
});