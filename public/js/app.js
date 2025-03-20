/**
 * Main JavaScript file for the roleplay application
 */

document.addEventListener('DOMContentLoaded', function() {
  // Auto-hide flash messages after 5 seconds
  const flashMessages = document.querySelectorAll('.alert');
  if (flashMessages.length > 0) {
    setTimeout(() => {
      flashMessages.forEach(message => {
        message.style.opacity = '0';
        setTimeout(() => {
          message.style.display = 'none';
        }, 500);
      });
    }, 5000);
  }

  // Character textarea auto-resize
  const autoResizeTextareas = document.querySelectorAll('textarea[data-autoresize]');
  autoResizeTextareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Trigger once on load
    textarea.dispatchEvent(new Event('input'));
  });

  // Confirm delete actions
  const deleteButtons = document.querySelectorAll('.delete-confirm');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!confirm('Are you sure you want to delete this? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });
  
  // Word counter for writing posts
  const postContent = document.getElementById('post-content');
  const wordCounter = document.getElementById('word-counter');
  
  if (postContent && wordCounter) {
    postContent.addEventListener('input', function() {
      const text = this.value.trim();
      const wordCount = text ? text.split(/\s+/).length : 0;
      wordCounter.textContent = wordCount + (wordCount === 1 ? ' word' : ' words');
    });
    
    // Trigger once on load
    postContent.dispatchEvent(new Event('input'));
  }
  
  // Character search functionality
  const characterSearch = document.getElementById('character-search');
  const characterItems = document.querySelectorAll('.character-item');
  
  if (characterSearch && characterItems.length > 0) {
    characterSearch.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      characterItems.forEach(item => {
        const name = item.querySelector('.character-name').textContent.toLowerCase();
        const bio = item.querySelector('.character-bio') ? 
                    item.querySelector('.character-bio').textContent.toLowerCase() : '';
        
        if (name.includes(searchTerm) || bio.includes(searchTerm)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
  
  // Toggle password visibility
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      const passwordField = document.querySelector(this.getAttribute('data-target'));
      
      if (passwordField.type === 'password') {
        passwordField.type = 'text';
        this.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
        passwordField.type = 'password';
        this.innerHTML = '<i class="fas fa-eye"></i>';
      }
    });
  });
  
  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const navbarNav = document.querySelector('.navbar-nav');
  
  if (mobileMenuToggle && navbarNav) {
    mobileMenuToggle.addEventListener('click', function() {
      navbarNav.classList.toggle('show');
    });
  }
});

/**
 * Format date to a readable format
 * @param {Date|string} date - Date object or date string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
function formatDate(date, includeTime = false) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let formatted = `${month} ${day}, ${year}`;
  
  if (includeTime) {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0 hours)
    
    formatted += ` at ${hours}:${minutes} ${ampm}`;
  }
  
  return formatted;
}