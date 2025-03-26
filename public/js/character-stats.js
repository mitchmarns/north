const characterStats = (function() {
  
  /**
   * Initialize stat sliders to update displayed values on change
   */
  function init() {
    // Update attribute values when sliders change
    const sliders = document.querySelectorAll('.attribute-slider');
    
    sliders.forEach(slider => {
      const valueDisplay = document.getElementById(`${slider.id}Value`);
      
      // Update on input
      slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value;
      });
    });
  }
  
  /**
   * Helper function to set slider values
   * @param {Object} values - Object containing the stat values to set
   */
  function setValues(values) {
    for (const [stat, value] of Object.entries(values)) {
      const slider = document.getElementById(stat);
      const valueDisplay = document.getElementById(`${stat}Value`);
      
      if (slider && valueDisplay) {
        slider.value = value;
        valueDisplay.textContent = value;
      }
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
  
  // Return public methods
  return {
    setValues
  };
})();