import React, { memo } from 'react';
import { getBezierPath } from 'reactflow';

// Use memo to prevent unnecessary re-renders
const SimplifiedCustomEdge = memo(({ 
  id, 
  source, 
  target, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition, 
  style = {}, 
  markerEnd
}) => {
  
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: 'var(--accent)',
        strokeWidth: 2,
        strokeOpacity: 1
      }}
    />
  );
});

export default SimplifiedCustomEdge;