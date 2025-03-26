/**
 * Relationship Gallery Viewer and Reordering
 * Handles image viewing modal and drag-and-drop reordering
 */
document.addEventListener('DOMContentLoaded', function() {
  // Image viewer functionality
  const galleryItems = document.querySelectorAll('.gallery-item');
  const modal = document.getElementById('imageViewerModal');
  const modalImg = document.getElementById('viewerImage');
  const captionText = document.getElementById('viewerCaption');
  const closeBtn = document.getElementById('closeImageViewer');
  
  if (!modal || !modalImg || !closeBtn) return;
  
  galleryItems.forEach(item => {
    const img = item.querySelector('.gallery-image');
    const caption = item.querySelector('.gallery-caption');
    
    if (img) {
      img.addEventListener('click', function() {
        modal.style.display = "flex";
        modalImg.src = this.src;
        if (captionText && caption) {
          captionText.innerHTML = caption.innerHTML;
        }
      });
    }
  });
  
  closeBtn.addEventListener('click', function() {
    modal.style.display = "none";
  });
  
  // Close modal when clicking outside the content
  window.addEventListener('click', function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });
  
  // Reordering functionality
  const reorderBtn = document.getElementById('reorderBtn');
  const saveOrderBtn = document.getElementById('saveOrderBtn');
  const cancelOrderBtn = document.getElementById('cancelOrderBtn');
  const galleryGrid = document.querySelector('.gallery-grid');
  
  if (reorderBtn && saveOrderBtn && cancelOrderBtn && galleryGrid) {
    let isDragging = false;
    
    // Make items draggable
    reorderBtn.addEventListener('click', function() {
      isDragging = true;
      reorderBtn.style.display = 'none';
      saveOrderBtn.style.display = 'inline-block';
      cancelOrderBtn.style.display = 'inline-block';
      
      galleryGrid.classList.add('reordering');
      
      // Make items draggable
      galleryItems.forEach(item => {
        item.setAttribute('draggable', true);
        item.classList.add('draggable');
        
        // Add drag events
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragover', dragOver);
        item.addEventListener('dragleave', dragLeave);
        item.addEventListener('drop', drop);
        item.addEventListener('dragend', dragEnd);
      });
    });
    
    // Save new order
    saveOrderBtn.addEventListener('click', function() {
      const relationshipId = galleryGrid.dataset.relationshipId;
      const imageIds = Array.from(galleryItems).map(item => item.dataset.id);
      
      // Send order to server
      fetch(`/characters/relationships/${relationshipId}/gallery/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Reset UI
          endDragging();
        } else {
          alert('Failed to save order: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error saving order:', error);
        alert('An error occurred while saving the order');
      });
    });
    
    // Cancel reordering
    cancelOrderBtn.addEventListener('click', endDragging);
    
    function endDragging() {
      isDragging = false;
      reorderBtn.style.display = 'inline-block';
      saveOrderBtn.style.display = 'none';
      cancelOrderBtn.style.display = 'none';
      
      galleryGrid.classList.remove('reordering');
      
      // Remove draggable attributes
      galleryItems.forEach(item => {
        item.removeAttribute('draggable');
        item.classList.remove('draggable');
        
        // Remove drag events
        item.removeEventListener('dragstart', dragStart);
        item.removeEventListener('dragover', dragOver);
        item.removeEventListener('dragleave', dragLeave);
        item.removeEventListener('drop', drop);
        item.removeEventListener('dragend', dragEnd);
      });
    }
    
    // Drag functions
    function dragStart(e) {
      e.dataTransfer.setData('text/plain', e.target.dataset.id);
      setTimeout(() => {
        e.target.classList.add('dragging');
      }, 0);
    }
    
    function dragOver(e) {
      e.preventDefault();
      e.target.closest('.gallery-item').classList.add('drag-over');
    }
    
    function dragLeave(e) {
      e.target.closest('.gallery-item').classList.remove('drag-over');
    }
    
    function drop(e) {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      const draggedElement = document.querySelector(`.gallery-item[data-id="${draggedId}"]`);
      const dropTarget = e.target.closest('.gallery-item');
      
      dropTarget.classList.remove('drag-over');
      
      if (draggedElement !== dropTarget) {
        const gallery = dropTarget.parentNode;
        const draggedIndex = Array.from(gallery.children).indexOf(draggedElement);
        const dropIndex = Array.from(gallery.children).indexOf(dropTarget);
        
        if (draggedIndex < dropIndex) {
          gallery.insertBefore(draggedElement, dropTarget.nextSibling);
        } else {
          gallery.insertBefore(draggedElement, dropTarget);
        }
      }
    }
    
    function dragEnd(e) {
      e.target.classList.remove('dragging');
    }
  }
});