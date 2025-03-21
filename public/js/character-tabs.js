/**
 * Character Tabs Functionality
 * This script handles tab switching and form functionality for character forms
 */

document.addEventListener('DOMContentLoaded', function() {
  // Tab functionality
  const tabLinks = document.querySelectorAll('.character-tab-link');
  const tabContents = document.querySelectorAll('.character-tab-pane');
  
  // Initialize tabs - hide all tab content first
  tabContents.forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Show the first tab by default
  if (tabLinks.length > 0 && tabContents.length > 0) {
    tabLinks[0].classList.add('active');
    const firstTabId = tabLinks[0].getAttribute('href');
    const firstTab = document.querySelector(firstTabId);
    if (firstTab) {
      firstTab.style.display = 'block';
    }
  }
  
  // Add click handlers to tab links
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all tabs and hide tab content
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(t => {
        t.style.display = 'none';
      });
      
      // Add active class to clicked tab and show its content
      this.classList.add('active');
      const targetId = this.getAttribute('href');
      const targetTab = document.querySelector(targetId);
      if (targetTab) {
        targetTab.style.display = 'block';
      }
    });
  });
  
  // Team/Role fields visibility toggle
  const roleSelect = document.getElementById('role');
  if (roleSelect) {
    roleSelect.addEventListener('change', toggleTeamFields);
    // Initialize on page load
    toggleTeamFields();
  }
  
  // Avatar preview handler
  const avatarInput = document.getElementById('avatarUrl');
  if (avatarInput) {
    // Initialize preview if there's an existing URL
    if (avatarInput.value) {
      updateAvatarPreview(avatarInput.value);
    }
    
    // Add listener for changes
    avatarInput.addEventListener('input', function(e) {
      updateAvatarPreview(this.value.trim());
    });
  }
  
  // Relationship character tab functionality
  setupRelationshipTabs();
});

// Function to toggle team-related fields based on character role
function toggleTeamFields() {
  const role = document.getElementById('role').value;
  const teamFields = document.getElementById('teamFields');
  const playerFields = document.getElementById('playerFields');
  
  if (!teamFields || !playerFields) return;
  
  if (role === 'Player' || role === 'Staff') {
    teamFields.style.display = 'block';
    playerFields.style.display = role === 'Player' ? 'block' : 'none';
  } else {
    teamFields.style.display = 'none';
    playerFields.style.display = 'none';
  }
}

// Function to update avatar preview
function updateAvatarPreview(url) {
  const previewContainer = document.getElementById('avatar-preview');
  if (!previewContainer) return;
  
  if (url) {
    previewContainer.innerHTML = `
      <img src="${url}" alt="Avatar Preview" style="width: 100%; height: 250px; object-fit: cover; border-radius: var(--radius-md);" onerror="imageLoadError(this)">
    `;
  } else {
    previewContainer.innerHTML = `<i class="fas fa-user-circle" style="font-size: 3rem; color: #999;"></i>`;
  }
}

function imageLoadError(img) {
  img.onerror = null;
  img.parentNode.innerHTML = `
    <div style="width: 100%; height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999;">
      <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
      <span>Invalid image URL</span>
    </div>
  `;
}

// Function to set up relationship tabs
function setupRelationshipTabs() {
  const myCharTab = document.querySelector('.character-tab-link[href="#myCharacters"]');
  const otherCharTab = document.querySelector('.character-tab-link[href="#otherCharacters"]');
  
  if (!myCharTab || !otherCharTab) {
    return; // Not on a relationship page
  }
  
  const myCharContent = document.getElementById('myCharacters');
  const otherCharContent = document.getElementById('otherCharacters');
  
  if (!myCharContent || !otherCharContent) {
    return;
  }
  
  // Initial state
  myCharContent.style.display = 'block';
  otherCharContent.style.display = 'none';
  myCharTab.classList.add('active');
  
  // Set up click handlers
  myCharTab.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Toggle visibility
    myCharContent.style.display = 'block';
    otherCharContent.style.display = 'none';
    
    // Toggle active class
    myCharTab.classList.add('active');
    otherCharTab.classList.remove('active');
    
    // Toggle form fields
    if (document.getElementById('character2Id_own')) {
      document.getElementById('character2Id_own').setAttribute('name', 'character2Id');
    }
    if (document.getElementById('character2Id_other')) {
      document.getElementById('character2Id_other').removeAttribute('name');
    }
  });
  
  otherCharTab.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Toggle visibility
    myCharContent.style.display = 'none';
    otherCharContent.style.display = 'block';
    
    // Toggle active class
    otherCharTab.classList.add('active');
    myCharTab.classList.remove('active');
    
    // Toggle form fields
    if (document.getElementById('character2Id_other')) {
      document.getElementById('character2Id_other').setAttribute('name', 'character2Id');
    }
    if (document.getElementById('character2Id_own')) {
      document.getElementById('character2Id_own').removeAttribute('name');
    }
  });
}

// Helper function for relationship editing
function editRelationship(id, type, description, status) {
  const editModal = document.getElementById('editRelationshipModal');
  if (!editModal) return;
  
  editModal.style.display = 'block';
  
  const editForm = document.getElementById('editRelationshipForm');
  if (editForm) {
    editForm.action = `/characters/relationships/${id}?_method=PUT`;
  }
  
  if (document.getElementById('edit_relationshipType')) {
    document.getElementById('edit_relationshipType').value = type;
  }
  
  if (document.getElementById('edit_description')) {
    document.getElementById('edit_description').value = description;
  }
  
  const statusSelect = document.getElementById('edit_status');
  if (statusSelect) {
    for (let i = 0; i < statusSelect.options.length; i++) {
      if (statusSelect.options[i].value === status) {
        statusSelect.selectedIndex = i;
        break;
      }
    }
  }
}

// Helper function to cancel relationship editing
function cancelEdit() {
  const editModal = document.getElementById('editRelationshipModal');
  if (editModal) {
    editModal.style.display = 'none';
  }
}