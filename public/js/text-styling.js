/**
 * text-styling.js - Handles text formatting and styling in textarea elements
 * Fixed version to properly initialize toolbar buttons
 */

document.addEventListener('DOMContentLoaded', function() {
  // Find all toolbar buttons
  const toolbarButtons = document.querySelectorAll('.toolbar-btn');
  
  // Add click event to each button
  toolbarButtons.forEach(button => {
    button.addEventListener('click', function() {
      const style = this.getAttribute('data-style');
      const textareaId = this.closest('.text-styling-toolbar').nextElementSibling.id;
      const textarea = document.getElementById(textareaId);
      
      if (textarea) {
        applyStyle(textarea, style);
      }
    });
  });
  
  // Set up previews for formattable textareas
  const formattableTextareas = document.querySelectorAll('.formattable-textarea');
  formattableTextareas.forEach(textarea => {
    setupPreview(textarea);
    
    // Update preview on text change
    textarea.addEventListener('input', function() {
      updatePreview(this);
    });
    
    // Initial preview update
    updatePreview(textarea);
  });
});

// Function to apply style to a textarea
function applyStyle(textarea, style) {
  // Get current selection
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
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
  const newText = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  textarea.value = newText;
  
  // Update cursor position
  const newCursorPos = start + replacement.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Update preview
  updatePreview(textarea);
  
  // Focus back on textarea
  textarea.focus();
}

// Function to set up preview for a textarea
function setupPreview(textarea) {
  // Create preview element if it doesn't exist
  const previewId = `preview-${textarea.id}`;
  
  if (!document.getElementById(previewId)) {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'formatted-preview-container';
    previewContainer.innerHTML = `
      <div class="preview-header">
        <h4>Preview</h4>
        <button type="button" class="btn btn-sm preview-toggle">Hide Preview</button>
      </div>
      <div id="${previewId}" class="formatted-text"></div>
    `;
    
    // Insert preview after textarea
    textarea.parentNode.insertBefore(previewContainer, textarea.nextSibling);
    
    // Toggle preview visibility
    const toggleBtn = previewContainer.querySelector('.preview-toggle');
    const preview = previewContainer.querySelector(`#${previewId}`);
    
    toggleBtn.addEventListener('click', () => {
      const isVisible = preview.style.display !== 'none';
      preview.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? 'Show Preview' : 'Hide Preview';
    });
  }
}

// Function to update preview for a textarea
function updatePreview(textarea) {
  const previewId = `preview-${textarea.id}`;
  const preview = document.getElementById(previewId);
  
  if (!preview) return;
  
  let content = textarea.value;
  
  // Process styling tags
  content = processText(content);
  
  // Update preview content
  preview.innerHTML = content;
}

// Function to process text with styling tags
function processText(text) {
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