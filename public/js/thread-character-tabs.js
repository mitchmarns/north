/**
 * Thread Character Tagging Tabs
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get tab links for character tagging
  const myCharsTab = document.getElementById('my-chars-tab');
  const otherCharsTab = document.getElementById('other-chars-tab');
  
  if (myCharsTab && otherCharsTab) {
    // Initialize tabs
    const myCharsPane = document.getElementById('my-chars');
    const otherCharsPane = document.getElementById('other-chars');
    
    if (myCharsPane && otherCharsPane) {
      // Show my characters tab by default
      myCharsPane.style.display = 'block';
      otherCharsPane.style.display = 'none';
      myCharsTab.classList.add('active');
      
      // My characters tab click handler
      myCharsTab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Toggle tab active state
        myCharsTab.classList.add('active');
        otherCharsTab.classList.remove('active');
        
        // Toggle tab content visibility
        myCharsPane.style.display = 'block';
        otherCharsPane.style.display = 'none';
      });
      
      // Other characters tab click handler
      otherCharsTab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Toggle tab active state
        otherCharsTab.classList.add('active');
        myCharsTab.classList.remove('active');
        
        // Toggle tab content visibility
        otherCharsPane.style.display = 'block';
        myCharsPane.style.display = 'none';
      });
    }
  }
  
  // Also handle the edit page tabs if they exist
  const editMyCharsTab = document.getElementById('edit-my-chars-tab');
  const editOtherCharsTab = document.getElementById('edit-other-chars-tab');
  
  if (editMyCharsTab && editOtherCharsTab) {
    // Initialize edit tabs
    const editMyCharsPane = document.getElementById('edit-my-chars');
    const editOtherCharsPane = document.getElementById('edit-other-chars');
    
    if (editMyCharsPane && editOtherCharsPane) {
      // Show my characters tab by default
      editMyCharsPane.style.display = 'block';
      editOtherCharsPane.style.display = 'none';
      editMyCharsTab.classList.add('active');
      
      // My characters tab click handler
      editMyCharsTab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Toggle tab active state
        editMyCharsTab.classList.add('active');
        editOtherCharsTab.classList.remove('active');
        
        // Toggle tab content visibility
        editMyCharsPane.style.display = 'block';
        editOtherCharsPane.style.display = 'none';
      });
      
      // Other characters tab click handler
      editOtherCharsTab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Toggle tab active state
        editOtherCharsTab.classList.add('active');
        editMyCharsTab.classList.remove('active');
        
        // Toggle tab content visibility
        editOtherCharsPane.style.display = 'block';
        editMyCharsPane.style.display = 'none';
      });
    }
  }
});