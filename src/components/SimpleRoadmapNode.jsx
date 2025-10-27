import React, { useState, memo } from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';

// Simplified RoadmapNode component with standard source and target handles only
const SimpleRoadmapNode = ({ data, id, isConnectable = true, selected }) => {
  const [showSourceTooltip, setShowSourceTooltip] = useState(false);
  const [showTargetTooltip, setShowTargetTooltip] = useState(false);
  
  // Simple handler functions for edit and delete
  const handleEdit = (e) => {
    e.stopPropagation();
    if (data.onEdit) data.onEdit(id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data.onDelete) data.onDelete(id);
  };

  return (
    <div className={`roadmap-node ${selected ? 'selected' : ''} ${data.connectionMode ? 'connection-mode' : ''}`}>
      {/* Single target handle (top) - simplify to avoid connection issues */}
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        className="node-handle target-handle"
        style={{ 
          top: -8, 
          width: 14,
          height: 14,
          background: 'var(--accent)',
          border: '2px solid white',
          zIndex: 10
        }}
        onMouseEnter={() => setShowTargetTooltip(true)}
        onMouseLeave={() => setShowTargetTooltip(false)}
        isConnectable={isConnectable}
      />
      
      {showTargetTooltip && (
        <div className="handle-tooltip target-tooltip">Connect to here</div>
      )}
      
      <div className="roadmap-node-header">
        {data.title || 'Untitled Step'}
        {isConnectable && data.onEdit && data.onDelete && (
          <div className="roadmap-node-actions">
            <button 
              className="node-btn edit-btn" 
              onClick={handleEdit}
            >
              ✏️
            </button>
            <button 
              className="node-btn delete-btn" 
              onClick={handleDelete}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      <div className="roadmap-node-content">
        {data.description ? (
          <p>{data.description}</p>
        ) : (
          <p style={{ fontStyle: 'italic', color: 'var(--muted)' }}>No description available</p>
        )}
        <div className="roadmap-node-time">
          <span role="img" aria-label="time">⏱️</span> {data.estimated_time || 'Unknown'}
        </div>
      </div>
      
      {/* Single source handle (bottom) - simplify to avoid connection issues */}
      <Handle
        id="source"
        type="source"
        position={Position.Bottom}
        className="node-handle source-handle"
        style={{ 
          bottom: -8, 
          width: 14,
          height: 14,
          background: 'var(--accent)',
          border: '2px solid white',
          zIndex: 10
        }}
        onMouseEnter={() => setShowSourceTooltip(true)}
        onMouseLeave={() => setShowSourceTooltip(false)}
        isConnectable={isConnectable}
      />
      
      {showSourceTooltip && (
        <div className="handle-tooltip source-tooltip">Drag from here</div>
      )}
    </div>
  );
};

export default SimpleRoadmapNode;