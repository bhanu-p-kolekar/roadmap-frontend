import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';

const RoadmapNode = ({ data, id, isConnectable = true, selected }) => {
  const [showSourceTooltip, setShowSourceTooltip] = useState(false);
  const [showTargetTooltip, setShowTargetTooltip] = useState(false);

  // Node-specific handle IDs
  const sourceHandleId = `source-${id}`;
  const targetHandleId = `target-${id}`;
  
  // Also maintain the generic handles for backward compatibility
  const genericSourceHandleId = "source";
  const genericTargetHandleId = "target";
  
  // Debug output to see what data is received
  useEffect(() => {
    console.log(`Node ${id} received data:`, data);
    console.log(`Node ${id} handle IDs: source=${sourceHandleId}, target=${targetHandleId}`);
    console.log(`Node ${id} generic handle IDs: source=${genericSourceHandleId}, target=${genericTargetHandleId}`);
  }, [id, data, sourceHandleId, targetHandleId, genericSourceHandleId, genericTargetHandleId]);
  
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
      {/* Target handles (top) - provide multiple options for ReactFlow to connect to */}
      {isConnectable && (
        <>
          {/* Node-specific target handle */}
          <Handle
            id={targetHandleId}
            type="target"
            position={Position.Top}
            className={`node-handle target-handle ${data.connectionMode ? 'connection-active' : ''}`}
            style={{ 
              top: -8, 
              width: data.connectionMode ? 16 : 14,
              height: data.connectionMode ? 16 : 14,
              background: 'var(--accent)',
              border: '2px solid white',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setShowTargetTooltip(true)}
            onMouseLeave={() => setShowTargetTooltip(false)}
            isConnectable={isConnectable}
          />
          
          {/* Generic target handle - slightly offset but visually hidden */}
          <Handle
            id={genericTargetHandleId}
            type="target"
            position={Position.Top}
            style={{ 
              top: -8,
              opacity: 0, // Make invisible but still functional
              pointerEvents: 'all' // Still receive connection events
            }}
            isConnectable={isConnectable}
          />
          
          {/* Also add "target" handle ID for absolute backward compatibility */}
          <Handle
            id="target"
            type="target"
            position={Position.Top}
            style={{ 
              top: -8,
              opacity: 0, // Make invisible but still functional
              pointerEvents: 'all' // Still receive connection events
            }}
            isConnectable={isConnectable}
          />
          
          {(showTargetTooltip || data.connectionMode) && (
            <div className="handle-tooltip target-tooltip">Connect to here</div>
          )}
        </>
      )}
      
      {/* Source handles (bottom) - provide multiple options for ReactFlow to connect from */}
      {isConnectable && (
        <>
          {/* Node-specific source handle */}
          <Handle
            id={sourceHandleId}
            type="source"
            position={Position.Bottom}
            className={`node-handle source-handle ${data.connectionMode ? 'connection-active' : ''}`}
            style={{ 
              bottom: -8, 
              width: data.connectionMode ? 16 : 14,
              height: data.connectionMode ? 16 : 14,
              background: 'var(--accent)',
              border: '2px solid white',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setShowSourceTooltip(true)}
            onMouseLeave={() => setShowSourceTooltip(false)}
            isConnectable={isConnectable}
          />
          
          {/* Generic source handle - slightly offset but visually hidden */}
          <Handle
            id={genericSourceHandleId}
            type="source"
            position={Position.Bottom}
            style={{ 
              bottom: -8,
              opacity: 0, // Make invisible but still functional
              pointerEvents: 'all' // Still receive connection events
            }}
            isConnectable={isConnectable}
          />
          
          {/* Also add "source" handle ID for absolute backward compatibility */}
          <Handle
            id="source"
            type="source"
            position={Position.Bottom}
            style={{ 
              bottom: -8,
              opacity: 0, // Make invisible but still functional
              pointerEvents: 'all' // Still receive connection events
            }}
            isConnectable={isConnectable}
          />
          
          {(showSourceTooltip || data.connectionMode) && (
            <div className="handle-tooltip source-tooltip">Drag from here</div>
          )}
        </>
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
    </div>
  );
};

export default RoadmapNode;