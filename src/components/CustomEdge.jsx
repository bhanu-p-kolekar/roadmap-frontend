import React, { useState, useEffect, useRef } from 'react';
import { getBezierPath, EdgeText } from 'reactflow';

const CustomEdge = ({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected, onClick, sourceHandle, targetHandle }) => {
  // Debug to help track edge connection issues
  useEffect(() => {
    console.log(`Edge ${id} rendered with:`, {
      source, target, sourceHandle, targetHandle
    });
  }, [id, source, target, sourceHandle, targetHandle]);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [hover, setHover] = useState(false);
  const leaveTimeoutRef = useRef(null);

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${selected ? 'selected' : ''} ${hover ? 'hover' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: hover || selected ? 'var(--accent-light)' : 'var(--accent)',
          strokeWidth: hover || selected ? 3 : 2,
          cursor: 'pointer'
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (onClick) onClick(event, id);
        }}
        onMouseEnter={() => {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          setHover(true);
        }}
        onMouseLeave={() => {
          // keep the hover state for a short time so the × remains clickable
          leaveTimeoutRef.current = setTimeout(() => {
            setHover(false);
            leaveTimeoutRef.current = null;
          }, 1000);
        }}
      />
      
      {(hover || selected) && (
        <g transform={`translate(${(sourceX + targetX) / 2 - 10}, ${(sourceY + targetY) / 2 - 10})`} style={{ pointerEvents: 'auto' }}>
          <circle 
            r="12" 
            fill="white"
            stroke="var(--accent)"
            strokeWidth="1"
            onClick={(event) => {
              event.stopPropagation();
              // Prefer an onDelete callback attached to the edge data
              if (data && typeof data.onDelete === 'function') {
                data.onDelete(id);
                return;
              }
              if (onClick) onClick(event, id);
            }}
            style={{ cursor: 'pointer' }}
          />
          <text 
            x="0" 
            y="4" 
            textAnchor="middle" 
            style={{ fontSize: '16px', fontWeight: 'bold', fill: 'var(--accent)', cursor: 'pointer' }}
            onClick={(event) => {
              event.stopPropagation();
              if (data && typeof data.onDelete === 'function') {
                data.onDelete(id);
                return;
              }
              if (onClick) onClick(event, id);
            }}
          >
            ×
          </text>
        </g>
      )}
    </>
  );
};

export default CustomEdge;