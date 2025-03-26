/**
 * Relationship Gallery - Image Preview Functionality
 * Handles the image URL preview for relationship gallery uploads
 */
document.addEventListener('DOMContentLoaded', function() {
  const imageUrlInput = document.getElementById('imageUrl');
  const imagePreview = document.getElementById('imagePreview');
  
  if (!imageUrlInput || !imagePreview) return;
  
  imageUrlInput.addEventListener('input', function() {
    const url = this.value.trim();
    
    if (url) {
      // Create image element
      const img = new Image();
      img.onload = function() {
        imagePreview.innerHTML = '';
        imagePreview.className = '';
        imagePreview.appendChild(img);
      };
      img.onerror = function() {
        imagePreview.innerHTML = `
          <i class="ph-duotone ph-warning"></i>
          <p>Invalid image URL</p>
        `;
        imagePreview.className = 'image-preview-placeholder image-preview-error';
      };
      img.src = url;
    } else {
      imagePreview.innerHTML = `
        <i class="ph-duotone ph-image"></i>
        <p>Image preview will appear here</p>
      `;
      imagePreview.className = 'image-preview-placeholder';
    }
  });
});