import React, { useState, useEffect } from 'react';

const NodeEditor = ({ node, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  // Reset form when node changes
  useEffect(() => {
    setTitle(node?.data?.title || '');
    setDescription(node?.data?.description || '');
    setEstimatedTime(node?.data?.estimated_time || '');
  }, [node]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: node?.id,
      title,
      description,
      estimated_time: estimatedTime
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content node-editor">
        <h2>{node ? 'Edit Node' : 'Add Node'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Estimated Time</label>
            <input 
              type="text" 
              value={estimatedTime} 
              onChange={(e) => setEstimatedTime(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
            <button type="submit" className="save-btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NodeEditor;