import React, { useState, useEffect } from 'react';

const SaveDialog = ({ open, onClose, onSave, defaultTitle = '' }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [active, setActive] = useState(true);
  
  // Update title if defaultTitle changes
  useEffect(() => {
    if (defaultTitle && open) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title for your roadmap');
      return;
    }
    onSave({ title, active });
    setTitle(''); // Reset the form
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Save Roadmap</h3>
        <div className="form-group">
          <label>Title</label>
          <input 
            className="form-control" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Enter roadmap title"
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select 
            className="form-control" 
            value={active ? 'true' : 'false'} 
            onChange={(e) => setActive(e.target.value === 'true')}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <div className="form-help">
            Active roadmaps appear at the top of your saved list.
          </div>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={!title.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDialog;